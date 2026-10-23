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

// PedidosController consulta y gestión de pedidos.
type PedidosController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
}

func NewPedidosController(repo repository.DBRepository, cache repository.CacheRepository) *PedidosController {
	return &PedidosController{repo: repo, cache: cache}
}

func (pc *PedidosController) Mios(c *fiber.Ctx) error {
	uid, _ := c.Locals("userID").(int)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	data, total, err := pc.repo.ListPedidosMios(c.UserContext(), uid, page, limit)
	if err != nil {
		return dbError(c, err)
	}
	return c.JSON(models.Pagina[models.PedidoLista]{Data: data, Page: page, Limit: limit, Total: total})
}

func (pc *PedidosController) AdminList(c *fiber.Ctx) error {
	estado := strings.TrimSpace(c.Query("estado"))
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	data, total, err := pc.repo.ListPedidosAdmin(c.UserContext(), estado, page, limit)
	if err != nil {
		return dbError(c, err)
	}
	return c.JSON(models.Pagina[models.PedidoLista]{Data: data, Page: page, Limit: limit, Total: total})
}

func (pc *PedidosController) Detalle(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id < 1 {
		return SendError(c, fiber.StatusBadRequest, "id inválido", nil)
	}
	uid, _ := c.Locals("userID").(int)
	rol, _ := c.Locals("rol").(string)
	soloDueno := 0
	if rol != "admin" {
		soloDueno = uid
	}
	d, err := pc.repo.GetPedidoDetalle(c.UserContext(), id, soloDueno)
	if errors.Is(err, sql.ErrNoRows) {
		return SendError(c, fiber.StatusNotFound, "Pedido no encontrado", nil)
	}
	if err != nil {
		return dbError(c, err)
	}
	return c.JSON(d)
}

func (pc *PedidosController) CambiarEstado(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil || id < 1 {
		return SendError(c, fiber.StatusBadRequest, "id inválido", nil)
	}
	var body struct {
		Estado string `json:"estado"`
	}
	if err := c.BodyParser(&body); err != nil || strings.TrimSpace(body.Estado) == "" {
		return SendError(c, fiber.StatusBadRequest, "Se requiere {\"estado\": \"...\"}", nil)
	}
	err = pc.repo.CambiarEstadoPedido(c.UserContext(), id, strings.TrimSpace(body.Estado))
	if errors.Is(err, sql.ErrNoRows) {
		return SendError(c, fiber.StatusNotFound, "Pedido no encontrado", nil)
	}
	if err != nil {
		if strings.Contains(err.Error(), "transición inválida") {
			return SendError(c, fiber.StatusBadRequest, err.Error(), nil)
		}
		return dbError(c, err)
	}
	if body.Estado == "cancelado" {
		_ = pc.cache.Delete(c.UserContext(), repository.KeyProductos)
	}
	return c.JSON(fiber.Map{"message": "Estado actualizado", "estado": body.Estado})
}
