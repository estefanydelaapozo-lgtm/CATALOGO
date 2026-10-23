package controllers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// UsuariosAdminController listado de usuarios para el administrador.
type UsuariosAdminController struct {
	repo repository.UsuariosAdminRepository
}

func NewUsuariosAdminController(repo repository.UsuariosAdminRepository) *UsuariosAdminController {
	return &UsuariosAdminController{repo: repo}
}

// List responde GET /api/admin/usuarios?q=&page=&limit=
func (u *UsuariosAdminController) List(c *fiber.Ctx) error {
	q := strings.TrimSpace(c.Query("q"))
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	data, total, err := u.repo.ListUsuariosAdmin(c.UserContext(), q, page, limit)
	if err != nil {
		return dbError(c, err)
	}
	return c.JSON(models.Pagina[models.UsuarioAdmin]{Data: data, Page: page, Limit: limit, Total: total})
}
