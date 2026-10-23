// Paquete main: punto de entrada del servidor.
package main

import (
	"context"
	"database/sql"
	"log"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/redis/go-redis/v9"

	"multicatalogo-backend/config"
	"multicatalogo-backend/controllers"
	"multicatalogo-backend/database"
	"multicatalogo-backend/repository"
	"multicatalogo-backend/routes"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

// run contiene el ciclo de vida completo; al ser una función normal, sus defer
// (cierre del pool de BD) SÍ se ejecutan, cosa que no pasa con log.Fatal dentro de main.
func run() error {
	config.LoadEnv()

	db, err := config.ConnectDB()
	if err != nil {
		return err
	}
	defer func() {
		if err := db.Close(); err != nil {
			log.Printf("error cerrando la conexión a la BD: %v", err)
		} else {
			log.Println("conexión a PostgreSQL cerrada")
		}
	}()

	// BD nueva (ej. PostgreSQL recién creado en Render): carga el esquema base y los datos semilla.
	// Si la tabla usuarios ya existe NO se toca nada (init.sql contiene DROP TABLE).
	var tablaUsuarios sql.NullString
	if err := db.QueryRow(`SELECT to_regclass('public.usuarios')::text`).Scan(&tablaUsuarios); err == nil && !tablaUsuarios.Valid {
		if err := config.Migrate(db, "init", database.InitSQL); err != nil {
			return err
		}
	}

	// Fase 4: crea/actualiza pedidos, pedido_items, comisiones, stock... (idempotente).
	if err := config.Migrate(db, "fase4", database.MigracionFase4); err != nil {
		return err
	}
	// Seguridad: bcrypt de passwords + índices (idempotente).
	if err := config.Migrate(db, "seguridad", database.MigracionSeguridad); err != nil {
		return err
	}
	// Back-office MLM (registro, CRUD, ledger, liquidaciones).
	if err := config.Migrate(db, "backoffice", database.MigracionBackoffice); err != nil {
		return err
	}

	// Redis (Fase 3): si no está disponible, se inyecta un caché nulo y la API sigue
	// funcionando (todas las lecturas van a PostgreSQL).
	var cache repository.CacheRepository = repository.NopCache{}
	var rdbClient *redis.Client
	rdb, err := config.ConnectRedis()
	if err != nil {
		log.Printf("ADVERTENCIA: %v — la API funcionará SIN caché", err)
	} else {
		rdbClient = rdb
		defer func() {
			if err := rdb.Close(); err != nil {
				log.Printf("error cerrando la conexión a Redis: %v", err)
			} else {
				log.Println("conexión a Redis cerrada")
			}
		}()
		cache = repository.NewRedisCache(rdb)
	}

	// ---------- Inyección de dependencias (Fase 4 + seguridad) ----------
	// ÚNICO lugar donde se crean las implementaciones concretas y se conectan entre sí:
	//   PostgreSQL -> PostgresRepo (DBRepository) ┐
	//   Redis      -> RedisCache  (CacheRepository) ┴-> controladores
	pausa, _ := strconv.Atoi(config.Getenv("PAUSA_CHECKOUT_SEG", "10"))
	repo := repository.NewPostgresRepo(db, repository.Opciones{
		Falla: config.Getenv("FALLA_CHECKOUT", ""), // SOLO demo: "", "antes_items" o "pausa"
		Pausa: time.Duration(pausa) * time.Second,
	})
	if f := config.Getenv("FALLA_CHECKOUT", ""); f != "" {
		log.Printf("ATENCIÓN: FALLA_CHECKOUT=%q activo (modo demostración del ROLLBACK)", f)
	}

	checkout := controllers.NewCheckoutController(repo, cache)
	handlers := routes.Controllers{
		Auth:         controllers.NewAuthController(repo),
		Register:     controllers.NewRegisterController(repo),
		Producto:     controllers.NewProductoController(repo, cache),
		ProductoAdmin: controllers.NewProductoAdminController(repo, cache),
		Red:          controllers.NewRedController(repo, cache),
		Checkout:     checkout,
		Pedidos:      controllers.NewPedidosController(repo, cache),
		MLM:          controllers.NewMLMController(repo),
		Reportes:     controllers.NewReportesController(repo),
		Health:       controllers.NewHealthController(db, rdbClient),
	}

	// ErrorHandler global: todo error sale con el JSON estandarizado APIError.
	app := fiber.New(fiber.Config{ErrorHandler: controllers.ErrorHandler})

	// recover evita que un panic tumbe el servidor (lo convierte en un 500 estandarizado).
	app.Use(recover.New())

	// Orígenes permitidos: los de desarrollo + los de CORS_ORIGINS (separados por coma),
	// ej. CORS_ORIGINS=https://multicatalogo-web.onrender.com
	origenes := "http://localhost:5173, http://127.0.0.1:5173, http://192.168.110.84:5173"
	if extra := config.Getenv("CORS_ORIGINS", ""); extra != "" {
		origenes += ", " + extra
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins: origenes,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		// Permite que el navegador (fetch) lea X-Cache: HIT | MISS.
		ExposeHeaders: "X-Cache",
	}))

	routes.SetupRoutes(app, handlers)

	// Apagado ordenado con Ctrl+C / SIGTERM.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() { errCh <- app.Listen(":" + config.Getenv("PORT", "3000")) }()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		log.Println("señal de apagado recibida, cerrando servidor...")
		err := app.Shutdown()
		// Misión crítica: espera a que terminen las comisiones que se estén calculando.
		if checkout.Esperar(10 * time.Second) {
			log.Println("comisiones en segundo plano finalizadas")
		} else {
			log.Println("ADVERTENCIA: quedaron comisiones sin terminar (se reintentarán manualmente)")
		}
		return err
	}
}
