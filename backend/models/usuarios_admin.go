package models

import "time"

// UsuarioAdmin fila del listado de usuarios para el administrador (sin password ni token).
type UsuarioAdmin struct {
	ID       int       `json:"id"`
	Nombre   string    `json:"nombre"`
	Email    string    `json:"email"`
	Rol      string    `json:"rol"`
	Activo   bool      `json:"activo"`
	Codigo   string    `json:"codigo"`
	CreadoEn time.Time `json:"creadoEn"`
}
