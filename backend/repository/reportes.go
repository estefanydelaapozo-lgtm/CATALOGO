package repository

import (
	"context"
	"time"

	"multicatalogo-backend/models"
)

// ResumenVentas KPIs del periodo (pedidos no cancelados).
func (r *PostgresRepo) ResumenVentas(ctx context.Context, desde, hasta time.Time) (models.ResumenReportes, error) {
	var res models.ResumenReportes
	err := r.db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(total),0), COUNT(*),
		        CASE WHEN COUNT(*)>0 THEN COALESCE(SUM(total),0)/COUNT(*) ELSE 0 END
		 FROM pedidos
		 WHERE estado <> 'cancelado'
		   AND created_at >= $1 AND created_at < $2`, desde, hasta,
	).Scan(&res.TotalVendido, &res.NumPedidos, &res.TicketPromedio)
	if err != nil {
		return res, err
	}
	_ = r.db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(monto),0) FROM comisiones
		 WHERE estado IN ('pendiente','pagada')
		   AND created_at >= $1 AND created_at < $2`, desde, hasta,
	).Scan(&res.ComisionesDevengadas)
	return res, nil
}

// TopProductos ranking por importe.
func (r *PostgresRepo) TopProductos(ctx context.Context, limit int) ([]models.TopProducto, error) {
	if limit < 1 {
		limit = 10
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT pi.producto_id, COALESCE(pr.nombre,'Producto'), SUM(pi.cantidad), SUM(pi.cantidad*pi.precio_unitario)
		 FROM pedido_items pi
		 JOIN pedidos p ON p.id = pi.pedido_id AND p.estado <> 'cancelado'
		 LEFT JOIN productos pr ON pr.id = pi.producto_id
		 GROUP BY pi.producto_id, pr.nombre
		 ORDER BY SUM(pi.cantidad*pi.precio_unitario) DESC
		 LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.TopProducto
	for rows.Next() {
		var t models.TopProducto
		if err := rows.Scan(&t.ProductoID, &t.Nombre, &t.Cantidad, &t.Total); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	if out == nil {
		out = []models.TopProducto{}
	}
	return out, rows.Err()
}

// TopReferidos ranking por ventas.
func (r *PostgresRepo) TopReferidos(ctx context.Context, limit int) ([]models.TopReferido, error) {
	if limit < 1 {
		limit = 10
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, nombre, ventas, saldo FROM referidos
		 WHERE id > 0 ORDER BY ventas DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.TopReferido
	for rows.Next() {
		var t models.TopReferido
		if err := rows.Scan(&t.ReferidoID, &t.Nombre, &t.Ventas, &t.Saldo); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	if out == nil {
		out = []models.TopReferido{}
	}
	return out, rows.Err()
}
