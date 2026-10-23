package controllers

// Pruebas unitarias del checkout SIN base de datos ni Redis: gracias a la inyección de
// dependencias se reemplazan DBRepository y CacheRepository por versiones falsas en memoria.
//
//	go test ./controllers/ -v

import (
	"context"
	"errors"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// ---------- Dobles de prueba ----------

type repoFalso struct {
	mu            sync.Mutex
	errCrear      error // error que devolverá CrearPedido
	crearLlamadas int
	comisionesDe  []int // ids de pedido acreditados
}

func (r *repoFalso) FindUsuario(context.Context, string, string) (models.Usuario, bool, error) {
	return models.Usuario{}, false, nil
}
func (r *repoFalso) FindUsuarioByToken(_ context.Context, t string) (models.Usuario, bool, error) {
	if t == "token-ok" {
		return models.Usuario{ID: 2, Email: "cliente@upse.edu.ec", Rol: "cliente"}, true, nil
	}
	return models.Usuario{}, false, nil
}
func (r *repoFalso) GetProductos(context.Context) ([]models.Producto, error) { return nil, nil }
func (r *repoFalso) GetProductoByID(context.Context, int) (models.Producto, bool, error) {
	return models.Producto{}, false, nil
}
func (r *repoFalso) GetRed(context.Context) (models.Referido, error) { return models.Referido{}, nil }
func (r *repoFalso) CrearPedido(_ context.Context, n models.NuevoPedido) (models.Pedido, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.crearLlamadas++
	if r.errCrear != nil {
		return models.Pedido{}, r.errCrear
	}
	return models.Pedido{ID: 7, Numero: "MC-000007", Total: 90, Estado: "pagado", Items: []models.ItemPedido{}}, nil
}
func (r *repoFalso) AcreditarComisiones(_ context.Context, id int) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.comisionesDe = append(r.comisionesDe, id)
	return nil
}

// Stubs del back-office (la interfaz creció; el checkout no los usa).
func (r *repoFalso) GetUsuarioByID(context.Context, int) (models.Usuario, bool, error) {
	return models.Usuario{}, false, nil
}
func (r *repoFalso) RegistrarUsuario(context.Context, string, string, string, string) (models.Usuario, error) {
	return models.Usuario{}, nil
}
func (r *repoFalso) ListProductosAdmin(context.Context, string, int, int) ([]models.ProductoAdmin, int, error) {
	return nil, 0, nil
}
func (r *repoFalso) CrearProducto(context.Context, models.ProductoInput) (models.ProductoAdmin, error) {
	return models.ProductoAdmin{}, nil
}
func (r *repoFalso) ActualizarProducto(context.Context, int, models.ProductoInput) (models.ProductoAdmin, error) {
	return models.ProductoAdmin{}, nil
}
func (r *repoFalso) DesactivarProducto(context.Context, int) error { return nil }
func (r *repoFalso) ActivarProducto(context.Context, int) error    { return nil }
func (r *repoFalso) GetRedDesde(context.Context, int) (models.Referido, error) {
	return models.Referido{}, nil
}
func (r *repoFalso) GetCodigoReferido(context.Context, int) (string, error) { return "", nil }
func (r *repoFalso) ListPedidosMios(context.Context, int, int, int) ([]models.PedidoLista, int, error) {
	return nil, 0, nil
}
func (r *repoFalso) ListPedidosAdmin(context.Context, string, int, int) ([]models.PedidoLista, int, error) {
	return nil, 0, nil
}
func (r *repoFalso) GetPedidoDetalle(context.Context, int, int) (models.PedidoDetalle, error) {
	return models.PedidoDetalle{}, nil
}
func (r *repoFalso) CambiarEstadoPedido(context.Context, int, string) error { return nil }
func (r *repoFalso) ListComisionesMias(context.Context, int) (models.ComisionesResumen, error) {
	return models.ComisionesResumen{}, nil
}
func (r *repoFalso) CrearLiquidacion(context.Context, int) (models.Liquidacion, error) {
	return models.Liquidacion{}, nil
}
func (r *repoFalso) ListLiquidacionesAdmin(context.Context) ([]models.Liquidacion, error) {
	return nil, nil
}
func (r *repoFalso) ListLiquidacionesMias(context.Context, int) ([]models.Liquidacion, error) {
	return nil, nil
}
func (r *repoFalso) ListDeudasPendientes(context.Context) ([]models.DeudaReferido, error) {
	return nil, nil
}
func (r *repoFalso) ResumenVentas(context.Context, time.Time, time.Time) (models.ResumenReportes, error) {
	return models.ResumenReportes{}, nil
}
func (r *repoFalso) TopProductos(context.Context, int) ([]models.TopProducto, error) { return nil, nil }
func (r *repoFalso) TopReferidos(context.Context, int) ([]models.TopReferido, error) { return nil, nil }

type cacheFalso struct {
	mu       sync.Mutex
	borradas []string
	prefijos []string
}

func (c *cacheFalso) Get(context.Context, string, any) (bool, error)        { return false, nil }
func (c *cacheFalso) Set(context.Context, string, any, time.Duration) error { return nil }
func (c *cacheFalso) Delete(_ context.Context, keys ...string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.borradas = append(c.borradas, keys...)
	return nil
}
func (c *cacheFalso) DeleteByPrefix(_ context.Context, p string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.prefijos = append(c.prefijos, p)
	return nil
}

// ---------- Utilidades ----------

const cuerpoValido = `{"cliente":{"nombre":"Ana","email":"ana@x.com","direccion":"Calle 1","ciudad":"Quito","telefono":"099"},
"metodoPago":"Tarjeta de crédito","items":[{"id":1,"cantidad":2}]}`

func nuevaApp(repo repository.DBRepository, cache repository.CacheRepository) (*fiber.App, *CheckoutController) {
	cc := NewCheckoutController(repo, cache)
	app := fiber.New(fiber.Config{ErrorHandler: ErrorHandler})
	// Simula RequireAuth en tests: si hay Bearer, rellena Locals (sin JWT real).
	app.Post("/api/checkout", func(c *fiber.Ctx) error {
		token := strings.TrimSpace(strings.TrimPrefix(c.Get("Authorization"), "Bearer "))
		if token == "" {
			return SendError(c, fiber.StatusUnauthorized, "Debes iniciar sesión para comprar", nil)
		}
		u, ok, err := repo.FindUsuarioByToken(c.UserContext(), token)
		if err != nil || !ok {
			return SendError(c, fiber.StatusUnauthorized, "Sesión inválida, vuelve a iniciar sesión", nil)
		}
		c.Locals("userID", u.ID)
		c.Locals("email", u.Email)
		c.Locals("rol", u.Rol)
		return c.Next()
	}, cc.Checkout)
	return app, cc
}

func post(t *testing.T, app *fiber.App, token, body string) (int, string) {
	t.Helper()
	req := httptest.NewRequest("POST", "/api/checkout", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	buf := new(strings.Builder)
	b := make([]byte, 4096)
	for {
		n, e := resp.Body.Read(b)
		buf.Write(b[:n])
		if e != nil {
			break
		}
	}
	return resp.StatusCode, buf.String()
}

// ---------- Pruebas ----------

func TestCheckout_SinToken_401(t *testing.T) {
	repo := &repoFalso{}
	app, _ := nuevaApp(repo, &cacheFalso{})
	if code, _ := post(t, app, "", cuerpoValido); code != 401 {
		t.Fatalf("esperaba 401, obtuve %d", code)
	}
	if code, _ := post(t, app, "token-falso", cuerpoValido); code != 401 {
		t.Fatalf("esperaba 401 con token falso, obtuve %d", code)
	}
	if repo.crearLlamadas != 0 {
		t.Fatal("no debe crear pedidos sin autenticación")
	}
}

func TestCheckout_DatosInvalidos_400(t *testing.T) {
	repo := &repoFalso{}
	app, _ := nuevaApp(repo, &cacheFalso{})
	code, body := post(t, app, "token-ok", `{"cliente":{"email":"mal"},"metodoPago":"Bitcoin","items":[]}`)
	if code != 400 || !strings.Contains(body, "cliente.nombre") || !strings.Contains(body, "items") {
		t.Fatalf("esperaba 400 con detalles, obtuve %d %s", code, body)
	}
	if repo.crearLlamadas != 0 {
		t.Fatal("una petición inválida no debe llegar al repositorio")
	}
}

func TestCheckout_Exito_201_ComisionesEInvalidacion(t *testing.T) {
	repo, cache := &repoFalso{}, &cacheFalso{}
	app, cc := nuevaApp(repo, cache)

	code, body := post(t, app, "token-ok", cuerpoValido)
	if code != 201 || !strings.Contains(body, "MC-000007") {
		t.Fatalf("esperaba 201, obtuve %d %s", code, body)
	}
	if !cc.Esperar(3 * time.Second) { // espera a la goroutine
		t.Fatal("la goroutine de comisiones no terminó")
	}
	if len(repo.comisionesDe) != 1 || repo.comisionesDe[0] != 7 {
		t.Fatalf("debía acreditar comisiones del pedido 7, obtuve %v", repo.comisionesDe)
	}
	// Se invalida el catálogo (stock) y la red del comprador (+ prefijo red:tree:).
	unidas := strings.Join(cache.borradas, ",")
	if !strings.Contains(unidas, "productos:all") || !strings.Contains(unidas, "red:tree:cliente@upse.edu.ec") {
		t.Fatalf("claves invalidadas inesperadas: %v", cache.borradas)
	}
	if len(cache.prefijos) != 1 || cache.prefijos[0] != "red:tree:" {
		t.Fatalf("debía barrer el prefijo red:tree:, obtuve %v", cache.prefijos)
	}
}

func TestCheckout_ErrorBD_500_SinComisiones(t *testing.T) {
	repo, cache := &repoFalso{errCrear: errors.New("connection refused")}, &cacheFalso{}
	app, cc := nuevaApp(repo, cache)

	code, body := post(t, app, "token-ok", cuerpoValido)
	if code != 500 || strings.Contains(body, "connection refused") {
		t.Fatalf("esperaba 500 sin filtrar el error interno, obtuve %d %s", code, body)
	}
	cc.Esperar(time.Second)
	if len(repo.comisionesDe) != 0 || len(cache.borradas) != 0 {
		t.Fatal("si el pedido falla NO debe haber comisiones ni invalidaciones")
	}
}

func TestCheckout_ProductoInexistente400_StockInsuficiente409(t *testing.T) {
	app, _ := nuevaApp(&repoFalso{errCrear: &repository.ProductoNoExisteError{ID: 99999}}, &cacheFalso{})
	if code, _ := post(t, app, "token-ok", cuerpoValido); code != 400 {
		t.Fatalf("producto inexistente: esperaba 400, obtuve %d", code)
	}
	app, _ = nuevaApp(&repoFalso{errCrear: &repository.StockInsuficienteError{ID: 1, Nombre: "Serum", Disponible: 1, Solicitado: 2}}, &cacheFalso{})
	if code, _ := post(t, app, "token-ok", cuerpoValido); code != 409 {
		t.Fatalf("stock insuficiente: esperaba 409, obtuve %d", code)
	}
}
