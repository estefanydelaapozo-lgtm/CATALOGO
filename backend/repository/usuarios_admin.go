package repository

import (
	"context"
	"fmt"

	"multicatalogo-backend/models"
)

// UsuariosAdminRepository contrato mínimo para listar usuarios (se mantiene aparte de
// DBRepository para no obligar a los repositorios falsos de las pruebas a implementarlo).
type UsuariosAdminRepository interface {
	ListUsuariosAdmin(ctx context.Context, q string, page, limit int) ([]models.UsuarioAdmin, int, error)
}

// ListUsuariosAdmin devuelve usuarios paginados; q filtra por nombre o email.
// Nunca incluye password ni token.
func (r *PostgresRepo) ListUsuariosAdmin(ctx context.Context, q string, page, limit int) ([]models.UsuarioAdmin, int, error) {
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
		where += fmt.Sprintf(" AND (u.nombre ILIKE $%d OR u.email ILIKE $%d)", len(args), len(args))
	}
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM usuarios u `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, offset)
	limIdx, offIdx := len(args)-1, len(args)
	rows, err := r.db.QueryContext(ctx, fmt.Sprintf(
		`SELECT u.id, u.nombre, u.email, u.rol, u.activo, COALESCE(r.codigo, ''), u.creado_en
		 FROM usuarios u
		 LEFT JOIN referidos r ON r.id = u.referido_id
		 %s ORDER BY u.id LIMIT $%d OFFSET $%d`, where, limIdx, offIdx), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []models.UsuarioAdmin{}
	for rows.Next() {
		var u models.UsuarioAdmin
		if err := rows.Scan(&u.ID, &u.Nombre, &u.Email, &u.Rol, &u.Activo, &u.Codigo, &u.CreadoEn); err != nil {
			return nil, 0, err
		}
		out = append(out, u)
	}
	return out, total, rows.Err()
}
