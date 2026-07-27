package models

import "gorm.io/gorm"

type Job struct {
	gorm.Model
	ID           string `gorm:"primaryKey"`
	DeploymentID string `gorm:"index;not null"`
	Status       string `gorm:"default:'QUEUED'"` // QUEUED, RUNNING, HEALTHY, UNHEALTHY, COMPLETED, FAILED
	Endpoints    string `gorm:"type:json"`
}

type Endpoint struct {
	Port     int    `json:"port"`
	Protocol string `json:"protocol"`
	URL      string `json:"url"`
	Healthy  bool   `json:"healthy"`
}
