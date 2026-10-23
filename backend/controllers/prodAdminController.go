package controllers

import (
	"database/sql"
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// ProductoAdminController CRUD admin de productos.
type ProductoAdminController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
}

func NewProductoAdminController(repo repository.DBRepository, cache repository.CacheRepository) *ProductoAdminController {
	return &ProductoAdminController{repo: repo, cache: cache}
}

func (p *ProductoAdminController) List(c *fiber.Ctx) error {
	q := strings.TrimSpace(c.Query("q"))
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	data, total, err := p.repo.ListProductosAdmin(c.UserContext(), q, page, limit)
	if err != nil {
		return dbError(c, err)
	}
	return c.JSON(models.Pagina[models.ProductoAdmin]{Data: data, Page: page, Limit: limit, Total: total})
}

func (p *ProductoAdminController) Create(c *fiber.Ctx) error {
	var in models.ProductoInput
	if err := c.BodyParser(&in); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo inválido", nil)
	}
	in.Nombre = strings.TrimSpace(in.Nombre)
	in.Categoria = strings.TrimSpace(in.Categoria)
	if in.Nombre == "" || in.Precio <= 0 || in.Categoria == "" {
		return SendError(c, fiber.StatusBadRequest, "nombre, precio (>0) y categoría son obligatorios", nil)
	}
	prod, err := p.repo.CrearProducto(c.UserContext(), in)
	if err != nil {
		return dbError(c, err)
	}
	_ = p.cache.Delete(c.UserContext(), repository.KeyProductos)
	return c.Status(fiber.StatusCreated).JSON(prod)
}

func (p *ProductoAdminController) Update(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id < 1 {
		return SendError(c, fiber.StatusBadRequest, "id inválido", nil)
	}
	var in models.ProductoInput
	if err := c.BodyParser(&in); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo inválido", nil)
	}
	prod, err := p.repo.ActualizarProducto(c.UserContext(), id, in)
	if errors.Is(err, sql.ErrNoRows) {
		return SendError(c, fiber.StatusNotFound, "Producto no encontrado", nil)
	}
	if err != nil {
		return dbError(c, err)
	}
	_ = p.cache.Delete(c.UserContext(), repository.KeyProductos)
	return c.JSON(prod)
}

func (p *ProductoAdminController) Delete(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id < 1 {
		return SendError(c, fiber.StatusBadRequest, "id inválido", nil)
	}
	if err := p.repo.DesactivarProducto(c.UserContext(), id); errors.Is(err, sql.ErrNoRows) {
		return SendError(c, fiber.StatusNotFound, "Producto no encontrado o ya inactivo", nil)
	} else if err != nil {
		return dbError(c, err)
	}
	_ = p.cache.Delete(c.UserContext(), repository.KeyProductos)
	return c.JSON(fiber.Map{"message": "Producto desactivado"})
}

func (p *ProductoAdminController) Activate(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id < 1 {
		return SendError(c, fiber.StatusBadRequest, "id inválido", nil)
	}
	if err := p.repo.ActivarProducto(c.UserContext(), id); errors.Is(err, sql.ErrNoRows) {
		return SendError(c, fiber.StatusNotFound, "Producto no encontrado", nil)
	} else if err != nil {
		return dbError(c, err)
	}
	_ = p.cache.Delete(c.UserContext(), repository.KeyProductos)
	return c.JSON(fiber.Map{"message": "Producto activado"})
}
