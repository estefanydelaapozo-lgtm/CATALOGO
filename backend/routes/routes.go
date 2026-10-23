// Paquete routes: única responsabilidad, registrar los endpoints de la API.
package routes

import (
	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/controllers"
	"multicatalogo-backend/middleware"
)

// Controllers agrupa los controladores YA construidos (con sus dependencias inyectadas en main).
type Controllers struct {
	Auth          *controllers.AuthController
	Register      *controllers.RegisterController
	Producto      *controllers.ProductoController
	ProductoAdmin *controllers.ProductoAdminController
	Red           *controllers.RedController
	Checkout      *controllers.CheckoutController
	Pedidos       *controllers.PedidosController
	MLM           *controllers.MLMController
	Reportes      *controllers.ReportesController
	Health        *controllers.HealthController
}

// SetupRoutes registra todas las rutas sobre la aplicación Fiber.
func SetupRoutes(app *fiber.App, c Controllers) {
	app.Get("/api/health", c.Health.Health)

	// Públicos
	app.Post("/api/login", c.Auth.Login)
	app.Post("/api/register", c.Register.Register)
	app.Get("/api/productos", c.Producto.GetProductos)
	app.Get("/api/productos/:id", c.Producto.GetProductoPorID)

	// Autenticados
	auth := middleware.RequireAuth()
	admin := middleware.RequireAdmin()

	app.Get("/api/red", auth, c.Red.GetRed)
	app.Get("/api/red/mia", auth, c.MLM.RedMia)
	app.Post("/api/checkout", auth, c.Checkout.Checkout)

	app.Get("/api/pedidos/mios", auth, c.Pedidos.Mios)
	app.Get("/api/pedidos/:id", auth, c.Pedidos.Detalle)
	app.Get("/api/comisiones/mias", auth, c.MLM.ComisionesMias)
	app.Get("/api/liquidaciones/mias", auth, c.MLM.LiquidacionesMias)

	// Admin
	app.Get("/api/admin/productos", auth, admin, c.ProductoAdmin.List)
	app.Post("/api/productos", auth, admin, c.ProductoAdmin.Create)
	app.Put("/api/productos/:id", auth, admin, c.ProductoAdmin.Update)
	app.Delete("/api/productos/:id", auth, admin, c.ProductoAdmin.Delete)
	app.Patch("/api/productos/:id/activar", auth, admin, c.ProductoAdmin.Activate)

	app.Get("/api/pedidos", auth, admin, c.Pedidos.AdminList)
	app.Patch("/api/pedidos/:id/estado", auth, admin, c.Pedidos.CambiarEstado)

	app.Post("/api/liquidaciones", auth, admin, c.MLM.Liquidar)
	app.Get("/api/liquidaciones", auth, admin, c.MLM.LiquidacionesAdmin)

	app.Get("/api/reportes/resumen", auth, admin, c.Reportes.Resumen)
	app.Get("/api/reportes/top-productos", auth, admin, c.Reportes.TopProductos)
	app.Get("/api/reportes/top-referidos", auth, admin, c.Reportes.TopReferidos)
	app.Get("/api/reportes/comisiones-pendientes", auth, admin, c.MLM.Deudas)
}
