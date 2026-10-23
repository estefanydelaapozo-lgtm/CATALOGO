package repository

import (
	"context"
	"time"

	"multicatalogo-backend/models"
)

// DBRepository es el contrato de acceso a datos que necesitan los controladores.
type DBRepository interface {
	FindUsuario(ctx context.Context, email, password string) (models.Usuario, bool, error)
	FindUsuarioByToken(ctx context.Context, token string) (models.Usuario, bool, error)
	GetUsuarioByID(ctx context.Context, id int) (models.Usuario, bool, error)
	RegistrarUsuario(ctx context.Context, nombre, email, password, ref string) (models.Usuario, error)

	GetProductos(ctx context.Context) ([]models.Producto, error)
	GetProductoByID(ctx context.Context, id int) (models.Producto, bool, error)
	ListProductosAdmin(ctx context.Context, q string, page, limit int) ([]models.ProductoAdmin, int, error)
	CrearProducto(ctx context.Context, in models.ProductoInput) (models.ProductoAdmin, error)
	ActualizarProducto(ctx context.Context, id int, in models.ProductoInput) (models.ProductoAdmin, error)
	DesactivarProducto(ctx context.Context, id int) error
	ActivarProducto(ctx context.Context, id int) error

	GetRed(ctx context.Context) (models.Referido, error)
	GetRedDesde(ctx context.Context, raizID int) (models.Referido, error)
	GetCodigoReferido(ctx context.Context, referidoID int) (string, error)

	CrearPedido(ctx context.Context, nuevo models.NuevoPedido) (models.Pedido, error)
	AcreditarComisiones(ctx context.Context, pedidoID int) error
	ListPedidosMios(ctx context.Context, usuarioID, page, limit int) ([]models.PedidoLista, int, error)
	ListPedidosAdmin(ctx context.Context, estado string, page, limit int) ([]models.PedidoLista, int, error)
	GetPedidoDetalle(ctx context.Context, id int, soloDueno int) (models.PedidoDetalle, error)
	CambiarEstadoPedido(ctx context.Context, id int, nuevo string) error

	ListComisionesMias(ctx context.Context, referidoID int) (models.ComisionesResumen, error)
	CrearLiquidacion(ctx context.Context, referidoID int) (models.Liquidacion, error)
	ListLiquidacionesAdmin(ctx context.Context) ([]models.Liquidacion, error)
	ListLiquidacionesMias(ctx context.Context, referidoID int) ([]models.Liquidacion, error)
	ListDeudasPendientes(ctx context.Context) ([]models.DeudaReferido, error)

	ResumenVentas(ctx context.Context, desde, hasta time.Time) (models.ResumenReportes, error)
	TopProductos(ctx context.Context, limit int) ([]models.TopProducto, error)
	TopReferidos(ctx context.Context, limit int) ([]models.TopReferido, error)
}

// CacheRepository es el contrato del caché (Redis en producción).
type CacheRepository interface {
	Get(ctx context.Context, key string, dest any) (bool, error)
	Set(ctx context.Context, key string, value any, ttl time.Duration) error
	Delete(ctx context.Context, keys ...string) error
	DeleteByPrefix(ctx context.Context, prefix string) error
}
