package controllers

import (
	"context"
	"database/sql"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// HealthController hace ping real a Postgres y Redis.
type HealthController struct {
	db    *sql.DB
	redis *redis.Client // puede ser nil si Redis no está disponible
}

func NewHealthController(db *sql.DB, rdb *redis.Client) *HealthController {
	return &HealthController{db: db, redis: rdb}
}

// Health responde el estado del servicio y de sus dependencias.
//
//	200 {"status":"ok"|"degraded", "postgres":"ok", "redis":"ok"|"down"}
//	503 si Postgres no responde
func (h *HealthController) Health(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.UserContext(), 2*time.Second)
	defer cancel()

	pgStatus := "ok"
	if err := h.db.PingContext(ctx); err != nil {
		pgStatus = "down"
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"status":   "down",
			"postgres": pgStatus,
			"redis":    "unknown",
			"message":  "PostgreSQL no responde",
		})
	}

	redisStatus := "ok"
	overall := "ok"
	if h.redis == nil {
		redisStatus = "down"
		overall = "degraded"
	} else {
		if err := h.redis.Ping(ctx).Err(); err != nil {
			redisStatus = "down"
			overall = "degraded"
		}
	}

	return c.JSON(fiber.Map{
		"status":   overall,
		"postgres": pgStatus,
		"redis":    redisStatus,
		"message":  "Servidor Go/Fiber operativo",
	})
}
