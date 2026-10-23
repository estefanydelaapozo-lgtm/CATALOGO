// Package auth: generación y validación de JWT (HS256).
package auth

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const defaultTTL = 2 * time.Hour

// Claims son los claims estándar del token MultiCatálogo.
// sub = id de usuario (string), email y rol para autorización sin ir a la BD.
type Claims struct {
	Email string `json:"email"`
	Rol   string `json:"rol"`
	jwt.RegisteredClaims
}

// Secret lee JWT_SECRET del entorno. Si está vacío, usa un valor de desarrollo
// (solo para demos locales; en producción debe estar definido).
func Secret() string {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		s = "dev-secret-cambiar-en-produccion-multicatalogo"
	}
	return s
}

// Generate emite un JWT HS256 con claims {sub, email, rol, iat, exp} (TTL 2h).
func Generate(userID int, email, rol string) (string, error) {
	now := time.Now()
	claims := Claims{
		Email: email,
		Rol:   rol,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", userID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(defaultTTL)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(Secret()))
}

// Parse valida la firma y la expiración. Devuelve los claims o error.
func Parse(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("algoritmo inesperado: %v", t.Header["alg"])
		}
		return []byte(Secret()), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("token inválido")
	}
	return claims, nil
}
