package vllm

import (
	"testing"

	"orcn/core"
)

func TestFirstSupportedArchitectureChecksAllCandidates(t *testing.T) {
	got := firstSupportedArchitecture([]string{"UnknownModel", "BertModel"}, map[string]bool{"BertModel": true})
	if got != "BertModel" {
		t.Fatalf("architecture = %q", got)
	}
}

func TestEmbeddingSearchUsesMultiplePipelineTags(t *testing.T) {
	tags, architectures, err := taskSearchConfig(core.TaskEmbedding)
	if err != nil {
		t.Fatal(err)
	}
	if len(tags) != 2 || tags[0] != "feature-extraction" || tags[1] != "sentence-similarity" {
		t.Fatalf("pipeline tags = %#v", tags)
	}
	if !architectures["BertModel"] {
		t.Fatal("embedding architecture registry does not include BertModel")
	}
	if !architectures["Qwen3ForCausalLM"] {
		t.Fatal("embedding architecture registry does not include Qwen3ForCausalLM")
	}
}
