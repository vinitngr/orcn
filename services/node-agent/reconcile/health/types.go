package health

import (
	"time"
)

// Status represents the operational health status.
type Status string

const (
	StatusHealthy   Status = "healthy"
	StatusDegraded  Status = "degraded"
	StatusUnhealthy Status = "unhealthy"
	StatusDown      Status = "down"
	StatusStarting  Status = "starting"
	StatusUnknown   Status = "unknown"
)

// ContainerHealth captures the latest in-memory health state of a single container.
type ContainerHealth struct {
	ContainerID          string    `json:"container_id"`
	DeploymentName       string    `json:"deployment_name"`
	Status               Status    `json:"status"`
	IsReady              bool      `json:"is_ready"`
	ConsecutiveFailures  int       `json:"consecutive_failures"`
	ConsecutiveSuccesses int       `json:"consecutive_successes"`
	LastCheckedAt        time.Time `json:"last_checked_at"`
	LastTransitionAt     time.Time `json:"last_transition_at"`
	LastStatusCode       int       `json:"last_status_code,omitempty"`
	LastLatencyMs        int64     `json:"last_latency_ms,omitempty"`
	LastError            string    `json:"last_error,omitempty"`
	ExitCode             *int      `json:"exit_code,omitempty"`
	HasProbe             bool      `json:"has_probe"`
}

// DeploymentHealth captures the aggregated health status of a deployment.
type DeploymentHealth struct {
	DeploymentName      string                      `json:"deployment_name"`
	Status              Status                      `json:"status"`
	TotalContainers     int                         `json:"total_containers"`
	HealthyContainers   int                         `json:"healthy_containers"`
	DegradedContainers  int                         `json:"degraded_containers"`
	UnhealthyContainers int                         `json:"unhealthy_containers"`
	Containers          map[string]*ContainerHealth `json:"containers"`
	LastCheckedAt       time.Time                   `json:"last_checked_at"`
}

// NodeHealthSummary is the complete node-level health snapshot.
type NodeHealthSummary struct {
	Status              Status                       `json:"status"`
	TotalDeployments    int                          `json:"total_deployments"`
	TotalContainers     int                          `json:"total_containers"`
	HealthyContainers   int                          `json:"healthy_containers"`
	DegradedContainers  int                          `json:"degraded_containers"`
	UnhealthyContainers int                          `json:"unhealthy_containers"`
	Deployments         map[string]*DeploymentHealth `json:"deployments"`
	Timestamp           time.Time                    `json:"timestamp"`
}
