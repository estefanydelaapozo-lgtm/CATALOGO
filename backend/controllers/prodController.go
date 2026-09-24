package controllers

import (
	"github.com/gofiber/fiber/v2"
	"multicatalogo-backend/models"
)

func GetProductos(c *fiber.Ctx) error {
	productos := []models.Producto{
		{ID: 1, Nombre: "Serum Revitalizante", Precio: 45.00, Img: "https://picsum.photos/seed/serum/150"},
		{ID: 2, Nombre: "Crema Hidratante Pro", Precio: 32.50, Img: "https://picsum.photos/seed/crema/150"},
		{ID: 3, Nombre: "Tónico Purificante", Precio: 28.00, Img: "https://picsum.photos/seed/tonico/150"},
		{ID: 4, Nombre: "Mascarilla Nocturna", Precio: 50.00, Img: "https://picsum.photos/seed/mascarilla/150"},
	}

	return c.JSON(productos)
}