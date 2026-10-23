// Package middleware: RequireAuth y RequireAdmin sobre JWT.
package middleware

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"multicatalogo-backend/auth"
	"multicatalogo-backend/controllers"
)

// Locals keys usados por RequireAuth y leídos por los controladores.
const (
	LocalUserID = "userID"
	LocalEmail  = "email"
	LocalRol    = "rol"
)

// RequireAuth exige Authorization: Bearer <JWT> válido.
// Si el token es correcto, guarda userID, email y rol en c.Locals.
// 401 si falta el token, está mal formado o está adulterado/expirado.
func RequireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" {
			return controllers.SendError(c, fiber.StatusUnauthorized, "Debes iniciar sesión", nil)
		}
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
			return controllers.SendError(c, fiber.StatusUnauthorized, "Cabecera Authorization inválida", "Se esperaba: Bearer <token>")
		}
		claims, err := auth.Parse(strings.TrimSpace(parts[1]))
		if err != nil {
			return controllers.SendError(c, fiber.StatusUnauthorized, "Sesión inválida o expirada, vuelve a iniciar sesión", nil)
		}
		uid, _ := strconv.Atoi(claims.Subject)
		c.Locals(LocalUserID, uid)
		c.Locals(LocalEmail, claims.Email)
		c.Locals(LocalRol, claims.Rol)
		return c.Next()
	}
}

// RequireAdmin exige que el rol del token sea "admin". Debe usarse DESPUÉS de RequireAuth.
func RequireAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		rol, _ := c.Locals(LocalRol).(string)
		if rol != "admin" {
			return controllers.SendError(c, fiber.StatusForbidden, "Acceso restringido a administradores", nil)
		}
		return c.Next()
	}
}
