package models

import (
	"time"

	"gorm.io/gorm"
)

type Secret struct {
	ID               string         `gorm:"primaryKey"`
	OrganizationID   string         `gorm:"not null;default:'00000000-0000-0000-0000-000000000001';index"`
	Name             string         `gorm:"not null;size:100"`
	Description      string
	Type             string         `gorm:"size:50"`
	Ciphertext       string         `gorm:"type:text"`
	EncryptedDEK     string         `gorm:"type:text"`
	Nonce            string         `gorm:"size:32"`
	KeyVersion       string         `gorm:"size:20"`
	Metadata         string         `gorm:"type:jsonb"`
	CreatedBy        string         `gorm:"not null;default:''"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        gorm.DeletedAt `gorm:"index"`
}