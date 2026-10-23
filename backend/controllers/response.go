package controllers

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
)

// SendError responde con el formato estandarizado models.APIError.
// Details solo se incluyen si APP_ENV=dev (evita filtrar info interna en producción).
func SendError(c *fiber.Ctx, status int, message string, details interface{}) error {
	if os.Getenv("APP_ENV") != "dev" {
		details = nil
	}
	return c.Status(status).JSON(models.APIError{Status: status, Message: message, Details: details})
}

// dbError registra el error real en el log del servidor y responde un 500 genérico
// (el detalle interno de la base de datos nunca se expone al cliente).
func dbError(c *fiber.Ctx, err error) error {
	log.Printf("error de base de datos [%s %s]: %v", c.Method(), c.Path(), err)
	return SendError(c, fiber.StatusInternalServerError, "Error al consultar la base de datos", nil)
}

// ErrorHandler es el manejador global de errores de Fiber: cualquier error no controlado
// (ruta inexistente 404, método no permitido 405, panic recuperado, etc.) sale con el mismo JSON.
func ErrorHandler(c *fiber.Ctx, err error) error {
	status := fiber.StatusInternalServerError
	message := "Error interno del servidor"

	switch e := err.(type) {
	case *models.APIError:
		status, message = e.Status, e.Message
	case *fiber.Error:
		status, message = e.Code, e.Message
	}
	return SendError(c, status, message, nil)
}

// setCacheHeader añade X-Cache: HIT|MISS a la respuesta (campo adicional, no cambia el JSON).
// Permite ver en la pestaña Network si la respuesta salió de Redis o de PostgreSQL.
func setCacheHeader(c *fiber.Ctx, hit bool) {
	if hit {
		c.Set("X-Cache", "HIT")
	} else {
		c.Set("X-Cache", "MISS")
	}
}
