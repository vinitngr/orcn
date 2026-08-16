package vllm

import (
	_ "embed"
	"encoding/json"
	"fmt"

	"orcn/core"
)

type modelRegistry struct {
	TextGeneration         []string `json:"text_generation"`
	Embedding              []string `json:"embedding"`
	LateInteraction        []string `json:"late_interaction"`
	Reward                 []string `json:"reward"`
	TokenClassification    []string `json:"token_classification"`
	SequenceClassification []string `json:"sequence_classification"`
	Multimodal             []string `json:"multimodal"`
	SpeculativeDecoding    []string `json:"speculative_decoding"`
	TransformersSupported  []string `json:"transformers_supported"`
	TransformersBackend    []string `json:"transformers_backend"`
}

//go:embed compatibility/registry.json
var modelRegistryData []byte

var registry = loadModelRegistry()

func loadModelRegistry() modelRegistry {
	var value modelRegistry
	if err := json.Unmarshal(modelRegistryData, &value); err != nil {
		panic(fmt.Sprintf("invalid vLLM registry data: %v", err))
	}
	return value
}

func taskSearchConfig(task core.ModelTask) ([]string, map[string]bool, error) {
	var pipelineTags []string
	var architectures []string

	switch task {
	case core.TaskTextGeneration:
		pipelineTags = []string{"text-generation"}
		architectures = registry.TextGeneration
	case core.TaskEmbedding:
		pipelineTags = []string{"feature-extraction", "sentence-similarity"}
		architectures = append(registry.Embedding, registry.TextGeneration...)
	case core.TaskScore:
		pipelineTags = []string{"text-classification", "text-ranking"}
		architectures = append(registry.SequenceClassification, registry.Reward...)
		architectures = append(architectures, registry.LateInteraction...)
		architectures = append(architectures, registry.TextGeneration...)
	case core.TaskMultimodal:
		pipelineTags = []string{"image-text-to-text", "video-text-to-text", "audio-text-to-text"}
		architectures = registry.Multimodal
	default:
		return nil, nil, fmt.Errorf("vLLM does not support task %q", task)
	}

	supported := make(map[string]bool, len(architectures))
	for _, architecture := range architectures {
		supported[architecture] = true
	}
	return pipelineTags, supported, nil
}

func registryContains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func embeddingMode(architectures []string) string {
	for _, architecture := range architectures {
		if registryContains(registry.TextGeneration, architecture) {
			return "converted"
		}
		if registryContains(registry.Embedding, architecture) {
			return "native"
		}
	}
	return "converted"
}




