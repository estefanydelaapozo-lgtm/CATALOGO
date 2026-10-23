package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"multicatalogo-backend/models"
)

// EstadosPedido válidos y transiciones permitidas.
var transiciones = map[string][]string{
	"pendiente":  {"preparando", "cancelado"},
	"preparando": {"enviado", "cancelado"},
	"enviado":    {"entregado", "cancelado"},
	"entregado":  {},
	"cancelado":  {},
}

// ListPedidosMios pedidos del usuario autenticado.
func (r *PostgresRepo) ListPedidosMios(ctx context.Context, usuarioID, page, limit int) ([]models.PedidoLista, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM pedidos WHERE usuario_id=$1`, usuarioID).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, numero, total, estado, created_at FROM pedidos
		 WHERE usuario_id=$1 ORDER BY id DESC LIMIT $2 OFFSET $3`, usuarioID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	return scanPedidosLista(rows, total)
}

// ListPedidosAdmin todos los pedidos con filtro opcional de estado.
func (r *PostgresRepo) ListPedidosAdmin(ctx context.Context, estado string, page, limit int) ([]models.PedidoLista, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	where := "WHERE 1=1"
	args := []any{}
	if estado != "" {
		args = append(args, estado)
		where += fmt.Sprintf(" AND estado=$%d", len(args))
	}
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM pedidos `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, offset)
	q := fmt.Sprintf(
		`SELECT id, numero, total, estado, created_at, cliente_nombre, cliente_email FROM pedidos %s
		 ORDER BY id DESC LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []models.PedidoLista
	for rows.Next() {
		var p models.PedidoLista
		if err := rows.Scan(&p.ID, &p.Numero, &p.Total, &p.Estado, &p.Fecha, &p.Cliente, &p.Email); err != nil {
			return nil, 0, err
		}
		out = append(out, p)
	}
	if out == nil {
		out = []models.PedidoLista{}
	}
	return out, total, rows.Err()
}

func scanPedidosLista(rows *sql.Rows, total int) ([]models.PedidoLista, int, error) {
	var out []models.PedidoLista
	for rows.Next() {
		var p models.PedidoLista
		if err := rows.Scan(&p.ID, &p.Numero, &p.Total, &p.Estado, &p.Fecha); err != nil {
			return nil, 0, err
		}
		out = append(out, p)
	}
	if out == nil {
		out = []models.PedidoLista{}
	}
	return out, total, rows.Err()
}

// GetPedidoDetalle cabecera + ítems. Si soloDueno >= 0, exige usuario_id = soloDueno.
func (r *PostgresRepo) GetPedidoDetalle(ctx context.Context, id int, soloDueno int) (models.PedidoDetalle, error) {
	var d models.PedidoDetalle
	var usuarioID int
	err := r.db.QueryRowContext(ctx,
		`SELECT id, numero, total, estado, created_at, cliente_nombre, cliente_email,
		        direccion, ciudad, telefono, metodo_pago, usuario_id
		 FROM pedidos WHERE id=$1`, id,
	).Scan(&d.ID, &d.Numero, &d.Total, &d.Estado, &d.Fecha, &d.Cliente, &d.Email,
		&d.Direccion, &d.Ciudad, &d.Telefono, &d.MetodoPago, &usuarioID)
	if errors.Is(err, sql.ErrNoRows) {
		return models.PedidoDetalle{}, sql.ErrNoRows
	}
	if err != nil {
		return models.PedidoDetalle{}, err
	}
	if soloDueno > 0 && usuarioID != soloDueno {
		return models.PedidoDetalle{}, sql.ErrNoRows // 404: no filtrar existencia
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT pi.producto_id, COALESCE(pr.nombre, 'Producto'), pi.cantidad, pi.precio_unitario
		 FROM pedido_items pi LEFT JOIN productos pr ON pr.id = pi.producto_id
		 WHERE pi.pedido_id=$1 ORDER BY pi.id`, id)
	if err != nil {
		return models.PedidoDetalle{}, err
	}
	defer rows.Close()
	d.Items = []models.ItemPedido{}
	for rows.Next() {
		var it models.ItemPedido
		if err := rows.Scan(&it.ID, &it.Nombre, &it.Cantidad, &it.Precio); err != nil {
			return models.PedidoDetalle{}, err
		}
		d.Items = append(d.Items, it)
	}
	return d, rows.Err()
}

// CambiarEstadoPedido aplica una transición válida. Cancelación restaura stock y revierte comisiones.
func (r *PostgresRepo) CambiarEstadoPedido(ctx context.Context, id int, nuevo string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var actual string
	err = tx.QueryRowContext(ctx, `SELECT estado FROM pedidos WHERE id=$1 FOR UPDATE`, id).Scan(&actual)
	if errors.Is(err, sql.ErrNoRows) {
		return sql.ErrNoRows
	}
	if err != nil {
		return err
	}
	permitidos := transiciones[actual]
	ok := false
	for _, p := range permitidos {
		if p == nuevo {
			ok = true
			break
		}
	}
	if !ok {
		return fmt.Errorf("transición inválida: %s → %s", actual, nuevo)
	}

	if _, err := tx.ExecContext(ctx, `UPDATE pedidos SET estado=$1 WHERE id=$2`, nuevo, id); err != nil {
		return err
	}

	if nuevo == "cancelado" {
		// Restaurar stock
		rows, err := tx.QueryContext(ctx,
			`SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id=$1`, id)
		if err != nil {
			return err
		}
		type line struct{ pid, cant int }
		var lines []line
		for rows.Next() {
			var l line
			if err := rows.Scan(&l.pid, &l.cant); err != nil {
				rows.Close()
				return err
			}
			lines = append(lines, l)
		}
		rows.Close()
		for _, l := range lines {
			if _, err := tx.ExecContext(ctx,
				`UPDATE productos SET stock = stock + $1 WHERE id=$2`, l.cant, l.pid); err != nil {
				return err
			}
		}
		// Revertir comisiones pendientes
		if _, err := tx.ExecContext(ctx,
			`UPDATE comisiones SET estado='revertida' WHERE pedido_id=$1 AND estado='pendiente'`, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}
