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
	Task         string   `json:"Task,omitempty"`
	Parameters   float64  `json:"Parameters,omitempty"` // parameter count in billions
}

type ModelTask string

const (
	TaskTextGeneration ModelTask = "text-generation"
	TaskEmbedding      ModelTask = "embedding"
	TaskScore          ModelTask = "score"
	TaskMultimodal     ModelTask = "multimodal"
)

func NormalizeModelTask(task ModelTask) ModelTask {
	if task == "" || task == "text-to-text" {
		return TaskTextGeneration
	}
	return task
}

// ModelTaskInfo is the canonical, user-facing description of a model task.
// It is the single source of truth for task labels exposed to clients.
type ModelTaskInfo struct {
	ID          ModelTask `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
}

var modelTaskCatalog = []ModelTaskInfo{
	{ID: TaskTextGeneration, Name: "Text Generation", Description: "Autoregressive chat and completion models."},
	{ID: TaskMultimodal, Name: "Multimodal", Description: "Models that accept image, video or audio alongside text."},
	{ID: TaskEmbedding, Name: "Embedding", Description: "Models that turn text into dense vector representations."},
	{ID: TaskScore, Name: "Reranker", Description: "Cross-encoder models that score query-document pairs."},
}

// ModelTasks returns the full task catalog in display order.
func ModelTasks() []ModelTaskInfo {
	tasks := make([]ModelTaskInfo, len(modelTaskCatalog))
	copy(tasks, modelTaskCatalog)
	return tasks
}

// GetModelTaskInfo looks up the catalog entry for a task.
func GetModelTaskInfo(task ModelTask) (ModelTaskInfo, bool) {
	for _, info := range modelTaskCatalog {
		if info.ID == task {
			return info, true
		}
	}
	return ModelTaskInfo{}, false
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

// ProviderField describes one input a provider needs to establish a connection.
// It is the single source of truth for the connection form rendered by clients.
type ProviderField struct {
	Key         string   `json:"key"`
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
	// Type is one of: text, password, number, boolean, select, file.
	Type string `json:"type"`
	// Required marks the field as mandatory; clients must enforce this.
	Required bool `json:"required"`
	// Secret marks the value as sensitive. Secrets are encrypted at rest;
	// non-secret values are stored as raw provider config.
	Secret      bool     `json:"secret"`
	Default     string   `json:"default,omitempty"`
	Placeholder string   `json:"placeholder,omitempty"`
	Options     []string `json:"options,omitempty"`
}

// ProviderConnectionConfig is the provider-processed result of raw user input.
// Config is stored as-is; Secret is encrypted at rest.
type ProviderConnectionConfig struct {
	Config map[string]any `json:"config"`
	Secret map[string]any `json:"secret"`
}


type Runtime interface {
	// Name is the human-readable runtime name shown in clients (e.g. "vLLM").
	Name() string
	// SupportedTasks lists the model tasks this runtime can serve.
	SupportedTasks() []ModelTask
	BuildJobSpec(modelID string, task ModelTask, advancedConfig map[string]string) (*JobSpec, error)
	GetWorkloadType() string
	SearchModels(query string, task ModelTask) ([]ModelInfo, error)
	GetModelDetails(modelID string, task ModelTask) (interface{}, error)
	GetAdvancedConfigSchema(task ModelTask) []ConfigOption
}

type NodeInfo struct {
	Status    string     `json:"status"`
	Endpoints []Endpoint `json:"endpoints"`
}

type Provider interface {
	GetInstanceTypes() (interface{}, error)
	CreateDeployment(name string, instanceTypeID string, spec *JobSpec) (string, error)
	StartDeployment(deploymentID string) error
	StopDeployment(deploymentID string) error
	UpdateTimeout(deploymentID string, timeoutMinutes int) error
	GetNodeInfo(providerJobID string) (*NodeInfo, error)

	// ConnectionSchema returns the fields a user must supply to connect this provider.
	ConnectionSchema() []ProviderField
	// ProcessConnection splits raw user input into raw config and secret material.
	// Providers use this to transform/validate uploaded files or derived values.
	ProcessConnection(raw map[string]any) (*ProviderConnectionConfig, error)
	// VerifyConnection checks the supplied credentials against the provider.
	VerifyConnection(cfg *ProviderConnectionConfig) error
	// WithConfig returns a provider instance bound to the given connection
	// credentials. The registered provider is treated as a template; callers
	// must use the returned instance for credential-scoped operations.
	WithConfig(cfg *ProviderConnectionConfig) (Provider, error)
}
