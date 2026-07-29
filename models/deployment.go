package models

import "gorm.io/gorm"

type Deployment struct {
	gorm.Model
	ID               string `gorm:"primaryKey"`
	Name             string `gorm:"not null;uniqueIndex"`
	Status           string `gorm:"default:'DRAFT'"`

	ProviderID       string `gorm:"not null"`
	MarketID         string `gorm:"not null"`

	RuntimeID        string `gorm:"not null"`
	ModelID          string
	WorkloadType     string `gorm:"not null;default:'model_inference'"`
	Replicas         int    `gorm:"default:1"`

	ConfidentialMode bool   `gorm:"default:true"`
	JobSpecJSON      string `gorm:"type:text"`

	Nodes            []Node `gorm:"foreignKey:DeploymentID"`
}

type Node struct {
	gorm.Model
	ID             string `gorm:"primaryKey"`          // Provider-assigned ID (Nosana deployment ID, AWS instance ID, etc.)
	DeploymentID   string `gorm:"not null;index"`      // FK to Deployment
	ProviderID     string `gorm:"not null"`             // e.g., "nosana", "aws"
	Status         string `gorm:"default:'PENDING'"`

	EndpointsJSON  string `gorm:"type:text"`            // JSON array of core.Endpoint
	NodeURL        string                               // Legacy/convenience: primary resolved URL
}
