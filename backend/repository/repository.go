// Paquete repository: capa de acceso a datos sobre PostgreSQL.
// No contiene datos en memoria ni variables globales: PostgresRepo recibe su pool por constructor
// (inyección de dependencias) e implementa la interfaz DBRepository.
package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"

	"multicatalogo-backend/models"
)

// PostgresRepo es la implementación de DBRepository sobre PostgreSQL.
type PostgresRepo struct {
	db   *sql.DB
	opts Opciones
}

// Opciones agrupa los ajustes de DEMOSTRACIÓN del repositorio (ver pedidos.go).
type Opciones struct {
	Falla string        // "", "antes_items" o "pausa": simula fallos dentro de la transacción
	Pausa time.Duration // duración de la pausa antes del COMMIT cuando Falla == "pausa"
}

// NewPostgresRepo recibe el pool ya abierto (creado en config.ConnectDB).
func NewPostgresRepo(db *sql.DB, opts Opciones) *PostgresRepo {
	return &PostgresRepo{db: db, opts: opts}
}

// ErrCuentaDesactivada se devuelve cuando el hash es correcto pero activo=false.
var ErrCuentaDesactivada = errors.New("cuenta desactivada")

// FindUsuario valida credenciales con bcrypt. Devuelve (usuario, true, nil) si
// el hash coincide y la cuenta está activa; (_, false, nil) si email/password
// no coinciden; (_, false, ErrCuentaDesactivada) si está desactivada.
func (r *PostgresRepo) FindUsuario(ctx context.Context, email, password string) (models.Usuario, bool, error) {
	var u models.Usuario
	var activo bool
	var refID sql.NullInt64
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email, password, rol, COALESCE(token,''), COALESCE(nombre,''), COALESCE(activo,true), referido_id
		 FROM usuarios WHERE LOWER(email) = LOWER($1)`,
		email,
	).Scan(&u.ID, &u.Email, &u.Password, &u.Rol, &u.Token, &u.Nombre, &activo, &refID)
	if errors.Is(err, sql.ErrNoRows) {
		return models.Usuario{}, false, nil
	}
	if err != nil {
		return models.Usuario{}, false, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password)); err != nil {
		return models.Usuario{}, false, nil
	}
	if !activo {
		return models.Usuario{}, false, ErrCuentaDesactivada
	}
	u.Activo = true
	if refID.Valid {
		id := int(refID.Int64)
		u.ReferidoID = &id
	}
	return u, true, nil
}

// FindUsuarioByToken autentica una petición por su token (cabecera Authorization: Bearer <token>).
func (r *PostgresRepo) FindUsuarioByToken(ctx context.Context, token string) (models.Usuario, bool, error) {
	var u models.Usuario
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email, password, rol, token FROM usuarios WHERE token = $1`, token,
	).Scan(&u.ID, &u.Email, &u.Password, &u.Rol, &u.Token)
	if errors.Is(err, sql.ErrNoRows) {
		return models.Usuario{}, false, nil
	}
	if err != nil {
		return models.Usuario{}, false, err
	}
	return u, true, nil
}

const selectProductos = `SELECT id, nombre, descripcion, precio, categoria, img, galeria, stock FROM productos WHERE activo = true`

func scanProducto(row interface{ Scan(...any) error }) (models.Producto, error) {
	var p models.Producto
	var galeria pq.StringArray
	if err := row.Scan(&p.ID, &p.Nombre, &p.Descripcion, &p.Precio, &p.Categoria, &p.Img, &galeria, &p.Stock); err != nil {
		return models.Producto{}, err
	}
	p.Galeria = []string(galeria)
	if p.Galeria == nil {
		p.Galeria = []string{} // JSON: [] en vez de null
	}
	return p, nil
}

// GetProductos devuelve el catálogo completo.
func (r *PostgresRepo) GetProductos(ctx context.Context) ([]models.Producto, error) {
	rows, err := r.db.QueryContext(ctx, selectProductos+` ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	productos := []models.Producto{} // JSON: [] si no hay filas
	for rows.Next() {
		p, err := scanProducto(rows)
		if err != nil {
			return nil, err
		}
		productos = append(productos, p)
	}
	return productos, rows.Err()
}

// GetProductoByID busca un producto; el segundo valor indica si existe.
func (r *PostgresRepo) GetProductoByID(ctx context.Context, id int) (models.Producto, bool, error) {
	p, err := scanProducto(r.db.QueryRowContext(ctx, selectProductos+` AND id = $1`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return models.Producto{}, false, nil
	}
	if err != nil {
		return models.Producto{}, false, err
	}
	return p, true, nil
}

// GetRed reconstruye en memoria el árbol multinivel a partir de la lista plana de `referidos`.
func (r *PostgresRepo) GetRed(ctx context.Context) (models.Referido, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, nombre, nivel, ventas, saldo, parent_id FROM referidos ORDER BY nivel, id`)
	if err != nil {
		return models.Referido{}, err
	}
	defer rows.Close()

	nodos := map[int]models.Referido{}
	hijos := map[int][]int{} // padre -> ids de hijos (conserva el orden de la consulta)
	raiz, hayRaiz := 0, false

	for rows.Next() {
		var nodo models.Referido
		var parent sql.NullInt64
		if err := rows.Scan(&nodo.ID, &nodo.Nombre, &nodo.Nivel, &nodo.Ventas, &nodo.Saldo, &parent); err != nil {
			return models.Referido{}, err
		}
		nodos[nodo.ID] = nodo
		if parent.Valid {
			hijos[int(parent.Int64)] = append(hijos[int(parent.Int64)], nodo.ID)
		} else if !hayRaiz {
			raiz, hayRaiz = nodo.ID, true
		}
	}
	if err := rows.Err(); err != nil {
		return models.Referido{}, err
	}
	if !hayRaiz {
		return models.Referido{}, errors.New("la tabla referidos no tiene un nodo raíz (parent_id NULL)")
	}

	var armar func(id int) models.Referido
	armar = func(id int) models.Referido {
		n := nodos[id]
		for _, h := range hijos[id] {
			n.Hijos = append(n.Hijos, armar(h))
		}
		return n
	}
	return armar(raiz), nil
}