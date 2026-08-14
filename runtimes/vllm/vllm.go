package vllm

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"orcn/core"
)

type VLLMRuntime struct{}

func New() *VLLMRuntime { return &VLLMRuntime{} }

func (v *VLLMRuntime) GetWorkloadType() string { return "model_inference" }

func (v *VLLMRuntime) BuildJobSpec(modelID string, task core.ModelTask, config map[string]string) (*core.JobSpec, error) {
	switch normalizeTask(task) {
	case core.TaskTextGeneration:
		return v.buildTextGenerationJobSpec(modelID, config)
	case core.TaskEmbedding:
		return v.buildEmbeddingJobSpec(modelID, config)
	default:
		return nil, fmt.Errorf("vLLM does not support task %q", task)
	}
}

func (v *VLLMRuntime) GetAdvancedConfigSchema(task core.ModelTask) []core.ConfigOption {
	switch normalizeTask(task) {
	case core.TaskTextGeneration:
		return v.textGenerationSchema()
	case core.TaskEmbedding:
		return v.embeddingSchema()
	default:
		return nil
	}
}

const (
	vllmImage       = "docker.io/vllm/vllm-openai:v0.26.0"
	vllmPort        = 9000
	vllmHealthPath  = "/health"
	vllmMinVRAMGB   = 16
	vllmCUDAVersion = "12.9"
)

func (v *VLLMRuntime) buildJobSpec(_ string, command []string, healthPath string) *core.JobSpec {
	return &core.JobSpec{
		Version: "v2",
		Type:    "container",
		SystemRequirements: core.SystemRequirements{
			MinVRAMGB:   vllmMinVRAMGB,
			CUDAVersion: vllmCUDAVersion,
		},
		Containers: []core.ContainerSpec{{
			ID: "ai-master",
			Args: core.ContainerArgs{
				Image:      vllmImage,
				GPU:        true,
				Entrypoint: []string{"python3", "-m", "vllm.entrypoints.openai.api_server"},
				Cmd:        command,
				Env: map[string]string{
					"CUDA_MODULE_LOADING":     "LAZY",
					"PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True",
				},
				Expose: []core.ExposeSpec{{
					Port:     vllmPort,
					Protocol: "http",
					IsPublic: true,
					HealthCheck: &core.HealthCheckSpec{
						Path:           healthPath,
						ExpectedStatus: 200,
						TimeoutSeconds: 10,
					},
				}},
			},
		}},
	}
}

func commonModelArgs(modelID string, config map[string]string) []string {
	return []string{
		"--model", modelID,
		"--served-model-name", modelID,
		"--port", "9000",
		"--trust-remote-code",
		"--gpu-memory-utilization", configValue(config, "gpu_memory_utilization", "0.80"),
	}
}

func configValue(config map[string]string, key, fallback string) string {
	if value, ok := config[key]; ok && value != "" {
		return value
	}
	return fallback
}

func floatPtr(value float64) *float64 { return &value }

type hfModelSearchResult struct {
	ID        string `json:"id"`
	Downloads int    `json:"downloads"`
	Config    struct {
		Architectures []string `json:"architectures"`
	} `json:"config"`
}

type modelRuntimeConfig struct {
	Architectures []string
	Config        map[string]interface{}
}

func fetchModelRuntimeConfig(modelID string) (*modelRuntimeConfig, error) {
	resp, err := http.Get(fmt.Sprintf("https://huggingface.co/api/models/%s", modelID))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("model details failed: %s", resp.Status)
	}

	var model struct {
		Config map[string]interface{} `json:"config"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&model); err != nil {
		return nil, err
	}

	architectures := []string{}
	if values, ok := model.Config["architectures"].([]interface{}); ok {
		for _, value := range values {
			if architecture, ok := value.(string); ok {
				architectures = append(architectures, architecture)
			}
		}
	}
	return &modelRuntimeConfig{Architectures: architectures, Config: model.Config}, nil
}

func modelMaxLength(config map[string]interface{}) int {
	value, ok := firstModelValue(config, "max_position_embeddings", "max_seq_length", "max_sequence_length")
	if !ok {
		return 0
	}

	switch value := value.(type) {
	case float64:
		return int(value)
	case int:
		return value
	case string:
		length, err := strconv.Atoi(value)
		if err == nil {
			return length
		}
	}
	return 0
}

func (v *VLLMRuntime) SearchModels(query string, task core.ModelTask) ([]core.ModelInfo, error) {
	task = normalizeTask(task)
	pipelineTags, architectures, err := taskSearchConfig(task)
	if err != nil {
		return nil, err
	}

	results := make([]core.ModelInfo, 0, len(pipelineTags)*20)
	seen := make(map[string]bool)
	var lastErr error
	for _, pipelineTag := range pipelineTags {
		models, searchErr := searchHuggingFaceModels(query, pipelineTag)
		if searchErr != nil {
			lastErr = searchErr
			continue
		}
		for _, model := range models {
			architecture := firstSupportedArchitecture(model.Config.Architectures, architectures)
			if architecture == "" || !IsVLLMCompatible(model.ID) || seen[model.ID] {
				continue
			}
			seen[model.ID] = true
			results = append(results, core.ModelInfo{
				ID:           model.ID,
				Name:         model.ID,
				Author:       modelAuthor(model.ID),
				Architecture: architecture,
				Downloads:    model.Downloads,
				PipelineTag:  pipelineTag,
				Tags:         []string{architecture},
				Task:         string(task),
			})
		}
	}
	if len(results) == 0 && lastErr != nil {
		return nil, lastErr
	}
	return results, nil
}

func searchHuggingFaceModels(query, pipelineTag string) ([]hfModelSearchResult, error) {
	searchURL := fmt.Sprintf("https://huggingface.co/api/models?search=%s&limit=100&sort=downloads&direction=-1&pipeline_tag=%s&expand=config", url.QueryEscape(query), url.QueryEscape(pipelineTag))
	resp, err := http.Get(searchURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("hugging face search failed for pipeline %q: %s", pipelineTag, resp.Status)
	}

	var models []hfModelSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&models); err != nil {
		return nil, err
	}
	return models, nil
}

func normalizeTask(task core.ModelTask) core.ModelTask {
	return core.NormalizeModelTask(task)
}

func modelAuthor(modelID string) string {
	parts := strings.Split(modelID, "/")
	if len(parts) > 1 {
		return parts[0]
	}
	return ""
}

func firstSupportedArchitecture(candidates []string, supported map[string]bool) string {
	for _, candidate := range candidates {
		if supported[candidate] {
			return candidate
		}
	}
	return ""
}

func IsVLLMCompatible(id string) bool {
	idLower := strings.ToLower(id)
	for _, unsupported := range []string{"mlx", "exl2", "gguf", "ggml", "bnb"} {
		if strings.Contains(idLower, unsupported) {
			return false
		}
	}
	return true
}

func (v *VLLMRuntime) GetModelDetails(modelID string, task core.ModelTask) (interface{}, error) {
	modelURL := fmt.Sprintf("https://huggingface.co/api/models/%s", modelID)
	resp, err := http.Get(modelURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("model not found")
	}

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}
	normalizedTask := normalizeTask(task)
	if normalizedTask == core.TaskEmbedding || normalizedTask == core.TaskTextGeneration {
		enrichModelConfig(modelID, data, normalizedTask)
	}
	if metadata := modelMetadata(data, normalizedTask); len(metadata) > 0 {
		data["metadata"] = metadata
	}
	injectRecommendedParsers(modelID, data)
	return data, nil
}

func modelMetadata(data map[string]interface{}, task core.ModelTask) map[string]interface{} {
	switch task {
	case core.TaskTextGeneration:
		return textGenerationMetadata(data)
	case core.TaskEmbedding:
		return embeddingMetadata(data)
	default:
		return nil
	}
}

func enrichModelConfig(modelID string, data map[string]interface{}, task core.ModelTask) {
	config := map[string]interface{}{}
	if existing, ok := data["config"].(map[string]interface{}); ok {
		config = existing
	}

	loadJSON := func(path string) map[string]interface{} {
		resp, err := http.Get(fmt.Sprintf("https://huggingface.co/%s/raw/main/%s", modelID, path))
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				resp.Body.Close()
			}
			return nil
		}
		defer resp.Body.Close()
		var value map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&value); err != nil {
			return nil
		}
		return value
	}

	if fullConfig := loadJSON("config.json"); fullConfig != nil {
		for key, value := range fullConfig {
			if _, exists := config[key]; !exists {
				config[key] = value
			}
		}
	}
	data["config"] = config

	if task == core.TaskEmbedding && !hasModelValue(config, "embedding_dimension", "sentence_embedding_dimension", "word_embedding_dimension") {
		if pooling := loadJSON("1_Pooling/config.json"); pooling != nil {
			if dimension, exists := pooling["word_embedding_dimension"]; exists {
				config["word_embedding_dimension"] = dimension
			}
			data["pooling_config"] = pooling
		}
	}
}

func hasModelValue(config map[string]interface{}, keys ...string) bool {
	_, ok := firstModelValue(config, keys...)
	return ok
}

func firstModelValue(config map[string]interface{}, keys ...string) (interface{}, bool) {
	for _, key := range keys {
		if value, ok := nestedModelValue(config, key); ok {
			return value, true
		}
	}
	return nil, false
}

func nestedModelValue(config map[string]interface{}, key string) (interface{}, bool) {
	if value, ok := config[key]; ok {
		return value, true
	}
	for _, nestedKey := range []string{"text_config", "sentence_transformers_config", "pooling_config"} {
		if nested, ok := config[nestedKey].(map[string]interface{}); ok {
			if value, exists := nested[key]; exists {
				return value, true
			}
		}
	}
	return nil, false
}
