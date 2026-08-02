package models

import (
	"time"
)

type Registry struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	Name      string    `json:"name"`
	ServerURL string    `json:"server_url"` // e.g. ghcr.io, docker.io
	Username  string    `json:"username"`
	Password  string    `json:"password"` // TODO: We have to add encryption in future for now its text
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
