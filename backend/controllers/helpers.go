package controllers

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

// parseRango lee ?desde&hasta (YYYY-MM-DD). Por defecto: últimos 30 días → mañana.
func parseRango(c *fiber.Ctx) (time.Time, time.Time) {
	now := time.Now()
	hasta := now.AddDate(0, 0, 1)
	desde := now.AddDate(0, 0, -30)
	if s := c.Query("desde"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			desde = t
		}
	}
	if s := c.Query("hasta"); s != "" {
		if t, err := time.Parse("2006-01-02", s); err == nil {
			hasta = t.AddDate(0, 0, 1) // exclusivo
		}
	}
	return desde, hasta
}
