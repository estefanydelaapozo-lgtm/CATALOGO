// Paquete controllers: lógica HTTP (request/response). No contiene datos, los pide al repository.
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

// AuthController depende de la INTERFAZ DBRepository (inyección de dependencias).
type AuthController struct {
	repo repository.DBRepository
}

func NewAuthController(repo repository.DBRepository) *AuthController {
	return &AuthController{repo: repo}
}

// Login valida la entrada y autentica contra el repositorio.
//
//	400 -> JSON inválido o campos vacíos / email mal formado
//	401 -> credenciales incorrectas
//	500 -> falla de la base de datos
//	200 -> {token, email, rol}  (token = JWT HS256 real, TTL 2h)
func (a *AuthController) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return SendError(c, fiber.StatusBadRequest, "Cuerpo de petición inválido", "Se esperaba un JSON con email y password")
	}

	req.Email = strings.TrimSpace(req.Email)

	// Validación explícita de campos, acumulando todos los problemas encontrados.
	problemas := map[string]string{}
	if req.Email == "" {
		problemas["email"] = "El email es obligatorio"
	} else if _, err := mail.ParseAddress(req.Email); err != nil {
		problemas["email"] = "El formato del email no es válido"
	}
	if req.Password == "" {
		problemas["password"] = "La contraseña es obligatoria"
	}
	if len(problemas) > 0 {
		return SendError(c, fiber.StatusBadRequest, "Datos de inicio de sesión inválidos", problemas)
	}

	usuario, ok, err := a.repo.FindUsuario(c.UserContext(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, repository.ErrCuentaDesactivada) {
			return SendError(c, fiber.StatusForbidden, "Cuenta desactivada", nil)
		}
		return dbError(c, err)
	}
	if !ok {
		return SendError(c, fiber.StatusUnauthorized, "Credenciales incorrectas", nil)
	}

	token, err := auth.Generate(usuario.ID, usuario.Email, usuario.Rol)
	if err != nil {
		return SendError(c, fiber.StatusInternalServerError, "No se pudo generar el token de sesión", nil)
	}

	return c.JSON(models.LoginResponse{Token: token, Email: usuario.Email, Rol: usuario.Rol})
}
