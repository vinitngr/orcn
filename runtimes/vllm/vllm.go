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
	case core.TaskTextGeneration, core.TaskMultimodal:
		return v.buildTextGenerationJobSpec(modelID, config)
	case core.TaskEmbedding:
		return v.buildEmbeddingJobSpec(modelID, config)
	case core.TaskScore:
		return v.buildScoreJobSpec(modelID, config)
	default:
		return nil, fmt.Errorf("vLLM does not support task %q", task)
	}
}

func (v *VLLMRuntime) GetAdvancedConfigSchema(task core.ModelTask) []core.ConfigOption {
	switch normalizeTask(task) {
	case core.TaskTextGeneration, core.TaskMultimodal:
		return v.textGenerationSchema()
	case core.TaskEmbedding:
		return v.embeddingSchema()
	case core.TaskScore:
		return v.scoreSchema()
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

func (v *VLLMRuntime) buildJobSpec(_ string, entrypoint []string, command []string, healthPath string) *core.JobSpec {
	return &core.JobSpec{
		Version: "v2",
		Type:    "container",
		SystemRequirements: core.SystemRequirements{
			MinVRAMGB:   vllmMinVRAMGB,
			CUDAVersion: vllmCUDAVersion,
		},
		Containers: []core.ContainerSpec{{
			ID: "vllm-inference-server",
			Args: core.ContainerArgs{
				Image:      vllmImage,
				GPU:        true,
				Entrypoint: entrypoint,
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

func resolveEntrypoint(modelID string) []string {
	if config, err := fetchModelRuntimeConfig(modelID); err == nil {
		if config.PipelineTag == "audio-text-to-text" || config.PipelineTag == "automatic-speech-recognition" {
			return []string{
				"/bin/bash",
				"-c",
				"pip install \"vllm[audio]\" && exec python3 -m vllm.entrypoints.openai.api_server \"$@\"",
				"--",
			}
		}
	}
	return []string{"python3", "-m", "vllm.entrypoints.openai.api_server"}
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
	PipelineTag   string
	Config        map[string]any
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
		Config      map[string]any `json:"config"`
		PipelineTag string         `json:"pipeline_tag"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&model); err != nil {
		return nil, err
	}

	architectures := []string{}
	if values, ok := model.Config["architectures"].([]any); ok {
		for _, value := range values {
			if architecture, ok := value.(string); ok {
				architectures = append(architectures, architecture)
			}
		}
	}
	return &modelRuntimeConfig{Architectures: architectures, PipelineTag: model.PipelineTag, Config: model.Config}, nil
}

func modelMaxLength(config map[string]any) int {
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

func (v *VLLMRuntime) GetModelDetails(modelID string, task core.ModelTask) (any, error) {
	modelURL := fmt.Sprintf("https://huggingface.co/api/models/%s", modelID)
	resp, err := http.Get(modelURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("model not found")
	}

	var data map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}
	normalizedTask := normalizeTask(task)
	if normalizedTask == core.TaskEmbedding || normalizedTask == core.TaskTextGeneration || normalizedTask == core.TaskScore || normalizedTask == core.TaskMultimodal {
		enrichModelConfig(modelID, data, normalizedTask)
	}
	if metadata := modelMetadata(data, normalizedTask); len(metadata) > 0 {
		data["metadata"] = metadata
	}
	injectRecommendedParsers(modelID, data)
	return data, nil
}

func modelMetadata(data map[string]any, task core.ModelTask) map[string]any {
	switch task {
	case core.TaskTextGeneration, core.TaskMultimodal:
		return textGenerationMetadata(data, task)
	case core.TaskEmbedding:
		return embeddingMetadata(data)
	case core.TaskScore:
		return scoreMetadata(data)
	default:
		return nil
	}
}

func enrichModelConfig(modelID string, data map[string]any, task core.ModelTask) {
	config := map[string]any{}
	if existing, ok := data["config"].(map[string]any); ok {
		config = existing
	}

	loadJSON := func(path string) map[string]any {
		resp, err := http.Get(fmt.Sprintf("https://huggingface.co/%s/raw/main/%s", modelID, path))
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				resp.Body.Close()
			}
			return nil
		}
		defer resp.Body.Close()
		var value map[string]any
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

func hasModelValue(config map[string]any, keys ...string) bool {
	_, ok := firstModelValue(config, keys...)
	return ok
}

func firstModelValue(config map[string]any, keys ...string) (any, bool) {
	for _, key := range keys {
		if value, ok := nestedModelValue(config, key); ok {
			return value, true
		}
	}
	return nil, false
}

func nestedModelValue(config map[string]any, key string) (any, bool) {
	if value, ok := config[key]; ok {
		return value, true
	}
	for _, nestedKey := range []string{"text_config", "sentence_transformers_config", "pooling_config"} {
		if nested, ok := config[nestedKey].(map[string]any); ok {
			if value, exists := nested[key]; exists {
				return value, true
			}
		}
	}
	return nil, false
}