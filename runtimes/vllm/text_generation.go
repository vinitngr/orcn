package vllm

import (
	"orcn/core"
)

func (v *VLLMRuntime) buildTextGenerationJobSpec(modelID string, config map[string]string) (*core.JobSpec, error) {
	command := commonModelArgs(modelID, config)
	command = append(command,
		"--dtype", "auto",
		"--cpu-offload-gb", configValue(config, "cpu_offload_gb", "0"),
	)

	if maxLen := configValue(config, "max_model_len", ""); maxLen != "" {
		command = append(command, "--max-model-len", maxLen)
	}

	if tensorParallel := configValue(config, "tensor_parallel", "0"); tensorParallel != "0" {
		command = append(command, "--tensor-parallel-size", tensorParallel)
	}
	if configValue(config, "enable_prefix_caching", "true") == "true" {
		command = append(command, "--enable-prefix-caching")
	}
	if apiKey := configValue(config, "api_key", ""); apiKey != "" {
		command = append(command, "--api-key", apiKey)
	}
	if parser := configValue(config, "tool_parser", ""); parser != "" {
		command = append(command, "--enable-auto-tool-choice", "--tool-call-parser", parser)
	}
	if parser := configValue(config, "reasoning_parser", ""); parser != "" {
		command = append(command, "--reasoning-parser", parser)
	}
	if configValue(config, "kv_cache_dtype", "") == "fp8" {
		command = append(command, "--kv-cache-dtype", "fp8")
	}
	if configValue(config, "enforce_eager", "false") == "true" {
		command = append(command, "--enforce-eager")
	}

	return v.buildJobSpec(modelID, resolveEntrypoint(modelID), command, vllmHealthPath), nil
}

func (v *VLLMRuntime) textGenerationSchema() []core.ConfigOption {
	toolOptions := []string{""}
	for _, parser := range ToolParsers {
		toolOptions = append(toolOptions, parser.ID)
	}
	reasoningOptions := []string{""}
	for _, parser := range ReasoningParsers {
		reasoningOptions = append(reasoningOptions, parser.ID)
	}

	return []core.ConfigOption{
		{
			Key: "gpu_memory_utilization", Name: "GPU Memory Utilization",
			Description: "Fraction of GPU VRAM to allocate for the model and KV cache.", Type: "number", Default: "0.80",
			Min: floatPtr(0.1), Max: floatPtr(1.0),
		},
		{
			Key: "max_model_len", Name: "Max Context Length",
			Description: "Maximum sequence length. Leave empty to let vLLM automatically use the model's default maximum.", Type: "number", Default: "",
			Min: floatPtr(512),
		},
		{
			Key: "enable_prefix_caching", Name: "Prefix Caching",
			Description: "Automatically cache system prompts and shared prefixes.", Type: "boolean", Default: "true",
		},
		{
			Key: "cpu_offload_gb", Name: "CPU Offload (GB)",
			Description: "CPU RAM limit for offloading model weights and KV cache.", Type: "number", Default: "0",
		},
		{
			Key: "api_key", Name: "Enforce API Key",
			Description: "Optional key to restrict access to this node.", Type: "text", Default: "",
		},
		{
			Key: "tensor_parallel", Name: "Tensor Parallel Size",
			Description: "Number of GPUs to use (0=Disable, 2, 4, 8).", Type: "select", Default: "0",
			Options: []string{"0", "2", "4", "8"},
		},
		{
			Key: "tool_parser", Name: "Tool Parser (Advanced)",
			Description: "Forces a specific parser for function calling. Leave empty for Auto Detect.", Type: "select", Default: "",
			Options: toolOptions,
		},
		{
			Key: "reasoning_parser", Name: "Reasoning Parser (Advanced)",
			Description: "Forces a specific parser for reasoning output.", Type: "select", Default: "",
			Options: reasoningOptions,
		},
		{
			Key: "kv_cache_dtype", Name: "KV Cache Data Type",
			Description: "Optional KV cache precision.", Type: "select", Default: "auto",
			Options: []string{"auto", "fp8"},
		},
		{
			Key: "enforce_eager", Name: "Enforce Eager",
			Description: "Disable CUDA graph capture for compatibility.", Type: "boolean", Default: "false",
		},
	}
}


func textGenerationMetadata(data map[string]interface{}, task core.ModelTask) map[string]interface{} {
	config, _ := data["config"].(map[string]interface{})
	metadata := map[string]interface{}{"Task": string(task)}

	if pipeline, ok := data["pipeline_tag"].(string); ok && pipeline != "" {
		metadata["Pipeline"] = pipeline
	}

	if value, ok := firstModelValue(config, "max_position_embeddings", "max_seq_length", "max_sequence_length"); ok {
		metadata["Context Length"] = value
	}
	if value, ok := firstModelValue(config, "hidden_size"); ok {
		metadata["Hidden Size"] = value
	}
	if value, ok := firstModelValue(config, "num_hidden_layers", "num_layers"); ok {
		metadata["Layers"] = value
	}
	if value, ok := firstModelValue(config, "vocab_size"); ok {
		metadata["Vocabulary Size"] = value
	}

	return metadata
}