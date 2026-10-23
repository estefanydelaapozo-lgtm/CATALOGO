package controllers

import (
	"database/sql"
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/repository"
)

// MLMController red propia, comisiones y liquidaciones.
type MLMController struct {
	repo repository.DBRepository
}

func NewMLMController(repo repository.DBRepository) *MLMController {
	return &MLMController{repo: repo}
}

func (m *MLMController) referidoDelToken(c *fiber.Ctx) (int, error) {
	uid, _ := c.Locals("userID").(int)
	u, ok, err := m.repo.GetUsuarioByID(c.UserContext(), uid)
	if err != nil {
		return 0, err
	}
	if !ok || u.ReferidoID == nil {
		return 0, sql.ErrNoRows
	}
	return *u.ReferidoID, nil
}

// RedMia GET /api/red/mia
func (m *MLMController) RedMia(c *fiber.Ctx) error {
	refID, err := m.referidoDelToken(c)
	if errors.Is(err, sql.ErrNoRows) {
		return SendError(c, fiber.StatusNotFound, "No tienes nodo en la red", nil)
	}
	if err != nil {
		return dbError(c, err)
	}
	arbol, err := m.repo.GetRedDesde(c.UserContext(), refID)
	if err != nil {
		return dbError(c, err)
	}
	codigo, _ := m.repo.GetCodigoReferido(c.UserContext(), refID)
	return c.JSON(fiber.Map{"red": arbol, "codigo": codigo, "link": "/registro?ref=" + codigo})
}

// ComisionesMias GET /api/comisiones/mias
func (m *MLMController) ComisionesMias(c *fiber.Ctx) error {
	refID, err := m.referidoDelToken(c)
	if errors.Is(err, sql.ErrNoRows) {
		return c.JSON(fiber.Map{"items": []any{}, "pendiente": 0, "pagado": 0, "total": 0})
	}
	if err != nil {
		return dbError(c, err)
	}
	res, err := m.repo.ListComisionesMias(c.UserContext(), refID)
	if err != nil {
		return dbError(c, err)
	}
	return c.JSON(res)
}

// Liquidar POST /api/liquidaciones {referido_id}
func (m *MLMController) Liquidar(c *fiber.Ctx) error {
	var body struct {
		ReferidoID int `json:"referido_id"`
	}
	if err := c.BodyParser(&body); err != nil || body.ReferidoID < 1 {
		return SendError(c, fiber.StatusBadRequest, "Se requiere {\"referido_id\": N}", nil)
	}
	liq, err := m.repo.CrearLiquidacion(c.UserContext(), body.ReferidoID)
	if err != nil {
		if strings.Contains(err.Error(), "no hay comisiones") {
			return SendError(c, fiber.StatusBadRequest, err.Error(), nil)
		}
		return dbError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(liq)
}

// LiquidacionesAdmin GET /api/liquidaciones
func (m *MLMController) LiquidacionesAdmin(c *fiber.Ctx) error {
	list, err := m.repo.ListLiquidacionesAdmin(c.UserContext())
	if err != nil {
		return dbError(c, err)
	}
	return c.JSON(list)
}

// LiquidacionesMias GET /api/liquidaciones/mias
func (m *MLMController) LiquidacionesMias(c *fiber.Ctx) error {
	refID, err := m.referidoDelToken(c)
	if errors.Is(err, sql.ErrNoRows) {
		return c.JSON([]any{})
	}
	if err != nil {
		return dbError(c, err)
	}
	list, err := m.repo.ListLiquidacionesMias(c.UserContext(), refID)
	if err != nil {
		return dbError(c, err)
	}
	return c.JSON(list)
}

// Deudas GET /api/reportes/comisiones-pendientes
func (m *MLMController) Deudas(c *fiber.Ctx) error {
	list, err := m.repo.ListDeudasPendientes(c.UserContext())
	if err != nil {
		return dbError(c, err)
	}
	return c.JSON(list)
}

// --- Reportes ---

type ReportesController struct {
	repo repository.DBRepository
}

func NewReportesController(repo repository.DBRepository) *ReportesController {
	return &ReportesController{repo: repo}
}

func (rc *ReportesController) Resumen(c *fiber.Ctx) error {
	desde, hasta := parseRango(c)
	res, err := rc.repo.ResumenVentas(c.UserContext(), desde, hasta)
	if err != nil {
		return dbError(c, err)
	}
	return c.JSON(res)
}

func (rc *ReportesController) TopProductos(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	list, err := rc.repo.TopProductos(c.UserContext(), limit)
	if err != nil {
		return dbError(c, err)
	}
	return c.JSON(list)
}

func (rc *ReportesController) TopReferidos(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	list, err := rc.repo.TopReferidos(c.UserContext(), limit)
	if err != nil {
		return dbError(c, err)
	}
	return c.JSON(list)
}
