package vllm

import (
	"fmt"
	"strconv"

	"orcn/core"
)

func (v *VLLMRuntime) buildEmbeddingJobSpec(modelID string, config map[string]string) (*core.JobSpec, error) {
	command := commonModelArgs(modelID, config)
	command = append(command,
		"--dtype", configValue(config, "dtype", "auto"),
		"--runner", "pooling",
	)
	runtimeConfig, runtimeConfigErr := fetchModelRuntimeConfig(modelID)
	if tensorParallel := configValue(config, "tensor_parallel", "0"); tensorParallel != "0" {
		command = append(command, "--tensor-parallel-size", tensorParallel)
	}
	if apiKey := configValue(config, "api_key", ""); apiKey != "" {
		command = append(command, "--api-key", apiKey)
	}
	if maxLen := configValue(config, "max_model_len", ""); maxLen != "" {
		requestedLength, err := strconv.Atoi(maxLen)
		if err != nil || requestedLength <= 0 {
			return nil, fmt.Errorf("max_model_len must be a positive integer")
		}
		if runtimeConfigErr == nil {
			if modelLimit := modelMaxLength(runtimeConfig.Config); modelLimit > 0 && requestedLength > modelLimit {
				return nil, fmt.Errorf("max_model_len %d exceeds the model limit of %d", requestedLength, modelLimit)
			}
		}
		command = append(command, "--max-model-len", maxLen)
	}
	if maxSequences := configValue(config, "max_num_seqs", ""); maxSequences != "" {
		command = append(command, "--max-num-seqs", maxSequences)
	}
	if maxBatchedTokens := configValue(config, "max_num_batched_tokens", ""); maxBatchedTokens != "" {
		command = append(command, "--max-num-batched-tokens", maxBatchedTokens)
	}
	mode := "converted"
	if runtimeConfigErr == nil {
		mode = embeddingMode(runtimeConfig.Architectures)
	}
	if mode == "converted" {
		command = append(command, "--convert", "embed")
	}
	if configValue(config, "cuda_graphs", "true") == "false" {
		command = append(command, "--enforce-eager")
	}

	return v.buildJobSpec(modelID, resolveEntrypoint(modelID), command, vllmHealthPath), nil
}

func (v *VLLMRuntime) embeddingSchema() []core.ConfigOption {
	return []core.ConfigOption{
		{
			Key: "cuda_graphs", Name: "Enable CUDA Graphs",
			Description: "Enable CUDA graphs for faster inference. Disable if you encounter out-of-memory errors.", Type: "boolean", Default: "true",
		},
		{
			Key: "gpu_memory_utilization", Name: "GPU Memory Utilization",
			Description: "Fraction of GPU VRAM to allocate to the embedding model.", Type: "number", Default: "0.80",
			Min: floatPtr(0.1), Max: floatPtr(1.0),
		},
		{
			Key: "max_model_len", Name: "Maximum Input Tokens",
			Description: "Optional lower limit for input tokens. Leave empty to use the model's native maximum.", Type: "number", Default: "",
			Min: floatPtr(1),
		},
		{
			Key: "dtype", Name: "Data Type",
			Description: "Weight and activation data type used by vLLM.", Type: "select", Default: "auto",
			Options: []string{"auto", "float16", "bfloat16"},
		},
		{
			Key: "tensor_parallel", Name: "Tensor Parallel Size",
			Description: "Number of GPUs used for the embedding model (0=automatic).", Type: "select", Default: "0",
			Options: []string{"0", "2", "4", "8"},
		},
		{
			Key: "max_num_seqs", Name: "Maximum Concurrent Sequences",
			Description: "Maximum number of embedding requests processed concurrently.", Type: "number", Default: "",
		},
		{
			Key: "max_num_batched_tokens", Name: "Maximum Batched Tokens",
			Description: "Upper bound for tokens processed in one scheduler batch.", Type: "number", Default: "",
		},
		{
			Key: "api_key", Name: "API Key",
			Description: "Optional API key required by the vLLM server.", Type: "text", Default: "",
		},
	}
}

func embeddingMetadata(data map[string]interface{}) map[string]interface{} {
	metadata := map[string]interface{}{}
	config, _ := data["config"].(map[string]interface{})

	hiddenSize, ok := firstModelValue(config,
		"hidden_size",
		"embedding_dimension",
		"sentence_embedding_dimension",
		"word_embedding_dimension",
	)
	if ok {
		metadata["Embedding Dimension"] = hiddenSize
	}
	maxLength, ok := firstModelValue(config, "max_position_embeddings", "max_seq_length", "max_sequence_length")
	if ok {
		metadata["Max Sequence Length"] = maxLength
	}
	metadata["Task"] = string(core.TaskEmbedding)

	return metadata
}
