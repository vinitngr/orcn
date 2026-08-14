package vllm

import (
	"testing"

	"orcn/core"
)

func TestBuildEmbeddingJobSpecUsesPoolingRunner(t *testing.T) {
	spec, err := New().BuildJobSpec("BAAI/bge-small-en-v1.5", core.TaskEmbedding, nil)
	if err != nil {
		t.Fatal(err)
	}

	args := spec.Containers[0].Args
	if !containsPair(args.Cmd, "--runner", "pooling") {
		t.Fatalf("embedding command does not use pooling runner: %#v", args.Cmd)
	}
	if args.Expose[0].HealthCheck == nil || args.Expose[0].HealthCheck.Path != "/health" {
		t.Fatalf("unexpected embedding health check: %#v", args.Expose[0].HealthCheck)
	}
	if !containsPair(args.Cmd, "--dtype", "auto") {
		t.Fatalf("embedding command is missing default serving flags: %#v", args.Cmd)
	}
}

func TestBuildEmbeddingJobSpecAddsConfiguredServingFlags(t *testing.T) {
	spec, err := New().BuildJobSpec("intfloat/e5-small-v2", core.TaskEmbedding, map[string]string{
		"dtype":                  "float16",
		"tensor_parallel":        "2",
		"api_key":                "secret",
		"max_num_seqs":           "32",
		"max_num_batched_tokens": "4096",
	})
	if err != nil {
		t.Fatal(err)
	}

	args := spec.Containers[0].Args.Cmd
	for key, value := range map[string]string{
		"--dtype":                  "float16",
		"--tensor-parallel-size":   "2",
		"--api-key":                "secret",
		"--max-num-seqs":           "32",
		"--max-num-batched-tokens": "4096",
	} {
		if !containsPair(args, key, value) {
			t.Fatalf("embedding command is missing %s=%s: %#v", key, value, args)
		}
	}
}

func TestBuildJobSpecRejectsUnsupportedTask(t *testing.T) {
	if _, err := New().BuildJobSpec("model", core.ModelTask("reranking"), nil); err == nil {
		t.Fatal("expected unsupported task to fail")
	}
}

func TestModelMetadataUsesTaskHook(t *testing.T) {
	data := map[string]interface{}{
		"config": map[string]interface{}{
			"architectures":           []interface{}{"BertModel"},
			"model_type":              "bert",
			"hidden_size":             float64(768),
			"max_position_embeddings": float64(512),
			"torch_dtype":             "float32",
		},
	}

	metadata := modelMetadata(data, core.TaskEmbedding)
	if metadata["Embedding Dimension"] != float64(768) {
		t.Fatalf("embedding metadata = %#v", metadata)
	}

	textMetadata := modelMetadata(data, core.TaskTextGeneration)
	if textMetadata["Hidden Size"] != float64(768) || textMetadata["Task"] != string(core.TaskTextGeneration) {
		t.Fatalf("text-generation metadata = %#v", textMetadata)
	}
}

func containsPair(values []string, key, value string) bool {
	for index := 0; index+1 < len(values); index++ {
		if values[index] == key && values[index+1] == value {
			return true
		}
	}
	return false
}
