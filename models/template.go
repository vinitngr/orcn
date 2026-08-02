package models

import (
	"time"
)

type Template struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	Name        string    `json:"name"`
	ComputeType string    `json:"computeType"`
	Image       string    `json:"image"`
	Data        string    `json:"data"` // JSON string containing all other fields
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
