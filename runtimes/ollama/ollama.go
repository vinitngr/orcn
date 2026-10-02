package ollama

import (
	"errors"
	"strings"

	"orcn/core"
	"orcn/core/logger"
)

var ollamaLog = logger.New("OLLAMA")

// OllamaModelDetails is the user-facing dossier for an Ollama library model.
type OllamaModelDetails struct {
	Name        string   `json:"name"`
	Namespace   string   `json:"namespace"`
	Author      string   `json:"author"`
	Family      string   `json:"family,omitempty"`
	Description string   `json:"description,omitempty"`
	Pulls       int      `json:"pulls,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	Parameters  *float64 `json:"parameters,omitempty"`
}

type OllamaRuntime struct{}

func New() *OllamaRuntime {
	ollamaLog.Info("Ollama runtime ready (live library search, no vendored registry).")
	return &OllamaRuntime{}
}

func (v *OllamaRuntime) GetWorkloadType() string {
	return "model_inference"
}

func (v *OllamaRuntime) Name() string { return "Ollama" }

func (v *OllamaRuntime) SupportedTasks() []core.ModelTask {
	return []core.ModelTask{
		core.TaskTextGeneration,
		core.TaskEmbedding,
		core.TaskMultimodal,
		core.TaskDecision,
	}
}

func (v *OllamaRuntime) SupportedCapabilities() []core.ModelCapability {
	return []core.ModelCapability{
		core.CapabilityTools,
		core.CapabilityThinking,
		core.CapabilityVision,
	}
}

func (v *OllamaRuntime) BuildJobSpec(modelID string, task core.ModelTask, advancedConfig map[string]string) (*core.JobSpec, error) {
	switch core.NormalizeModelTask(task) {
	case core.TaskTextGeneration, core.TaskEmbedding, core.TaskMultimodal, core.TaskDecision:
		// All Ollama-servable tasks deploy the same way: pull + serve.
	default:
		return nil, errors.New("ollama does not support task \"" + string(task) + "\"")
	}
	numParallel := "4"
	if val, ok := advancedConfig["num_parallel"]; ok && val != "" {
		numParallel = val
	}

	contextLength := "4096"
	if val, ok := advancedConfig["context_length"]; ok && val != "" {
		contextLength = val
	}

	image := "ollama/ollama:0.32.5"
	if val, ok := advancedConfig["image"]; ok && val != "" {
		image = val
	}

	return &core.JobSpec{
		Containers: []core.ContainerSpec{
			{
				ID: "ollama-engine",
				Args: core.ContainerArgs{
					Image: image,
					GPU:   true,
					Env: map[string]string{
						"OLLAMA_HOST":              "0.0.0.0:11434",
						"OLLAMA_KEEP_ALIVE":        "-1",
						"OLLAMA_FLASH_ATTENTION":   "1",
						"OLLAMA_MAX_LOADED_MODELS": "1",
						"OLLAMA_NUM_PARALLEL":      numParallel,
						"OLLAMA_CONTEXT_LENGTH":    contextLength,
					},
					Entrypoint: []string{
						"sh",
						"-c",
						"ollama serve & sleep 5 && ollama pull " + modelID + " && wait",
					},
					Expose: []core.ExposeSpec{
						{
							Port: 11434,
							HealthCheck: &core.HealthCheckSpec{
								Path:           "/api/tags",
								ExpectedStatus: 200,
							},
						},
					},
				},
			},
		},
	}, nil
}

func (v *OllamaRuntime) SearchModels(query string, task core.ModelTask, capabilities []string) ([]core.ModelInfo, error) {
	task = core.NormalizeModelTask(task)
	lq, err := taskLibraryQuery(task)
	if err != nil {
		return nil, err
	}
	caps := core.NormalizeCapabilities(capabilities)

	// Strip :tag before searching — ollama.com matches on names, and
	// "gpt-oss:latest" would otherwise return nothing.
	base := stripLibraryTag(query)
	models, err := searchLibrary(base, lq.filters)
	if err != nil {
		return nil, err
	}

	results := make([]core.ModelInfo, 0, len(models))
	parsed := make([]libraryModel, 0, len(models))
	for _, m := range models {
		if !hasAnyTag(m.Tags, lq.matchTags) || !hasAllTags(m.Tags, caps) {
			continue
		}
		parsed = append(parsed, m)
	}
	// Name the model directly and the official entry floats above forks,
	// even across hyphenation differences ("gptoss" finds "gpt-oss").
	parsed = rankLibraryModels(parsed, query)
	// Search missed it entirely (bad relevance, brand-new release): probe
	// the library page for the exact name as a last resort. The probe must
	// pass the same strict task tag check — no pipeline leaks.
	if !hasExactLibraryMatch(parsed, query) && looksLikeModelName(base) {
		if pm, ok := probeLibraryModel(base); ok &&
			hasAnyTag(pm.Tags, lq.matchTags) && hasAllTags(pm.Tags, caps) {
			parsed = append([]libraryModel{pm}, parsed...)
		}
	}
	for _, m := range parsed {
		results = append(results, core.ModelInfo{
			ID:           m.Name,
			Name:         m.Name,
			Author:       libraryAuthor(m),
			Architecture: libraryFamily(m),
			Downloads:    m.Pulls,
			PipelineTag:  string(task),
			Tags:         m.Tags,
			Task:         string(task),
			Parameters:   m.Parameters,
		})
		if len(results) >= maxSearchResults {
			break
		}
	}
	return results, nil
}

func (v *OllamaRuntime) GetModelDetails(modelID string, _ core.ModelTask) (interface{}, error) {
	base := modelID
	if i := strings.Index(base, ":"); i >= 0 {
		base = base[:i]
	}
	base = strings.TrimSpace(base)
	if base == "" {
		return nil, errors.New("missing model name")
	}

	if m, ok := lookupLibraryModel(base); ok {
		return libraryDetails(m), nil
	}
	models, err := searchLibrary(base, nil)
	if err != nil {
		return nil, err
	}
	for _, m := range models {
		if strings.EqualFold(m.Name, base) {
			return libraryDetails(m), nil
		}
	}
	return nil, errors.New("model not found in ollama library; search for the exact library name")
}

func libraryAuthor(m libraryModel) string {
	if m.Namespace == "" || m.Namespace == "library" {
		return "Ollama"
	}
	return m.Namespace
}

func libraryFamily(m libraryModel) string {
	if m.Namespace == "" || m.Namespace == "library" {
		return m.Name
	}
	return m.Namespace
}

func libraryDetails(m libraryModel) OllamaModelDetails {
	details := OllamaModelDetails{
		Name:        m.Name,
		Namespace:   m.Namespace,
		Author:      libraryAuthor(m),
		Family:      libraryFamily(m),
		Description: m.Description,
		Pulls:       m.Pulls,
		Tags:        m.Tags,
	}
	if m.Parameters > 0 {
		params := m.Parameters
		details.Parameters = &params
	}
	return details
}

func (v *OllamaRuntime) GetAdvancedConfigSchema(task core.ModelTask) []core.ConfigOption {
	return []core.ConfigOption{
		{
			Key:         "num_parallel",
			Name:        "Parallel Requests",
			Description: "Maximum number of parallel requests the model can handle simultaneously",
			Type:        "number",
			Default:     "2",
		},
		{
			Key:         "context_length",
			Name:        "Context Length",
			Description: "Maximum context window size (e.g. 4096, 8192). Increasing this uses significantly more VRAM.",
			Type:        "number",
			Default:     "4096",
		},
	}
}
