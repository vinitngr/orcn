package ollama

import (
	_ "embed"
	"encoding/json"
	"errors"
	"strings"

	"orcn/core"
	"orcn/core/logger"
)

var ollamaLog = logger.New("OLLAMA")

//go:embed models.json
var modelsJSON []byte

type OllamaModelDetails struct {
	Family       string   `json:"family"`
	Name         string   `json:"name"`
	Parameters   *float64 `json:"parameters"`
	Quantization *string  `json:"quantization"`
}

type OllamaFamily struct {
	Family string               `json:"family"`
	Models []OllamaModelDetails `json:"models"`
}

type OllamaRuntime struct {
	families []OllamaFamily
	modelMap map[string]OllamaModelDetails
}

func New() *OllamaRuntime {
	var families []OllamaFamily
	if err := json.Unmarshal(modelsJSON, &families); err != nil {
		ollamaLog.Error("Error loading Ollama models JSON: %v", err)
	}

	modelMap := make(map[string]OllamaModelDetails)
	for _, f := range families {
		for _, m := range f.Models {
			m.Family = f.Family
			modelMap[m.Name] = m
		}
	}

	ollamaLog.Info("Successfully loaded %d model families containing %d total variants.", len(families), len(modelMap))

	return &OllamaRuntime{
		families: families,
		modelMap: modelMap,
	}
}

func (v *OllamaRuntime) GetWorkloadType() string {
	return "model_inference"
}

func (v *OllamaRuntime) BuildJobSpec(modelID string, task core.ModelTask, advancedConfig map[string]string) (*core.JobSpec, error) {
	if task = core.NormalizeModelTask(task); task != core.TaskTextGeneration {
		return nil, errors.New("ollama supports only text-generation models")
	}
	numParallel := "4"
	if val, ok := advancedConfig["num_parallel"]; ok && val != "" {
		numParallel = val
	}

	contextLength := "4096"
	if val, ok := advancedConfig["context_length"]; ok && val != "" {
		contextLength = val
	}

	return &core.JobSpec{
		Containers: []core.ContainerSpec{
			{
				ID: "ollama-engine",
				Args: core.ContainerArgs{
					Image: "ollama/ollama:0.32.5",
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

func (v *OllamaRuntime) SearchModels(query string, task core.ModelTask) ([]core.ModelInfo, error) {
	if task = core.NormalizeModelTask(task); task != core.TaskTextGeneration {
		return nil, errors.New("ollama supports only text-generation models")
	}
	var results []core.ModelInfo
	q := strings.ToLower(query)

	count := 0
	for _, m := range v.modelMap {
		if q == "" || strings.Contains(strings.ToLower(m.Name), q) || strings.Contains(strings.ToLower(m.Family), q) {
			var tags []string
			if m.Quantization != nil {
				tags = append(tags, *m.Quantization)
			}

			results = append(results, core.ModelInfo{
				ID:           m.Name,
				Name:         m.Name,
				Author:       "Ollama",
				Architecture: m.Family,
				PipelineTag:  "text-generation",
				Tags:         tags,
				Task:         string(core.TaskTextGeneration),
			})
			count++
			if count > 50 {
				break
			}
		}
	}

	return results, nil
}

func (v *OllamaRuntime) GetModelDetails(modelID string, _ core.ModelTask) (interface{}, error) {
	if details, ok := v.modelMap[modelID]; ok {
		return details, nil
	}

	if modelID == "" || modelID == "all" {
		return v.families, nil
	}

	return nil, errors.New("model not found in ollama registry")
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
