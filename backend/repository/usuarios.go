package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"multicatalogo-backend/models"
)

// ErrEmailDuplicado se devuelve cuando el email ya está registrado.
var ErrEmailDuplicado = errors.New("email ya registrado")

// ErrRefInvalido se devuelve cuando el código de referido no existe.
var ErrRefInvalido = errors.New("código de referido inválido")

// RegistrarUsuario crea usuario (rol cliente) + nodo en referidos en UNA transacción.
// Si ref no está vacío, cuelga el nodo del parent con ese código.
func (r *PostgresRepo) RegistrarUsuario(ctx context.Context, nombre, email, password, ref string) (models.Usuario, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return models.Usuario{}, err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return models.Usuario{}, err
	}
	defer tx.Rollback()

	var parentID sql.NullInt64
	nivel := 1
	if ref != "" {
		var pid, parentNivel int
		err = tx.QueryRowContext(ctx,
			`SELECT id, nivel FROM referidos WHERE UPPER(codigo) = UPPER($1)`, ref,
		).Scan(&pid, &parentNivel)
		if errors.Is(err, sql.ErrNoRows) {
			return models.Usuario{}, ErrRefInvalido
		}
		if err != nil {
			return models.Usuario{}, err
		}
		parentID = sql.NullInt64{Int64: int64(pid), Valid: true}
		nivel = parentNivel + 1
	}

	codigo := generarCodigo(nombre, email)

	var nodoID int
	err = tx.QueryRowContext(ctx,
		`INSERT INTO referidos (nombre, nivel, ventas, parent_id, codigo, saldo)
		 VALUES ($1, $2, 0, $3, $4, 0) RETURNING id`,
		nombre, nivel, parentID, codigo,
	).Scan(&nodoID)
	if err != nil {
		return models.Usuario{}, err
	}

	var u models.Usuario
	err = tx.QueryRowContext(ctx,
		`INSERT INTO usuarios (email, password, rol, token, nombre, activo, referido_id)
		 VALUES ($1, $2, 'cliente', '', $3, true, $4)
		 RETURNING id, email, rol, nombre, activo, referido_id`,
		strings.ToLower(email), string(hash), nombre, nodoID,
	).Scan(&u.ID, &u.Email, &u.Rol, &u.Nombre, &u.Activo, &nodoID)
	if err != nil {
		if isUniqueViolation(err) {
			return models.Usuario{}, ErrEmailDuplicado
		}
		return models.Usuario{}, err
	}
	u.ReferidoID = &nodoID

	if err := tx.Commit(); err != nil {
		return models.Usuario{}, err
	}
	return u, nil
}

func generarCodigo(nombre, email string) string {
	base := strings.ToUpper(strings.Map(func(r rune) rune {
		if r >= 'A' && r <= 'Z' || r >= 'a' && r <= 'z' {
			return r
		}
		return -1
	}, nombre))
	if len(base) > 6 {
		base = base[:6]
	}
	if base == "" {
		base = "USER"
	}
	// sufijo del local-part del email para unicidad
	local := email
	if i := strings.Index(email, "@"); i > 0 {
		local = email[:i]
	}
	suf := strings.ToUpper(local)
	if len(suf) > 4 {
		suf = suf[len(suf)-4:]
	}
	return fmt.Sprintf("%s%s", base, suf)
}

func isUniqueViolation(err error) bool {
	return err != nil && (strings.Contains(err.Error(), "unique") ||
		strings.Contains(err.Error(), "duplicate") ||
		strings.Contains(err.Error(), "usuarios_email"))
}

// GetUsuarioByID carga un usuario por id.
func (r *PostgresRepo) GetUsuarioByID(ctx context.Context, id int) (models.Usuario, bool, error) {
	var u models.Usuario
	var refID sql.NullInt64
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email, rol, COALESCE(nombre,''), activo, referido_id FROM usuarios WHERE id = $1`, id,
	).Scan(&u.ID, &u.Email, &u.Rol, &u.Nombre, &u.Activo, &refID)
	if errors.Is(err, sql.ErrNoRows) {
		return models.Usuario{}, false, nil
	}
	if err != nil {
		return models.Usuario{}, false, err
	}
	if refID.Valid {
		v := int(refID.Int64)
		u.ReferidoID = &v
	}
	return u, true, nil
}
