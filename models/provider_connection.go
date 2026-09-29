package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProviderConnection struct {
	ID                string         `gorm:"primaryKey"`
	OrganizationID    string         `gorm:"not null;default:'00000000-0000-0000-0000-000000000001';index;uniqueIndex:idx_org_name"`
	Provider          string         `gorm:"not null;size:50"`
	Name              string         `gorm:"not null;size:100;uniqueIndex:idx_org_name"`
	Status            string         `gorm:"default:'pending';size:20"`
	Config            string         `gorm:"type:jsonb"`
	CredentialSecretID *string       `gorm:"index"`
	CreatedAt         time.Time
	UpdatedAt         time.Time
	DeletedAt         gorm.DeletedAt `gorm:"index"`
}

func (pc *ProviderConnection) BeforeCreate(tx *gorm.DB) error {
	if pc.ID == "" {
		pc.ID = uuid.New().String()
	}
	return nil
}