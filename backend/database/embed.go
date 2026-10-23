// Paquete database: scripts SQL embebidos en el binario.
package database

import _ "embed"

// MigracionFase4 crea/actualiza las tablas de pedidos y comisiones (idempotente).
//
//go:embed migracion_fase4.sql
var MigracionFase4 string

// MigracionSeguridad aplica bcrypt a passwords e índices (idempotente).
//
//go:embed 003_seguridad.sql
var MigracionSeguridad string

// MigracionBackoffice tablas/columnas del back-office MLM (idempotente).
//
//go:embed 004_backoffice.sql
var MigracionBackoffice string

// MigracionPago columnas con el detalle del método de pago (idempotente).
//
//go:embed 005_pago.sql
var MigracionPago string

// MigracionMasProductos agrega productos adicionales al catálogo (idempotente).
//
//go:embed 006_mas_productos.sql
var MigracionMasProductos string

// InitSQL esquema base y datos semilla (usuarios, productos, referidos).
// Solo se ejecuta automáticamente si la tabla usuarios aún no existe (BD nueva, ej. en Render).
//
//go:embed init.sql
var InitSQL string
