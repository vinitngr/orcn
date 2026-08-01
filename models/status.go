package models

const (
	DeploymentDraft      = "DRAFT"
	DeploymentPending    = "PENDING"
	DeploymentRunning    = "RUNNING"
	DeploymentReady      = "READY"
	DeploymentPartial    = "PARTIAL"
	DeploymentStopping   = "STOPPING"
	DeploymentStopped    = "STOPPED"
	DeploymentError      = "ERROR"
)

const (
	InfraPending = "PENDING"
	InfraRunning = "RUNNING"
	InfraError   = "ERROR"
)

const (
	AppPending  = "PENDING"
	AppStarting = "STARTING"
	AppReady    = "READY"
	AppDraining = "DRAINING"
	AppError    = "ERROR"
)
