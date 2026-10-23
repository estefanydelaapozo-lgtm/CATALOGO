package controllers

import (
	"errors"
	"net/mail"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/auth"
	"multicatalogo-backend/models"
	"multicatalogo-backend/repository"
)

// RegisterController maneja el alta de clientes.
type RegisterController struct {
	repo repository.DBRepository
}

func NewRegisterController(repo repository.DBRepository) *RegisterController {
	return &RegisterController{repo: repo}
}

// Register POST /api/register
func (rc *RegisterController) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo de petición inválido", nil)
	}
	req.Nombre = strings.TrimSpace(req.Nombre)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Ref = strings.TrimSpace(req.Ref)

	problemas := map[string]string{}
	if req.Nombre == "" {
		problemas["nombre"] = "El nombre es obligatorio"
	}
	if req.Email == "" {
		problemas["email"] = "El email es obligatorio"
	} else if _, err := mail.ParseAddress(req.Email); err != nil {
		problemas["email"] = "El formato del email no es válido"
	}
	if len(req.Password) < 6 {
		problemas["password"] = "La contraseña debe tener al menos 6 caracteres"
	}
	if len(problemas) > 0 {
		return SendError(c, fiber.StatusBadRequest, "Datos de registro inválidos", problemas)
	}

	u, err := rc.repo.RegistrarUsuario(c.UserContext(), req.Nombre, req.Email, req.Password, req.Ref)
	if err != nil {
		if errors.Is(err, repository.ErrEmailDuplicado) {
			return SendError(c, fiber.StatusConflict, "El email ya está registrado", nil)
		}
		if errors.Is(err, repository.ErrRefInvalido) {
			return SendError(c, fiber.StatusBadRequest, "El código de referido no existe", nil)
		}
		return dbError(c, err)
	}

	token, err := auth.Generate(u.ID, u.Email, u.Rol)
	if err != nil {
		return SendError(c, fiber.StatusInternalServerError, "Cuenta creada pero no se pudo emitir el token", nil)
	}
	return c.Status(fiber.StatusCreated).JSON(models.LoginResponse{Token: token, Email: u.Email, Rol: u.Rol})
}
