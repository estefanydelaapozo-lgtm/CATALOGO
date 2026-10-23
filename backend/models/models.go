// Paquete models: estructuras de datos y contratos JSON de la API.
package models

import "time"

// ---------- Peticiones ----------

// LoginRequest es el cuerpo esperado en POST /api/login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// ---------- Respuestas ----------

// LoginResponse es la respuesta exitosa de POST /api/login (misma forma que ya consume el frontend).
type LoginResponse struct {
	Token string `json:"token"`
	Email string `json:"email"`
	Rol   string `json:"rol"`
}

// Producto es un artículo del catálogo. Los campos originales (id, nombre, precio, img) se
// mantienen; descripcion, categoria y galeria se agregan para que React pueda dejar sus datos mock.
type Producto struct {
	ID          int      `json:"id"`
	Nombre      string   `json:"nombre"`
	Descripcion string   `json:"descripcion"`
	Precio      float64  `json:"precio"`
	Categoria   string   `json:"categoria"`
	Img         string   `json:"img"`
	Galeria     []string `json:"galeria"`
	Stock       int      `json:"stock"` // Fase 4: stock simulado (campo adicional)
}

// Referido es un nodo del árbol de la red multinivel (/api/red).
type Referido struct {
	ID     int        `json:"id"`
	Nombre string     `json:"nombre"`
	Nivel  int        `json:"nivel"`
	Ventas float64    `json:"ventas"`
	Saldo  float64    `json:"saldo"` // Fase 4: comisiones acumuladas (campo adicional)
	Hijos  []Referido `json:"hijos,omitempty"`
}

// Usuario representa un usuario almacenado en el repositorio (uso interno, no se serializa).
type Usuario struct {
	ID         int
	Email      string
	Password   string
	Rol        string
	Token      string
	Nombre     string
	Activo     bool
	ReferidoID *int
	CreadoEn   time.Time
}

// RegisterRequest es el cuerpo de POST /api/register.
type RegisterRequest struct {
	Nombre   string `json:"nombre"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Ref      string `json:"ref"` // código de referido opcional
}

// ProductoAdmin incluye el flag activo (listados admin).
type ProductoAdmin struct {
	Producto
	Activo bool `json:"activo"`
}

// ProductoInput para crear/editar productos.
type ProductoInput struct {
	Nombre      string   `json:"nombre"`
	Descripcion string   `json:"descripcion"`
	Precio      float64  `json:"precio"`
	Categoria   string   `json:"categoria"`
	Img         string   `json:"img"`
	Galeria     []string `json:"galeria"`
	Stock       int      `json:"stock"`
}

// PedidoLista es un resumen de pedido para listados.
type PedidoLista struct {
	ID      int       `json:"id"`
	Numero  string    `json:"numero"`
	Total   float64   `json:"total"`
	Estado  string    `json:"estado"`
	Fecha   time.Time `json:"fecha"`
	Cliente string    `json:"cliente,omitempty"`
	Email   string    `json:"email,omitempty"`
}

// PedidoDetalle incluye ítems.
type PedidoDetalle struct {
	PedidoLista
	Direccion  string       `json:"direccion"`
	Ciudad     string       `json:"ciudad"`
	Telefono   string       `json:"telefono"`
	MetodoPago string       `json:"metodoPago"`
	Items      []ItemPedido `json:"items"`
}

// ComisionFila es una fila del ledger.
type ComisionFila struct {
	ID         int       `json:"id"`
	PedidoID   int       `json:"pedidoId"`
	PedidoNum  string    `json:"pedidoNumero,omitempty"`
	Nivel      int       `json:"nivel"`
	Porcentaje float64   `json:"porcentaje"`
	Monto      float64   `json:"monto"`
	Estado     string    `json:"estado"`
	CreadoEn   time.Time `json:"creadoEn"`
}

// ComisionesResumen agrupa el ledger del usuario.
type ComisionesResumen struct {
	Items     []ComisionFila `json:"items"`
	Pendiente float64        `json:"pendiente"`
	Pagado    float64        `json:"pagado"`
	Total     float64        `json:"total"`
}

// Liquidacion es un pago a un distribuidor.
type Liquidacion struct {
	ID         int        `json:"id"`
	ReferidoID int        `json:"referidoId"`
	Nombre     string     `json:"nombre,omitempty"`
	Total      float64    `json:"total"`
	Estado     string     `json:"estado"`
	CreadoEn   time.Time  `json:"creadoEn"`
	PagadaEn   *time.Time `json:"pagadaEn,omitempty"`
}

// DeudaReferido es la deuda pendiente de un distribuidor.
type DeudaReferido struct {
	ReferidoID int     `json:"referidoId"`
	Nombre     string  `json:"nombre"`
	Codigo     string  `json:"codigo"`
	Pendiente  float64 `json:"pendiente"`
}

// Pagina es el sobre estándar de listados paginados.
type Pagina[T any] struct {
	Data  []T `json:"data"`
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

// ResumenReportes KPIs del periodo.
type ResumenReportes struct {
	TotalVendido        float64 `json:"totalVendido"`
	NumPedidos          int     `json:"numPedidos"`
	TicketPromedio      float64 `json:"ticketPromedio"`
	ComisionesDevengadas float64 `json:"comisionesDevengadas"`
}

// TopProducto ranking de productos.
type TopProducto struct {
	ProductoID int     `json:"productoId"`
	Nombre     string  `json:"nombre"`
	Cantidad   int     `json:"cantidad"`
	Total      float64 `json:"total"`
}

// TopReferido ranking de la red.
type TopReferido struct {
	ReferidoID int     `json:"referidoId"`
	Nombre     string  `json:"nombre"`
	Ventas     float64 `json:"ventas"`
	Saldo      float64 `json:"saldo"`
}

// ---------- Errores estandarizados ----------

// APIError es el formato ÚNICO de error de toda la API.
//
//	{"status": 400, "message": "...", "details": {...}}
type APIError struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// Error implementa la interfaz error, de modo que un *APIError también puede
// devolverse desde un handler y ser procesado por el ErrorHandler global.
func (e *APIError) Error() string { return e.Message }

// ---------- Checkout (Fase 4) ----------

// ClienteCheckout son los datos de envío que captura Checkout.tsx.
type ClienteCheckout struct {
	Nombre    string `json:"nombre"`
	Email     string `json:"email"`
	Direccion string `json:"direccion"`
	Ciudad    string `json:"ciudad"`
	Telefono  string `json:"telefono"`
}

// ItemCheckout es una línea del carrito. El precio NO viaja en la petición:
// el servidor lo lee de la base de datos (el cliente nunca decide cuánto paga).
type ItemCheckout struct {
	ID       int `json:"id"`
	Cantidad int `json:"cantidad"`
}

// CheckoutRequest es el cuerpo esperado en POST /api/checkout.
type CheckoutRequest struct {
	Cliente    ClienteCheckout `json:"cliente"`
	MetodoPago string          `json:"metodoPago"`
	Items      []ItemCheckout  `json:"items"`
}

// NuevoPedido es la petición ya validada y asociada al usuario autenticado (capa repository).
type NuevoPedido struct {
	UsuarioID  int
	Cliente    ClienteCheckout
	MetodoPago string
	Items      []ItemCheckout
}

// ItemPedido es una línea ya confirmada, con el precio real cobrado.
type ItemPedido struct {
	ID       int     `json:"id"`
	Nombre   string  `json:"nombre"`
	Cantidad int     `json:"cantidad"`
	Precio   float64 `json:"precio"`
}

// ClientePedido es el resumen del cliente en la respuesta (misma forma que usa Confirmacion.tsx).
type ClientePedido struct {
	Nombre string `json:"nombre"`
	Email  string `json:"email"`
	Ciudad string `json:"ciudad"`
}

// Pedido es la respuesta (201) de POST /api/checkout.
type Pedido struct {
	ID         int           `json:"id"`
	Numero     string        `json:"numero"`
	Items      []ItemPedido  `json:"items"`
	Total      float64       `json:"total"`
	Cliente    ClientePedido `json:"cliente"`
	MetodoPago string        `json:"metodoPago"`
	Estado     string        `json:"estado"`
	Fecha      time.Time     `json:"fecha"`
}
