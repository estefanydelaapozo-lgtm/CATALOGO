package controllers

import (
	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
)

func Login(c *fiber.Ctx) error {
	var req models.LoginRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Cuerpo de petición inválido"})
	}

	switch {
	case req.Email == "admin@upse.edu.ec" && req.Password == "123456":
		return c.JSON(fiber.Map{"token": "fake-jwt-token-123", "email": req.Email, "rol": "admin"})
	case req.Email == "cliente@upse.edu.ec" && req.Password == "123456":
		return c.JSON(fiber.Map{"token": "fake-jwt-token-456", "email": req.Email, "rol": "cliente"})
	default:
		return c.Status(401).JSON(fiber.Map{"error": "Credenciales incorrectas"})
	}
}