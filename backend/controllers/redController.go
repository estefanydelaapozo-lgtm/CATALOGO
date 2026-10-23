package controllers

import (
	"net/mail"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/repository"
)

// RedController recibe el repositorio y el caché por constructor.
type RedController struct {
	repo  repository.DBRepository
	cache repository.CacheRepository
}

func NewRedController(repo repository.DBRepository, cache repository.CacheRepository) *RedController {
	return &RedController{repo: repo, cache: cache}
}

// GetRed devuelve el árbol multinivel de referidos (200), leído con Cache-Aside.
//
// Parámetro opcional ?email=usuario@dominio: define la clave de caché red:tree:{email}.
// Sin parámetro se usa la red global (red:tree:global), por lo que la ruta existente
// /api/red sigue funcionando exactamente igual.
//
//	400 -> el email, si se envía, no tiene un formato válido
//	500 -> falla de la base de datos
func (rc *RedController) GetRed(c *fiber.Ctx) error {
	email := strings.ToLower(strings.TrimSpace(c.Query("email")))
	if email != "" {
		// Evita claves arbitrarias en Redis: debe ser una dirección simple "a@b.c".
		if addr, err := mail.ParseAddress(email); err != nil || addr.Address != email {
			return SendError(c, fiber.StatusBadRequest, "El formato del email no es válido",
				map[string]string{"email": c.Query("email")})
		}
	}

	red, hit, err := repository.CacheAside(c.UserContext(), rc.cache,
		repository.KeyRed(email), repository.TTLRed, rc.repo.GetRed)
	if err != nil {
		return dbError(c, err)
	}
	setCacheHeader(c, hit)
	return c.JSON(red)
}
