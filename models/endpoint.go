package models

import (
	"time"
)

type EndpointType string

const (
	EndpointTypeDeployment EndpointType = "deployment"
	EndpointTypeNode       EndpointType = "node"
)

type RouteEndpoint struct {
	ID           string       `gorm:"primaryKey" json:"id"`
	Subdomain    string       `gorm:"uniqueIndex" json:"subdomain"` // e.g. "n8n", "n8n-5678", "a7f9b2c"
	TargetPort   int          `json:"target_port"`
	Type         EndpointType `json:"type"`
	DeploymentID string       `json:"deployment_id"` 
	NodeID       string       `json:"node_id"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
}
