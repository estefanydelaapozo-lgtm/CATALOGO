package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/lib/pq"

	"multicatalogo-backend/models"
)

// ListProductosAdmin lista todos (activos e inactivos) con búsqueda y paginación.
func (r *PostgresRepo) ListProductosAdmin(ctx context.Context, q string, page, limit int) ([]models.ProductoAdmin, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	where := "WHERE 1=1"
	args := []any{}
	if q != "" {
		args = append(args, "%"+q+"%")
		where += fmt.Sprintf(" AND (nombre ILIKE $%d OR categoria ILIKE $%d OR descripcion ILIKE $%d)", len(args), len(args), len(args))
	}
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM productos `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, offset)
	limIdx, offIdx := len(args)-1, len(args)
	rows, err := r.db.QueryContext(ctx, fmt.Sprintf(
		`SELECT id, nombre, descripcion, precio, categoria, img, galeria, stock, activo
		 FROM productos %s ORDER BY id LIMIT $%d OFFSET $%d`, where, limIdx, offIdx), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []models.ProductoAdmin
	for rows.Next() {
		var p models.ProductoAdmin
		var galeria pq.StringArray
		if err := rows.Scan(&p.ID, &p.Nombre, &p.Descripcion, &p.Precio, &p.Categoria, &p.Img, &galeria, &p.Stock, &p.Activo); err != nil {
			return nil, 0, err
		}
		p.Galeria = []string(galeria)
		if p.Galeria == nil {
			p.Galeria = []string{}
		}
		out = append(out, p)
	}
	if out == nil {
		out = []models.ProductoAdmin{}
	}
	return out, total, rows.Err()
}

// CrearProducto inserta un producto activo.
func (r *PostgresRepo) CrearProducto(ctx context.Context, in models.ProductoInput) (models.ProductoAdmin, error) {
	galeria := pq.StringArray(in.Galeria)
	if galeria == nil {
		galeria = pq.StringArray{}
	}
	var p models.ProductoAdmin
	var g pq.StringArray
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO productos (nombre, descripcion, precio, categoria, img, galeria, stock, activo)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,true)
		 RETURNING id, nombre, descripcion, precio, categoria, img, galeria, stock, activo`,
		in.Nombre, in.Descripcion, in.Precio, in.Categoria, in.Img, galeria, in.Stock,
	).Scan(&p.ID, &p.Nombre, &p.Descripcion, &p.Precio, &p.Categoria, &p.Img, &g, &p.Stock, &p.Activo)
	if err != nil {
		return models.ProductoAdmin{}, err
	}
	p.Galeria = []string(g)
	if p.Galeria == nil {
		p.Galeria = []string{}
	}
	return p, nil
}

// ActualizarProducto edición parcial (solo campos no cero / no vacíos según presencia).
func (r *PostgresRepo) ActualizarProducto(ctx context.Context, id int, in models.ProductoInput) (models.ProductoAdmin, error) {
	// Lectura actual
	var p models.ProductoAdmin
	var g pq.StringArray
	err := r.db.QueryRowContext(ctx,
		`SELECT id, nombre, descripcion, precio, categoria, img, galeria, stock, activo FROM productos WHERE id=$1`, id,
	).Scan(&p.ID, &p.Nombre, &p.Descripcion, &p.Precio, &p.Categoria, &p.Img, &g, &p.Stock, &p.Activo)
	if errors.Is(err, sql.ErrNoRows) {
		return models.ProductoAdmin{}, sql.ErrNoRows
	}
	if err != nil {
		return models.ProductoAdmin{}, err
	}
	if in.Nombre != "" {
		p.Nombre = in.Nombre
	}
	if in.Descripcion != "" {
		p.Descripcion = in.Descripcion
	}
	if in.Precio > 0 {
		p.Precio = in.Precio
	}
	if in.Categoria != "" {
		p.Categoria = in.Categoria
	}
	if in.Img != "" {
		p.Img = in.Img
	}
	if in.Galeria != nil {
		g = pq.StringArray(in.Galeria)
	}
	if in.Stock >= 0 {
		p.Stock = in.Stock
	}
	_, err = r.db.ExecContext(ctx,
		`UPDATE productos SET nombre=$1, descripcion=$2, precio=$3, categoria=$4, img=$5, galeria=$6, stock=$7 WHERE id=$8`,
		p.Nombre, p.Descripcion, p.Precio, p.Categoria, p.Img, g, p.Stock, id,
	)
	if err != nil {
		return models.ProductoAdmin{}, err
	}
	p.Galeria = []string(g)
	if p.Galeria == nil {
		p.Galeria = []string{}
	}
	return p, nil
}

// DesactivarProducto borrado lógico.
func (r *PostgresRepo) DesactivarProducto(ctx context.Context, id int) error {
	res, err := r.db.ExecContext(ctx, `UPDATE productos SET activo=false WHERE id=$1 AND activo=true`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// ActivarProducto reactiva un producto.
func (r *PostgresRepo) ActivarProducto(ctx context.Context, id int) error {
	res, err := r.db.ExecContext(ctx, `UPDATE productos SET activo=true WHERE id=$1`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}
