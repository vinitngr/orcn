package models

import (
	"time"

	"gorm.io/gorm"
)

type Deployment struct {
	ID               string `gorm:"primaryKey"`
	Name             string `gorm:"not null;uniqueIndex"`
	TemplateID       string `gorm:"index"`
	Status           string `gorm:"default:'DRAFT'"`

	ProviderID       string `gorm:"not null"`

	InstanceName     string
	InstanceTypeID   string

	RuntimeID        string
	ModelID          string
	WorkloadType     string `gorm:"not null;default:'model_inference'"`
	Replicas         int    `gorm:"default:1"`

	ConfidentialMode bool   `gorm:"default:true"`
	JobSpecJSON      string `gorm:"type:text"`

	Nodes            []Node          `gorm:"foreignKey:DeploymentID"`
	Endpoints        []RouteEndpoint `gorm:"foreignKey:DeploymentID"`

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type Node struct {
	ID             string `gorm:"primaryKey"`          // Provider-assigned ID (Nosana deployment ID, AWS instance ID, etc.)
	DeploymentID   string `gorm:"not null;index"`
	ProviderID     string `gorm:"not null"`
	InfraStatus    string `gorm:"default:'PENDING'"`
	AppStatus      string `gorm:"default:'PENDING'"`

	EndpointsJSON  string `gorm:"type:text"`            // JSON array of core.Endpoint
	NodeURL        string                               // Legacy/convenience: primary resolved URL

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}
