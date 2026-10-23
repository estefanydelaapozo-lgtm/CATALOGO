package controllers

import (
	"context"
	"errors"
	"log"
	"net/mail"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// Métodos de pago aceptados (los mismos que ofrece Checkout.tsx).
var metodosPago = map[string]bool{
	"Tarjeta de crédito":      true,
	"Transferencia bancaria":  true,
	"Efectivo contra entrega": true,
}

const (
	maxItemsCarrito  = 50
	maxCantidadLinea = 100
)

// CheckoutController procesa la compra. Sus dependencias llegan por constructor como INTERFACES
// (DBRepository y CacheRepository), no como variables globales ni funciones sueltas.
type CheckoutController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
	wg    sync.WaitGroup // goroutines de comisiones en vuelo (para el apagado ordenado)
}

func NewCheckoutController(repo repository.DBRepository, cache repository.CacheRepository) *CheckoutController {
	return &CheckoutController{repo: repo, cache: cache}
}

// Checkout procesa POST /api/checkout.
//
//	401 -> falta o es inválido el token (Authorization: Bearer <token>)
//	400 -> JSON inválido, datos incorrectos o producto inexistente (ROLLBACK)
//	409 -> stock insuficiente (ROLLBACK)
//	500 -> falla de la base de datos (ROLLBACK)
//	201 -> pedido confirmado (las comisiones se calculan en segundo plano)
func (cc *CheckoutController) Checkout(c *fiber.Ctx) error {
	ctx := c.UserContext()

	// 1) Identidad desde el JWT (middleware RequireAuth ya validó y guardó en Locals).
	//    El email del body NUNCA se usa para atribuir el pedido ni las comisiones.
	userID, _ := c.Locals("userID").(int)
	emailToken, _ := c.Locals("email").(string)
	if userID == 0 || emailToken == "" {
		return SendError(c, fiber.StatusUnauthorized, "Debes iniciar sesión para comprar", nil)
	}

	// 2) Validación de la entrada.
	var req models.CheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo de petición inválido",
			"Se esperaba un JSON con cliente, metodoPago e items")
	}
	if problemas := validarCheckout(&req); len(problemas) > 0 {
		return SendError(c, fiber.StatusBadRequest, "Datos del pedido inválidos", problemas)
	}

	// Forzar email de identidad del token en el cliente del pedido (anti-spoofing).
	req.Cliente.Email = emailToken

	// 3) Transacción ACID (BEGIN ... COMMIT / ROLLBACK) dentro del repositorio.
	pedido, err := cc.repo.CrearPedido(ctx, models.NuevoPedido{
		UsuarioID:  userID,
		Cliente:    req.Cliente,
		MetodoPago: req.MetodoPago,
		Items:      req.Items,
	})
	if err != nil {
		var noExiste *repository.ProductoNoExisteError
		var sinStock *repository.StockInsuficienteError
		switch {
		case errors.As(err, &noExiste):
			return SendError(c, fiber.StatusBadRequest, noExiste.Error(), map[string]int{"productoId": noExiste.ID})
		case errors.As(err, &sinStock):
			return SendError(c, fiber.StatusConflict, sinStock.Error(), map[string]int{
				"productoId": sinStock.ID, "disponible": sinStock.Disponible, "solicitado": sinStock.Solicitado})
		default:
			log.Printf("error en checkout [usuario %s]: %v", emailToken, err)
			return SendError(c, fiber.StatusInternalServerError,
				"No se pudo procesar el pedido. No se realizó ningún cargo; inténtalo nuevamente", nil)
		}
	}

	// 4) El stock cambió: el catálogo cacheado ya no es válido.
	invalidar(ctx, "catálogo", func(ctx context.Context) error {
		return cc.cache.Delete(ctx, repository.KeyProductos)
	})

	// 5) Comisiones en segundo plano: el cliente NO espera por ellas.
	//    Se acreditan al upline del email del TOKEN, no del body.
	cc.wg.Add(1)
	go cc.calcularComisiones(pedido.ID, emailToken)

	return c.Status(fiber.StatusCreated).JSON(pedido)
}

// calcularComisiones se ejecuta en una goroutine DESPUÉS del COMMIT del pedido.
// Usa su propio contexto (el de la petición se cancela al responder) y reintenta si falla.
func (cc *CheckoutController) calcularComisiones(pedidoID int, emailComprador string) {
	defer cc.wg.Done()
	// Un panic dentro de una goroutine NO lo atrapa el middleware recover: tumbaría todo el servidor.
	defer func() {
		if r := recover(); r != nil {
			log.Printf("CRÍTICO: panic calculando comisiones del pedido %d: %v", pedidoID, r)
		}
	}()

	const intentos = 3
	for i := 1; i <= intentos; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		err := cc.repo.AcreditarComisiones(ctx, pedidoID)
		cancel()
		if err == nil {
			// Red actualizada: se invalida el caché para que el Dashboard lea los KPIs nuevos.
			// Se borra la clave del comprador (red:tree:{email}) y, como /api/red devuelve el MISMO
			// árbol para cualquier usuario, también las de los demás (admin, global...).
			invalidar(context.Background(), "red", func(ctx context.Context) error {
				if err := cc.cache.Delete(ctx, repository.KeyRed(emailComprador)); err != nil {
					return err
				}
				return cc.cache.DeleteByPrefix(ctx, repository.PrefixRed)
			})
			log.Printf("comisiones del pedido %d acreditadas", pedidoID)
			return
		}
		log.Printf("comisiones del pedido %d: intento %d/%d falló: %v", pedidoID, i, intentos, err)
		time.Sleep(time.Duration(i) * time.Second)
	}
	log.Printf("CRÍTICO: el pedido %d quedó con comisiones PENDIENTES (comisiones_calculadas = false)", pedidoID)
}

// Esperar bloquea hasta que terminen las goroutines de comisiones en curso o venza el plazo.
// main lo llama al apagar el servidor para no perder comisiones a medio calcular.
func (cc *CheckoutController) Esperar(plazo time.Duration) bool {
	hecho := make(chan struct{})
	go func() { cc.wg.Wait(); close(hecho) }()
	select {
	case <-hecho:
		return true
	case <-time.After(plazo):
		return false
	}
}

// invalidar ejecuta una invalidación de caché con timeout propio. Un fallo se registra pero no
// rompe la compra (el caché es una optimización; el dato correcto ya está en PostgreSQL).
func invalidar(ctx context.Context, que string, fn func(context.Context) error) {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if err := fn(ctx); err != nil {
		log.Printf("cache: no se pudo invalidar %s (expirará por TTL): %v", que, err)
	}
}

// validarCheckout normaliza y valida la petición; devuelve campo -> problema.
func validarCheckout(req *models.CheckoutRequest) map[string]string {
	problemas := map[string]string{}

	cl := &req.Cliente
	cl.Nombre = strings.TrimSpace(cl.Nombre)
	cl.Email = strings.TrimSpace(cl.Email)
	cl.Direccion = strings.TrimSpace(cl.Direccion)
	cl.Ciudad = strings.TrimSpace(cl.Ciudad)
	cl.Telefono = strings.TrimSpace(cl.Telefono)
	req.MetodoPago = strings.TrimSpace(req.MetodoPago)

	if cl.Nombre == "" {
		problemas["cliente.nombre"] = "El nombre es obligatorio"
	}
	if cl.Email == "" {
		problemas["cliente.email"] = "El email es obligatorio"
	} else if _, err := mail.ParseAddress(cl.Email); err != nil {
		problemas["cliente.email"] = "El formato del email no es válido"
	}
	if cl.Direccion == "" {
		problemas["cliente.direccion"] = "La dirección es obligatoria"
	}
	if cl.Ciudad == "" {
		problemas["cliente.ciudad"] = "La ciudad es obligatoria"
	}
	if cl.Telefono == "" {
		problemas["cliente.telefono"] = "El teléfono es obligatorio"
	}
	if !metodosPago[req.MetodoPago] {
		problemas["metodoPago"] = "Método de pago no soportado"
	}

	switch {
	case len(req.Items) == 0:
		problemas["items"] = "El carrito está vacío"
	case len(req.Items) > maxItemsCarrito:
		problemas["items"] = "El carrito tiene demasiados productos"
	default:
		for _, it := range req.Items {
			if it.ID <= 0 {
				problemas["items"] = "Cada item necesita un id de producto válido"
				break
			}
			if it.Cantidad < 1 || it.Cantidad > maxCantidadLinea {
				problemas["items"] = "La cantidad de cada item debe estar entre 1 y 100"
				break
			}
		}
	}
	return problemas
}
