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
	return &core.ContainerSpec{
		Image:      "docker.io/vllm/vllm-openai:v0.16.0",
		Entrypoint: []string{"/bin/bash", "-c"},
		Cmd:        []string{GenerateVLLMStartScript(modelID)},
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

func (v *VLLMRuntime) SearchModels(query string) ([]core.ModelInfo, error) {
	searchURL := fmt.Sprintf("https://huggingface.co/api/models?search=%s&limit=100&sort=downloads&direction=-1&filter=text-generation,safetensors&expand=config", url.QueryEscape(query))
	resp, err := http.Get(searchURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var hfModels []struct {
		Id        string `json:"id"`
		Downloads int    `json:"downloads"`
		Config    struct {
			Architectures []string `json:"architectures"`
		} `json:"config"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&hfModels); err != nil {
		return nil, err
	}

	var results []core.ModelInfo
	seen := make(map[string]bool)

	for _, m := range hfModels {
		if len(m.Config.Architectures) > 0 {
			arch := m.Config.Architectures[0]

			if supportedArchitectures[arch] && IsVLLMCompatible(m.Id) {
				if !seen[m.Id] {
					seen[m.Id] = true
					
					parts := strings.Split(m.Id, "/")
					author := ""
					if len(parts) > 1 {
						author = parts[0]
					}

					results = append(results, core.ModelInfo{
						ID:           m.Id,
						Name:         m.Id,
						Author:       author,
						Architecture: arch,
						Downloads:    m.Downloads,
						PipelineTag:  "text-generation",
						Tags:         []string{"safetensors"},
					})
				}
			}
		}
	}

	return results, nil
}

func (v *VLLMRuntime) GetModelDetails(modelID string) (interface{}, error) {
	url := fmt.Sprintf("https://huggingface.co/api/models/%s", modelID)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("model not found")
	}

	var data interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	return data, nil
}


func GenerateVLLMStartScript(modelID string) string {
	script := `
N=$(nvidia-smi -L | wc -l)
if [ $N -ge 8 ]; then TP=8
elif [ $N -ge 4 ]; then TP=4
elif [ $N -ge 2 ]; then TP=2
else TP=1
fi
python3 -m vllm.entrypoints.openai.api_server \
	--model %s \
	--served-model-name %s \
	--port 9000 \
	--dtype auto \
	--trust-remote-code \
	--gpu-memory-utilization 0.95 \
	--max-model-len 4096 \
	--enable-prefix-caching \
	--tensor-parallel-size $TP
`
	compressed := strings.ReplaceAll(strings.TrimSpace(script), "\n", "; ")
	compressed = strings.ReplaceAll(compressed, "; ;", ";")
	compressed = strings.ReplaceAll(compressed, "\\; ", "")

	return fmt.Sprintf(compressed, modelID, modelID)
}

func IsVLLMCompatible(id string) bool {
	idLower := strings.ToLower(id)
	unsupported := []string{"mlx", "exl2", "gguf", "ggml", "bnb"}
	for _, u := range unsupported {
		if strings.Contains(idLower, u) {
			return false
		}
	}
	return true
}
