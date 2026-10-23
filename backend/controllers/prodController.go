package controllers

import (
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/repository"
)

// ProductoController recibe el repositorio y el caché por constructor.
type ProductoController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
}

func NewProductoController(repo repository.DBRepository, cache repository.CacheRepository) *ProductoController {
	return &ProductoController{repo: repo, cache: cache}
}

// GetProductos devuelve el catálogo completo (200), leído con Cache-Aside (Redis → PostgreSQL).
// La cabecera X-Cache indica HIT (vino de Redis) o MISS (se consultó PostgreSQL).
func (p *ProductoController) GetProductos(c *fiber.Ctx) error {
	productos, hit, err := repository.CacheAside(c.UserContext(), p.cache,
		repository.KeyProductos, repository.TTLProductos, p.repo.GetProductos)
	if err != nil {
		return dbError(c, err)
	}
	setCacheHeader(c, hit)
	return c.JSON(productos)
}

// GetProductoPorID devuelve un producto.
//
//	400 -> el :id no es un entero positivo
//	404 -> el producto no existe
func (p *ProductoController) GetProductoPorID(c *fiber.Ctx) error {
	raw := c.Params("id")
	id, err := strconv.Atoi(raw)
	if err != nil || id <= 0 {
		return SendError(c, fiber.StatusBadRequest, "El id del producto debe ser un número entero positivo",
			map[string]string{"id": raw})
	}

	producto, ok, err := p.repo.GetProductoByID(c.UserContext(), id)
	if err != nil {
		return dbError(c, err)
	}
	if !ok {
		return SendError(c, fiber.StatusNotFound, fmt.Sprintf("El producto con id %d no existe", id), nil)
	}
	return c.JSON(producto)
}
