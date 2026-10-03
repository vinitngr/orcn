package vllm

import (
	"strings"
	"testing"

	"orcn/core"
)

func TestValidateAdvancedConfigRejectsZeroMaxModelLen(t *testing.T) {
	schema := New().GetAdvancedConfigSchema(core.TaskTextGeneration)
	err := validateAdvancedConfig(core.TaskTextGeneration, map[string]string{"max_model_len": "0"}, schema, nil)
	if err == nil || !strings.Contains(err.Error(), "max_model_len must be a positive integer") {
		t.Fatalf("expected zero max_model_len to be rejected, got %v", err)
	}
}

func TestValidateAdvancedConfigRejectsNegativeAndNonIntegerMaxModelLen(t *testing.T) {
	schema := New().GetAdvancedConfigSchema(core.TaskEmbedding)
	for _, value := range []string{"-1", "abc", "1.5"} {
		err := validateAdvancedConfig(core.TaskEmbedding, map[string]string{"max_model_len": value}, schema, nil)
		if err == nil {
			t.Fatalf("expected max_model_len=%q to be rejected", value)
		}
	}
}

func TestValidateAdvancedConfigRejectsMaxModelLenAboveModelLimit(t *testing.T) {
	schema := New().GetAdvancedConfigSchema(core.TaskTextGeneration)
	runtimeConfig := &modelRuntimeConfig{Config: map[string]any{"max_position_embeddings": float64(4096)}}
	err := validateAdvancedConfig(core.TaskTextGeneration, map[string]string{"max_model_len": "8192"}, schema, runtimeConfig)
	if err == nil || !strings.Contains(err.Error(), "exceeds the model limit") {
		t.Fatalf("expected over-limit max_model_len to be rejected, got %v", err)
	}
}

func TestValidateAdvancedConfigAcceptsValidMaxModelLen(t *testing.T) {
	schema := New().GetAdvancedConfigSchema(core.TaskTextGeneration)
	runtimeConfig := &modelRuntimeConfig{Config: map[string]any{"max_position_embeddings": float64(4096)}}
	if err := validateAdvancedConfig(core.TaskTextGeneration, map[string]string{"max_model_len": "4096"}, schema, runtimeConfig); err != nil {
		t.Fatalf("valid max_model_len rejected: %v", err)
	}
	if err := validateAdvancedConfig(core.TaskTextGeneration, nil, schema, nil); err != nil {
		t.Fatalf("empty config rejected: %v", err)
	}
}

func TestValidateAdvancedConfigChecksRanges(t *testing.T) {
	schema := New().GetAdvancedConfigSchema(core.TaskTextGeneration)
	cases := []map[string]string{
		{"gpu_memory_utilization": "0"},
		{"gpu_memory_utilization": "1.5"},
		{"tensor_parallel": "3"},
		{"enable_prefix_caching": "maybe"},
		{"max_num_seqs": "0"},
		{"cpu_offload_gb": "-1"},
		{"kv_cache_dtype": "int4"},
		{"bogus_flag": "1"},
	}
	for _, config := range cases {
		if err := validateAdvancedConfig(core.TaskTextGeneration, config, schema, nil); err == nil {
			t.Fatalf("expected config %#v to be rejected", config)
		}
	}
}

func TestValidateAdvancedConfigChecksParsers(t *testing.T) {
	schema := New().GetAdvancedConfigSchema(core.TaskTextGeneration)
	if err := validateAdvancedConfig(core.TaskTextGeneration, map[string]string{"tool_parser": "not_a_parser"}, schema, nil); err == nil {
		t.Fatal("expected unknown tool_parser to be rejected")
	}
	if err := validateAdvancedConfig(core.TaskTextGeneration, map[string]string{"reasoning_parser": "deepseek_r1"}, schema, nil); err != nil {
		t.Fatalf("known reasoning_parser rejected: %v", err)
	}
}
