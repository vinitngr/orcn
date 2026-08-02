package models

import (
	"time"
)

type Secret struct {
	Name        string    `gorm:"primaryKey" json:"name"`
	Value       string    `json:"value"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
