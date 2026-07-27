package vllm

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"orcn/core"
)

type VLLMRuntime struct{}

func New() *VLLMRuntime {
	return &VLLMRuntime{}
}

func (v *VLLMRuntime) GetWorkloadType() string {
	return "model_inference"
}

func (v *VLLMRuntime) BuildContainerSpec(modelID string) (*core.ContainerSpec, error) {
	cmd := []string{
		modelID,
		"--served-model-name", modelID,
		"--port", "9000",
		"--dtype", "auto",
		"--trust-remote-code",
		"--gpu-memory-utilization", "0.9",
		"--max-model-len", "4096",
	}

	return &core.ContainerSpec{
		Image: "docker.io/vllm/vllm-openai:v0.16.0",
		Cmd:   cmd,
		Ports: []core.PortMapping{
			{
				Port:     9000,
				Protocol: "http",
				HealthCheck: core.HealthCheckSpec{
					Type:           "http",
					Path:           "/v1/models",
					Method:         "GET",
					ExpectedStatus: 200,
				},
			},
		},
		GPU: true,
	}, nil
}

var supportedArchitectures = map[string]bool{
	"LlamaForCausalLM": true,
	"MistralForCausalLM": true,
	"Qwen2ForCausalLM": true,
	"GemmaForCausalLM": true,
	"Phi3ForCausalLM": true,
}

func (v *VLLMRuntime) SearchModels(query string) ([]core.ModelInfo, error) {
	searchURL := fmt.Sprintf("https://huggingface.co/api/models?search=%s&limit=20&expand=config", url.QueryEscape(query))
	resp, err := http.Get(searchURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var hfModels []struct {
		Id     string `json:"id"`
		Author string `json:"author"`
		Config struct {
			Architectures []string `json:"architectures"`
		} `json:"config"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&hfModels); err != nil {
		return nil, err
	}

	var results []core.ModelInfo
	for _, m := range hfModels {
		if len(m.Config.Architectures) > 0 {
			arch := m.Config.Architectures[0]
			if supportedArchitectures[arch] {
				parts := strings.Split(m.Id, "/")
				name := parts[len(parts)-1]
				results = append(results, core.ModelInfo{
					ID:           m.Id,
					Name:         name,
					Author:       m.Author,
					Architecture: arch,
				})
			}
		}
	}

	return results, nil
}
