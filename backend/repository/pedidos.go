package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"math"
	"sort"
	"time"

	"multicatalogo-backend/models"
)

// Errores de negocio: el controlador los traduce a 400 / 409 (no son fallos de la BD).

// ProductoNoExisteError indica que el carrito contiene un id que no está en `productos`.
type ProductoNoExisteError struct{ ID int }

func (e *ProductoNoExisteError) Error() string {
	return fmt.Sprintf("el producto con id %d no existe", e.ID)
}

// StockInsuficienteError indica que no hay unidades suficientes de un producto.
type StockInsuficienteError struct {
	ID         int
	Nombre     string
	Disponible int
	Solicitado int
}

func (e *StockInsuficienteError) Error() string {
	return fmt.Sprintf("stock insuficiente para «%s»: disponible %d, solicitado %d", e.Nombre, e.Disponible, e.Solicitado)
}

// Valores de Opciones.Falla (SOLO para demostrar el ROLLBACK en clase; por defecto está apagado).
const (
	FallaAntesItems = "antes_items" // error forzado tras insertar el pedido y antes de los items
	FallaPausa      = "pausa"       // pausa antes del COMMIT: da tiempo a hacer `docker kill multicatalogo-db`
)

// Comisión por nivel ascendente: 1.er ascendente 10 %, 2.º 5 %, 3.º 2 % (igual que el frontend).
var tasasComision = [3]float64{0.10, 0.05, 0.02}

// CrearPedido guarda el pedido de forma ATÓMICA (ACID):
//
//	BEGIN
//	  1. INSERT pedido (cabecera)
//	  2. por cada producto: UPDATE stock (solo si alcanza) + INSERT pedido_items
//	  3. UPDATE pedido con el total calculado con los precios REALES de la BD
//	COMMIT      <- todo queda guardado
//
// Si CUALQUIER paso falla, el `defer tx.Rollback()` revierte todo: no queda ni pedido ni stock descontado.
func (r *PostgresRepo) CrearPedido(ctx context.Context, n models.NuevoPedido) (models.Pedido, error) {
	tx, err := r.db.BeginTx(ctx, nil) // BEGIN
	if err != nil {
		return models.Pedido{}, err
	}
	// Tras un COMMIT exitoso Rollback no hace nada; ante cualquier return con error, revierte.
	defer tx.Rollback()

	// 1) Cabecera del pedido (total provisional 0; se actualiza al final).
	p := models.Pedido{
		MetodoPago: n.MetodoPago,
		Cliente:    models.ClientePedido{Nombre: n.Cliente.Nombre, Email: n.Cliente.Email, Ciudad: n.Cliente.Ciudad},
		Items:      []models.ItemPedido{},
	}
	err = tx.QueryRowContext(ctx,
		`INSERT INTO pedidos (usuario_id, cliente_nombre, cliente_email, direccion, ciudad, telefono, metodo_pago, total)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
		 RETURNING id, numero, estado, created_at`,
		n.UsuarioID, n.Cliente.Nombre, n.Cliente.Email, n.Cliente.Direccion, n.Cliente.Ciudad, n.Cliente.Telefono, n.MetodoPago,
	).Scan(&p.ID, &p.Numero, &p.Estado, &p.Fecha)
	if err != nil {
		return models.Pedido{}, err
	}

	// ---- PUNTO DE INYECCIÓN DE FALLA 1 (demo): el pedido ya se insertó, los items todavía no ----
	if r.opts.Falla == FallaAntesItems {
		return models.Pedido{}, errors.New("falla simulada: caída del sistema antes de procesar los items")
	}

	// 2) Items: ordenados por id para que dos compras simultáneas bloqueen filas en el mismo
	//    orden (evita deadlocks) y con los duplicados ya sumados.
	var totalCentavos int64
	for _, it := range consolidarItems(n.Items) {
		var nombre string
		var precio float64

		// UPDATE atómico: descuenta solo si alcanza el stock. Dos compras simultáneas del último
		// producto no pueden vender más de lo que hay (la fila queda bloqueada hasta el COMMIT).
		err := tx.QueryRowContext(ctx,
			`UPDATE productos SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING nombre, precio`,
			it.Cantidad, it.ID,
		).Scan(&nombre, &precio)
		if errors.Is(err, sql.ErrNoRows) {
			// No se actualizó nada: ¿no existe, o no alcanza el stock?
			var disponible int
			var nombreActual string
			e2 := tx.QueryRowContext(ctx, `SELECT nombre, stock FROM productos WHERE id = $1`, it.ID).Scan(&nombreActual, &disponible)
			if errors.Is(e2, sql.ErrNoRows) {
				return models.Pedido{}, &ProductoNoExisteError{ID: it.ID}
			}
			if e2 != nil {
				return models.Pedido{}, e2
			}
			return models.Pedido{}, &StockInsuficienteError{ID: it.ID, Nombre: nombreActual, Disponible: disponible, Solicitado: it.Cantidad}
		}
		if err != nil {
			return models.Pedido{}, err
		}

		if _, err := tx.ExecContext(ctx,
			`INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)`,
			p.ID, it.ID, it.Cantidad, precio,
		); err != nil {
			return models.Pedido{}, err
		}

		totalCentavos += int64(math.Round(precio*100)) * int64(it.Cantidad)
		p.Items = append(p.Items, models.ItemPedido{ID: it.ID, Nombre: nombre, Cantidad: it.Cantidad, Precio: precio})
	}
	p.Total = float64(totalCentavos) / 100

	// 3) Total real del pedido.
	if _, err := tx.ExecContext(ctx, `UPDATE pedidos SET total = $1 WHERE id = $2`, p.Total, p.ID); err != nil {
		return models.Pedido{}, err
	}

	// ---- PUNTO DE INYECCIÓN DE FALLA 2 (demo): todo listo, falta el COMMIT ----
	if r.opts.Falla == FallaPausa {
		log.Printf("DEMO: pausa de %s antes del COMMIT (pedido %s sin confirmar). Ahora puedes: docker kill multicatalogo-db", r.opts.Pausa, p.Numero)
		time.Sleep(r.opts.Pausa)
	}

	if err := tx.Commit(); err != nil { // COMMIT
		return models.Pedido{}, err
	}
	return p, nil
}

// consolidarItems suma las cantidades de productos repetidos y ordena por id.
func consolidarItems(items []models.ItemCheckout) []models.ItemCheckout {
	suma := map[int]int{}
	for _, it := range items {
		suma[it.ID] += it.Cantidad
	}
	out := make([]models.ItemCheckout, 0, len(suma))
	for id, c := range suma {
		out = append(out, models.ItemCheckout{ID: id, Cantidad: c})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

// AcreditarComisiones reparte, en UNA transacción, lo que genera un pedido ya confirmado:
//   - suma el total a las `ventas` del nodo del comprador,
//   - paga 10 % / 5 % / 2 % a sus tres ascendentes (saldo + registro en `comisiones`).
//
// Es idempotente: `comisiones_calculadas` impide pagar dos veces el mismo pedido (reintentos).
// Está pensada para ejecutarse en una goroutine, por eso no recibe el contexto de la petición.
func (r *PostgresRepo) AcreditarComisiones(ctx context.Context, pedidoID int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Candado + marca: si otra goroutine ya procesó este pedido, no devuelve filas.
	var total float64
	var usuarioID int
	err = tx.QueryRowContext(ctx,
		`UPDATE pedidos SET comisiones_calculadas = TRUE
		 WHERE id = $1 AND comisiones_calculadas = FALSE
		 RETURNING total, usuario_id`, pedidoID,
	).Scan(&total, &usuarioID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil // ya estaba procesado
	}
	if err != nil {
		return err
	}

	// ¿Dónde está el comprador dentro de la red? (los usuarios sin nodo, no generan comisión)
	var nodo sql.NullInt64
	if err := tx.QueryRowContext(ctx, `SELECT referido_id FROM usuarios WHERE id = $1`, usuarioID).Scan(&nodo); err != nil {
		return err
	}
	if !nodo.Valid {
		return tx.Commit()
	}

	if _, err := tx.ExecContext(ctx, `UPDATE referidos SET ventas = ventas + $1 WHERE id = $2`, total, nodo.Int64); err != nil {
		return err
	}

	// Ascendentes hasta 3 niveles (consulta recursiva): dist 1 = padre, 2 = abuelo, 3 = bisabuelo.
	rows, err := tx.QueryContext(ctx,
		`WITH RECURSIVE asc_ AS (
		     SELECT parent_id AS id, 1 AS dist FROM referidos WHERE id = $1 AND parent_id IS NOT NULL
		     UNION ALL
		     SELECT r.parent_id, a.dist + 1 FROM referidos r JOIN asc_ a ON r.id = a.id
		     WHERE r.parent_id IS NOT NULL AND a.dist < 3
		 )
		 SELECT id, dist FROM asc_ ORDER BY dist`, nodo.Int64)
	if err != nil {
		return err
	}
	type ascendente struct{ id, dist int }
	var ascendentes []ascendente
	for rows.Next() {
		var a ascendente
		if err := rows.Scan(&a.id, &a.dist); err != nil {
			rows.Close()
			return err
		}
		ascendentes = append(ascendentes, a)
	}
	rows.Close() // hay que cerrar el cursor antes de ejecutar más sentencias en la misma tx
	if err := rows.Err(); err != nil {
		return err
	}

	for _, a := range ascendentes {
		tasa := tasasComision[a.dist-1]
		monto := math.Round(total*tasa*100) / 100
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO comisiones (pedido_id, referido_id, nivel, porcentaje, monto) VALUES ($1, $2, $3, $4, $5)`,
			pedidoID, a.id, a.dist, tasa, monto); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `UPDATE referidos SET saldo = saldo + $1 WHERE id = $2`, monto, a.id); err != nil {
			return err
		}
	}
	return tx.Commit()
}
