package config

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"
)

// Migrate ejecuta un script SQL idempotente (CREATE ... IF NOT EXISTS, etc.).
// lib/pq envía el script completo en una sola petición, de modo que se aplica entero o nada.
func Migrate(db *sql.DB, nombre, script string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if _, err := db.ExecContext(ctx, script); err != nil {
		return fmt.Errorf("migración %s: %w", nombre, err)
	}
	log.Printf("config: migración %s aplicada", nombre)
	return nil
}
