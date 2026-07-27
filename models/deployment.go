package models

import "gorm.io/gorm"

type Deployment struct {
	gorm.Model
	ID               string `gorm:"primaryKey"`
	Name             string `gorm:"not null"`
	Status           string `gorm:"default:'DRAFT'"`
	
	ProviderID       string `gorm:"not null"`
	MarketID         string `gorm:"not null"`
	
	RuntimeID        string `gorm:"not null"`
	ModelID          string
	WorkloadType     string `gorm:"not null;default:'model_inference'"`
	Replicas         int    `gorm:"default:1"`
	
	NodeURL          string
	ActiveJobs       int    `gorm:"default:0"`
	
	TimeoutMinutes   int    `gorm:"default:60"`
	ConfidentialMode bool   `gorm:"default:true"`
}
