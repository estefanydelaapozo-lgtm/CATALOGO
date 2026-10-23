package config

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// ConnectRedis crea el cliente de Redis (caché) y verifica que el servidor responda.
//
// Configuración por variables de entorno (la primera que exista gana):
//
//	REDIS_URL                      -> ej. redis://:clave@localhost:6379/0
//	REDIS_HOST + REDIS_PORT (+ REDIS_PASSWORD, REDIS_DB) -> por defecto localhost:6379
//
// Los timeouts son cortos A PROPÓSITO: si Redis se cae, la API no debe quedarse
// esperando; es preferible fallar rápido y consultar PostgreSQL.
// El llamador debe cerrar el cliente con rdb.Close() al terminar la aplicación.
func ConnectRedis() (*redis.Client, error) {
	var opts *redis.Options

	if uri := Getenv("REDIS_URL", ""); uri != "" {
		parsed, err := redis.ParseURL(uri)
		if err != nil {
			return nil, fmt.Errorf("REDIS_URL inválida: %w", err)
		}
		opts = parsed
	} else {
		db, err := strconv.Atoi(Getenv("REDIS_DB", "0"))
		if err != nil {
			return nil, fmt.Errorf("REDIS_DB debe ser un entero: %w", err)
		}
		opts = &redis.Options{
			Addr:     Getenv("REDIS_HOST", "localhost") + ":" + Getenv("REDIS_PORT", "6379"),
			Password: Getenv("REDIS_PASSWORD", ""),
			DB:       db,
		}
	}

	opts.DialTimeout = 1 * time.Second
	opts.ReadTimeout = 500 * time.Millisecond
	opts.WriteTimeout = 500 * time.Millisecond
	opts.MaxRetries = -1 // sin reintentos internos: si Redis falla, se va directo a PostgreSQL

	rdb := redis.NewClient(opts)

	// Reintenta unos segundos por si el contenedor de Redis aún está arrancando.
	const intentos = 3
	var err error
	for i := 1; i <= intentos; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		err = rdb.Ping(ctx).Err()
		cancel()
		if err == nil {
			log.Printf("config: conectado a Redis (%s)", opts.Addr)
			return rdb, nil
		}
		log.Printf("config: Redis no responde (intento %d/%d): %v", i, intentos, err)
		if i < intentos {
			time.Sleep(1 * time.Second)
		}
	}
	rdb.Close()
	return nil, fmt.Errorf("no se pudo conectar a Redis tras %d intentos: %w", intentos, err)
}
