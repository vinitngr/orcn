package core

type JobSpec struct {
	Version            string             `json:"version"`
	JobName            string             `json:"job_name"`
	Type               string             `json:"type"`
	NodeID             string             `json:"node_id,omitempty"`
	Meta               map[string]any     `json:"meta,omitempty"`
	SystemRequirements SystemRequirements `json:"system_requirements"`
	Volumes            []VolumeSpec       `json:"volumes,omitempty"`
	Containers         []ContainerSpec    `json:"containers"`
}

type SystemRequirements struct {
	MinVRAMGB   int    `json:"min_vram_gb"`
	MinDiskGB   int    `json:"min_disk_gb,omitempty"`
	CUDAVersion string `json:"cuda_version,omitempty"`
}

type VolumeSpec struct {
	Name   string `json:"name"`
	Type   string `json:"type"` // persisted, bind, or docker
	Source string `json:"source,omitempty"`
	SizeGB int    `json:"size_gb"` // provider input; node agents do not provision it
}

type ContainerSpec struct {
	ID   string        `json:"id"`
	Args ContainerArgs `json:"args"`
}

type ContainerArgs struct {
	Image        string            `json:"image"`
	GPU          bool              `json:"gpu"`
	Entrypoint   []string          `json:"entrypoint,omitempty"`
	Cmd          []string          `json:"cmd,omitempty"`
	Env          map[string]string `json:"env,omitempty"`
	VolumeMounts []VolumeMount     `json:"volume_mounts,omitempty"`
	Resources    []ResourceSpec    `json:"resources,omitempty"`
	Expose       []ExposeSpec      `json:"expose,omitempty"`
}

type ResourceSpec struct {
	ID         string         `json:"id,omitempty"`
	Type       string         `json:"type"`
	URL        string         `json:"url,omitempty"`    // Legacy/provider shorthand
	Target     string         `json:"target,omitempty"` // Legacy absolute target
	VolumeName string         `json:"volume_name,omitempty"`
	Path       string         `json:"path,omitempty"` // Relative path in the volume
	Config     map[string]any `json:"config,omitempty"`
	Files      []string       `json:"files,omitempty"`
}

type VolumeMount struct {
	VolumeName string `json:"volume_name"`
	MountPath  string `json:"mount_path"`
	Source     string `json:"-"`
}

type ExposeSpec struct {
	Port        int              `json:"port"`
	Protocol    string           `json:"protocol"` // "http", "tcp"
	IsPublic    bool             `json:"is_public"`
	HealthCheck *HealthCheckSpec `json:"health_check,omitempty"`
}

type HealthCheckSpec struct {
	Path           string `json:"path"`
	ExpectedStatus int    `json:"expected_status"`
	TimeoutSeconds int    `json:"timeout_seconds,omitempty"`
}

type Endpoint struct {
	Port     int    `json:"port"`
	BaseURL  string `json:"base_url"`
	Protocol string `json:"protocol"`
}

type ModelInfo struct {
	ID           string   `json:"ID"`
	Name         string   `json:"Name"`
	Author       string   `json:"Author"`
	Architecture string   `json:"Architecture"`
	Downloads    int      `json:"Downloads"`
	PipelineTag  string   `json:"PipelineTag"`
	Tags         []string `json:"Tags"`
}

type ConfigOption struct {
	Key         string   `json:"key"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Type        string   `json:"type"` // "text", "number", "boolean", "select"
	Default     string   `json:"default"`
	Min         *float64 `json:"min,omitempty"`
	Max         *float64 `json:"max,omitempty"`
	Options     []string `json:"options,omitempty"`
}

type Runtime interface {
	BuildJobSpec(modelID string, advancedConfig map[string]string) (*JobSpec, error)
	GetWorkloadType() string
	SearchModels(query string) ([]ModelInfo, error)
	GetModelDetails(modelID string) (interface{}, error)
	GetAdvancedConfigSchema() []ConfigOption
}

type NodeInfo struct {
	Status    string     `json:"status"`
	Endpoints []Endpoint `json:"endpoints"`
}

type Provider interface {
	GetMarkets() (interface{}, error)
	CreateDeployment(name string, instanceTypeID string, spec *JobSpec) (string, error)
	StartDeployment(deploymentID string) error
	StopDeployment(deploymentID string) error
	UpdateTimeout(deploymentID string, timeoutMinutes int) error
	GetNodeInfo(providerJobID string) (*NodeInfo, error)
}
