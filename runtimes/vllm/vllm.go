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

func (v *VLLMRuntime) BuildJobSpec(modelID string, advancedConfig map[string]string) (*core.JobSpec, error) {
	return &core.JobSpec{
		Version: "v2",
		Type:    "container",
		SystemRequirements: core.SystemRequirements{
			MinVRAMGB:   16,
			CUDAVersion: "12.0",
		},
		Containers: []core.ContainerSpec{
			{
				ID: "ai-master",
				Args: core.ContainerArgs{
					Image: "docker.io/vllm/vllm-openai:v0.16.0",
					GPU:   true,
					Entrypoint: []string{
						"/bin/bash",
						"-c",
					},
					Cmd: []string{
						GenerateVLLMStartScript(modelID, advancedConfig),
					},
					Env: map[string]string{
						"CUDA_MODULE_LOADING":     "LAZY",
						"PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True",
					},
					Expose: []core.ExposeSpec{
						{
							Port:     9000,
							Protocol: "http",
							IsPublic: true,
							HealthCheck: &core.HealthCheckSpec{
								Path:           "/health",
								ExpectedStatus: 200,
								TimeoutSeconds: 10,
							},
						},
					},
				},
			},
		},
	}, nil
}

func floatPtr(v float64) *float64 { return &v }

func (v *VLLMRuntime) GetAdvancedConfigSchema() []core.ConfigOption {
	return []core.ConfigOption{
		{
			Key:         "gpu_memory_utilization",
			Name:        "GPU Memory Utilization",
			Description: "Fraction of GPU VRAM to allocate for the model and KV cache.",
			Type:        "number",
			Default:     "0.80",
			Min:         floatPtr(0.1),
			Max:         floatPtr(1.0),
		},
		{
			Key:         "max_model_len",
			Name:        "Max Context Length",
			Description: "Maximum sequence length (prompt + output). Lower values save VRAM.",
			Type:        "number",
			Default:     "4096",
			Min:         floatPtr(512),
		},
		{
			Key:         "enable_prefix_caching",
			Name:        "Prefix Caching",
			Description: "Automatically cache system prompts and shared prefixes.",
			Type:        "boolean",
			Default:     "true",
		},
		{
			Key:         "cpu_offload_gb",
			Name:        "CPU Offload (GB)",
			Description: "CPU RAM limit for offloading model weights and KV cache to prevent VRAM OOM.",
			Type:        "number",
			Default:     "0",
		},
		{
			Key:         "api_key",
			Name:        "Enforce API Key",
			Description: "Optional key to restrict access to this node.",
			Type:        "text",
			Default:     "",
		},
	}
}

func (v *VLLMRuntime) SearchModels(query string) ([]core.ModelInfo, error) {
	searchURL := fmt.Sprintf("https://huggingface.co/api/models?search=%s&limit=100&sort=downloads&direction=-1&pipeline_tag=text-generation&filter=safetensors&expand=config", url.QueryEscape(query))
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


func GenerateVLLMStartScript(modelID string, config map[string]string) string {
	getVal := func(key, def string) string {
		if val, ok := config[key]; ok && val != "" {
			return val
		}
		return def
	}

	memUtil := getVal("gpu_memory_utilization", "0.80")
	maxLen := getVal("max_model_len", "4096")
	cpuOffload := getVal("cpu_offload_gb", "0")
	
	prefixCaching := ""
	if getVal("enable_prefix_caching", "true") == "true" {
		prefixCaching = "--enable-prefix-caching"
	}

	apiKeyFlag := ""
	if apiKey := getVal("api_key", ""); apiKey != "" {
		apiKeyFlag = fmt.Sprintf("--api-key %s", apiKey)
	}

	script := fmt.Sprintf(`
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
	--gpu-memory-utilization %s \
	--max-model-len %s \
	--cpu-offload-gb %s \
	--tensor-parallel-size $TP %s %s
`, modelID, modelID, memUtil, maxLen, cpuOffload, prefixCaching, apiKeyFlag)

	compressed := strings.ReplaceAll(strings.TrimSpace(script), "\n", "; ")
	compressed = strings.ReplaceAll(compressed, "; ;", ";")
	compressed = strings.ReplaceAll(compressed, "\\; ", "")
	compressed = strings.ReplaceAll(compressed, "\t", " ")
	compressed = strings.ReplaceAll(compressed, "  ", " ") // remove double spaces

	return compressed
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
