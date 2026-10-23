// Paquete config: configuración del entorno y conexión a PostgreSQL.
package config

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"os"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq" // driver PostgreSQL para database/sql
)

// Getenv devuelve la variable de entorno o un valor por defecto.
func Getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// LoadEnv carga el archivo .env si existe (si no, se usan las variables del sistema).
func LoadEnv() {
	if err := godotenv.Load(); err != nil {
		log.Println("config: no se encontró .env, se usan variables del sistema y valores por defecto")
	}
}

// dsn arma la cadena de conexión escapando usuario y contraseña correctamente.
func dsn() string {
	u := url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(Getenv("DB_USER", "multicatalogo"), Getenv("DB_PASSWORD", "multicatalogo123")),
		Host:     Getenv("DB_HOST", "localhost") + ":" + Getenv("DB_PORT", "5432"),
		Path:     Getenv("DB_NAME", "multicatalogo"),
		RawQuery: "sslmode=" + Getenv("DB_SSLMODE", "disable"),
	}
	return u.String()
}

// ConnectDB abre el pool de conexiones y verifica que PostgreSQL responda.
// Reintenta unos segundos por si el contenedor de Docker aún está arrancando.
// El llamador debe cerrar el pool con db.Close() al terminar la aplicación.
func ConnectDB() (*sql.DB, error) {
	db, err := sql.Open("postgres", dsn())
	if err != nil {
		return nil, fmt.Errorf("abriendo conexión: %w", err)
	}

	// Parámetros del pool (alta transaccionalidad: reutilizar conexiones).
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)

	const intentos = 5
	for i := 1; i <= intentos; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		err = db.PingContext(ctx)
		cancel()
		if err == nil {
			log.Printf("config: conectado a PostgreSQL (%s/%s)", Getenv("DB_HOST", "localhost")+":"+Getenv("DB_PORT", "5432"), Getenv("DB_NAME", "multicatalogo"))
			return db, nil
		}
		log.Printf("config: PostgreSQL no responde (intento %d/%d): %v", i, intentos, err)
		time.Sleep(2 * time.Second)
	}
	db.Close()
	return nil, fmt.Errorf("no se pudo conectar a PostgreSQL tras %d intentos: %w", intentos, err)
}
