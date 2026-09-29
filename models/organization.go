package models

import (
	"time"

	"gorm.io/gorm"
)

type Organization struct {
	ID          string         `gorm:"primaryKey"`
	Name        string         `gorm:"not null;uniqueIndex"`
	Description string
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
}