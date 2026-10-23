package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"multicatalogo-backend/models"
)

// GetRedDesde reconstruye el subárbol a partir de un nodo raíz (id del referido).
func (r *PostgresRepo) GetRedDesde(ctx context.Context, raizID int) (models.Referido, error) {
	rows, err := r.db.QueryContext(ctx,
		`WITH RECURSIVE sub AS (
		   SELECT id, nombre, nivel, ventas, saldo, parent_id, codigo FROM referidos WHERE id=$1
		   UNION ALL
		   SELECT r.id, r.nombre, r.nivel, r.ventas, r.saldo, r.parent_id, r.codigo
		   FROM referidos r JOIN sub s ON r.parent_id = s.id
		 )
		 SELECT id, nombre, nivel, ventas, saldo, parent_id, COALESCE(codigo,'') FROM sub ORDER BY nivel, id`, raizID)
	if err != nil {
		return models.Referido{}, err
	}
	defer rows.Close()

	type nodo struct {
		id, nivel    int
		nombre       string
		ventas, saldo float64
		parent       sql.NullInt64
		codigo       string
	}
	var nodos []nodo
	byID := map[int]*models.Referido{}
	for rows.Next() {
		var n nodo
		if err := rows.Scan(&n.id, &n.nombre, &n.nivel, &n.ventas, &n.saldo, &n.parent, &n.codigo); err != nil {
			return models.Referido{}, err
		}
		nodos = append(nodos, n)
		byID[n.id] = &models.Referido{ID: n.id, Nombre: n.nombre, Nivel: n.nivel, Ventas: n.ventas, Saldo: n.saldo, Hijos: []models.Referido{}}
	}
	if err := rows.Err(); err != nil {
		return models.Referido{}, err
	}
	if len(nodos) == 0 {
		return models.Referido{}, sql.ErrNoRows
	}
	var root *models.Referido
	for _, n := range nodos {
		node := byID[n.id]
		if n.id == raizID {
			root = node
			continue
		}
		if n.parent.Valid {
			if p := byID[int(n.parent.Int64)]; p != nil {
				p.Hijos = append(p.Hijos, *node)
			}
		}
	}
	if root == nil {
		return models.Referido{}, sql.ErrNoRows
	}
	return *root, nil
}

// GetCodigoReferido devuelve el código de invitación de un nodo.
func (r *PostgresRepo) GetCodigoReferido(ctx context.Context, referidoID int) (string, error) {
	var codigo string
	err := r.db.QueryRowContext(ctx, `SELECT COALESCE(codigo,'') FROM referidos WHERE id=$1`, referidoID).Scan(&codigo)
	return codigo, err
}

// ListComisionesMias ledger del referido del usuario.
func (r *PostgresRepo) ListComisionesMias(ctx context.Context, referidoID int) (models.ComisionesResumen, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT c.id, c.pedido_id, COALESCE(p.numero,''), c.nivel, c.porcentaje, c.monto, c.estado, c.created_at
		 FROM comisiones c LEFT JOIN pedidos p ON p.id = c.pedido_id
		 WHERE c.referido_id=$1 ORDER BY c.id DESC`, referidoID)
	if err != nil {
		return models.ComisionesResumen{}, err
	}
	defer rows.Close()
	res := models.ComisionesResumen{Items: []models.ComisionFila{}}
	for rows.Next() {
		var f models.ComisionFila
		if err := rows.Scan(&f.ID, &f.PedidoID, &f.PedidoNum, &f.Nivel, &f.Porcentaje, &f.Monto, &f.Estado, &f.CreadoEn); err != nil {
			return models.ComisionesResumen{}, err
		}
		res.Items = append(res.Items, f)
		res.Total += f.Monto
		switch f.Estado {
		case "pendiente":
			res.Pendiente += f.Monto
		case "pagada":
			res.Pagado += f.Monto
		}
	}
	return res, rows.Err()
}

// CrearLiquidacion suma comisiones pendientes de un referido, crea liquidación y las marca pagadas.
func (r *PostgresRepo) CrearLiquidacion(ctx context.Context, referidoID int) (models.Liquidacion, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return models.Liquidacion{}, err
	}
	defer tx.Rollback()

	// Bloqueo de filas pendientes
	rows, err := tx.QueryContext(ctx,
		`SELECT id, monto FROM comisiones WHERE referido_id=$1 AND estado='pendiente' FOR UPDATE`, referidoID)
	if err != nil {
		return models.Liquidacion{}, err
	}
	var ids []int
	var total float64
	for rows.Next() {
		var id int
		var monto float64
		if err := rows.Scan(&id, &monto); err != nil {
			rows.Close()
			return models.Liquidacion{}, err
		}
		ids = append(ids, id)
		total += monto
	}
	rows.Close()
	if len(ids) == 0 {
		return models.Liquidacion{}, errors.New("no hay comisiones pendientes")
	}

	now := time.Now()
	var liq models.Liquidacion
	err = tx.QueryRowContext(ctx,
		`INSERT INTO liquidaciones (referido_id, total, estado, pagada_en) VALUES ($1,$2,'pagada',$3)
		 RETURNING id, referido_id, total, estado, creado_en, pagada_en`,
		referidoID, total, now,
	).Scan(&liq.ID, &liq.ReferidoID, &liq.Total, &liq.Estado, &liq.CreadoEn, &liq.PagadaEn)
	if err != nil {
		return models.Liquidacion{}, err
	}

	for _, id := range ids {
		if _, err := tx.ExecContext(ctx,
			`UPDATE comisiones SET estado='pagada', liquidacion_id=$1 WHERE id=$2`, liq.ID, id); err != nil {
			return models.Liquidacion{}, err
		}
	}
	// Ajustar saldo del referido (opcional: restar lo liquidado)
	if _, err := tx.ExecContext(ctx, `UPDATE referidos SET saldo = GREATEST(saldo - $1, 0) WHERE id=$2`, total, referidoID); err != nil {
		return models.Liquidacion{}, err
	}

	var nombre string
	_ = tx.QueryRowContext(ctx, `SELECT nombre FROM referidos WHERE id=$1`, referidoID).Scan(&nombre)
	liq.Nombre = nombre

	if err := tx.Commit(); err != nil {
		return models.Liquidacion{}, err
	}
	return liq, nil
}

// ListLiquidacionesAdmin historial de pagos.
func (r *PostgresRepo) ListLiquidacionesAdmin(ctx context.Context) ([]models.Liquidacion, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT l.id, l.referido_id, COALESCE(r.nombre,''), l.total, l.estado, l.creado_en, l.pagada_en
		 FROM liquidaciones l LEFT JOIN referidos r ON r.id = l.referido_id
		 ORDER BY l.id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.Liquidacion
	for rows.Next() {
		var l models.Liquidacion
		if err := rows.Scan(&l.ID, &l.ReferidoID, &l.Nombre, &l.Total, &l.Estado, &l.CreadoEn, &l.PagadaEn); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	if out == nil {
		out = []models.Liquidacion{}
	}
	return out, rows.Err()
}

// ListLiquidacionesMias del referido del token.
func (r *PostgresRepo) ListLiquidacionesMias(ctx context.Context, referidoID int) ([]models.Liquidacion, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, referido_id, total, estado, creado_en, pagada_en FROM liquidaciones
		 WHERE referido_id=$1 ORDER BY id DESC`, referidoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.Liquidacion
	for rows.Next() {
		var l models.Liquidacion
		if err := rows.Scan(&l.ID, &l.ReferidoID, &l.Total, &l.Estado, &l.CreadoEn, &l.PagadaEn); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	if out == nil {
		out = []models.Liquidacion{}
	}
	return out, rows.Err()
}

// ListDeudasPendientes suma comisiones pendiente por referido.
func (r *PostgresRepo) ListDeudasPendientes(ctx context.Context) ([]models.DeudaReferido, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT r.id, r.nombre, COALESCE(r.codigo,''), COALESCE(SUM(c.monto),0)
		 FROM referidos r
		 JOIN comisiones c ON c.referido_id = r.id AND c.estado='pendiente'
		 GROUP BY r.id, r.nombre, r.codigo
		 HAVING SUM(c.monto) > 0
		 ORDER BY SUM(c.monto) DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []models.DeudaReferido
	for rows.Next() {
		var d models.DeudaReferido
		if err := rows.Scan(&d.ReferidoID, &d.Nombre, &d.Codigo, &d.Pendiente); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	if out == nil {
		out = []models.DeudaReferido{}
	}
	return out, rows.Err()
}
