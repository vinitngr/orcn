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
	getVal := func(key, def string) string {
		if val, ok := advancedConfig[key]; ok && val != "" {
			return val
		}
		return def
	}

	cmdArgs := []string{
		"--model", modelID,
		"--served-model-name", modelID,
		"--port", "9000",
		"--dtype", "auto",
		"--trust-remote-code",
		"--gpu-memory-utilization", getVal("gpu_memory_utilization", "0.80"),
		"--max-model-len", getVal("max_model_len", "4096"),
		"--cpu-offload-gb", getVal("cpu_offload_gb", "0"),
	}

	if tp := getVal("tensor_parallel", "0"); tp != "0" && tp != "" {
		cmdArgs = append(cmdArgs, "--tensor-parallel-size", tp)
	}

	if getVal("enable_prefix_caching", "true") == "true" {
		cmdArgs = append(cmdArgs, "--enable-prefix-caching")
	}

	if apiKey := getVal("api_key", ""); apiKey != "" {
		cmdArgs = append(cmdArgs, "--api-key", apiKey)
	}

	if tp := getVal("tool_parser", ""); tp != "" {
		cmdArgs = append(cmdArgs, "--enable-auto-tool-choice", "--tool-call-parser", tp)
	}

	if rp := getVal("reasoning_parser", ""); rp != "" {
		cmdArgs = append(cmdArgs, "--reasoning-parser", rp)
	}

	if kv := getVal("kv_cache_dtype", ""); kv == "fp8" {
		cmdArgs = append(cmdArgs, "--kv-cache-dtype", "fp8")
	}

	if ee := getVal("enforce_eager", "false"); ee == "true" {
		cmdArgs = append(cmdArgs, "--enforce-eager")
	}

	return &core.JobSpec{
		Version: "v2",
		Type:    "container",
		SystemRequirements: core.SystemRequirements{
			MinVRAMGB:   16,
			CUDAVersion: "12.9",
		},
		Containers: []core.ContainerSpec{
			{
				ID: "ai-master",
				Args: core.ContainerArgs{
					Image: "docker.io/vllm/vllm-openai:v0.26.0",
					GPU:   true,
					Entrypoint: []string{
						"python3",
						"-m",
						"vllm.entrypoints.openai.api_server",
					},
					Cmd: cmdArgs,
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

func (v *VLLMRuntime) SearchModels(query string) ([]core.ModelInfo, error) {
	searchURL := fmt.Sprintf("https://huggingface.co/api/models?search=%s&limit=100&sort=downloads&direction=-1&pipeline_tag=text-generation&filter=safetensors&expand=config", url.QueryEscape(query))
	resp, err := http.Get(searchURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("hugging face search failed: %s", resp.Status)
	}

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
						Tags:         []string{arch},
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

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	injectRecommendedParsers(modelID, data)

	return data, nil
}

func injectRecommendedParsers(modelID string, data map[string]interface{}) {
	// The expanded model API already includes tokenizer_config for many models.
	// Use it first; the raw file request below is the fallback for older API
	// responses and models whose config is not expanded.
	if tmpl := chatTemplateFrom(data); tmpl != "" {
		setRecommendedParsers(data, tmpl)
		return
	}

	tokenizerURL := fmt.Sprintf("https://huggingface.co/%s/raw/main/tokenizer_config.json", modelID)
	tokResp, err := http.Get(tokenizerURL)
	if err != nil || tokResp.StatusCode != http.StatusOK {
		return
	}
	defer tokResp.Body.Close()

	var tokData map[string]interface{}
	if err := json.NewDecoder(tokResp.Body).Decode(&tokData); err != nil {
		return
	}

	if tmpl := chatTemplateFrom(tokData); tmpl != "" {
		setRecommendedParsers(data, tmpl)
	}
}

func chatTemplateFrom(data map[string]interface{}) string {
	if tmpl, ok := data["chat_template"].(string); ok {
		return tmpl
	}
	if tmpl, ok := data["chat_template_jinja"].(string); ok {
		return tmpl
	}
	if templates, ok := data["chat_template"].([]interface{}); ok {
		for _, item := range templates {
			if obj, ok := item.(map[string]interface{}); ok {
				if tmpl, ok := obj["template"].(string); ok {
					return tmpl
				}
			}
		}
	}
	if config, ok := data["config"].(map[string]interface{}); ok {
		if tmpl := chatTemplateFrom(config); tmpl != "" {
			return tmpl
		}
		if tokenizer, ok := config["tokenizer_config"].(map[string]interface{}); ok {
			return chatTemplateFrom(tokenizer)
		}
	}
	return ""
}

func setRecommendedParsers(data map[string]interface{}, tmpl string) {
	data["chat_template"] = tmpl
	toolParser := DetectParser(tmpl, ToolParsers)
	reasoningParser := DetectParser(tmpl, ReasoningParsers)
	data["recommended_tool_parser"] = toolParser
	data["recommended_reasoning_parser"] = reasoningParser
	data["metadata"] = map[string]string{
		"tool_parser":      toolParser,
		"reasoning_parser": reasoningParser,
	}
}

// dont remove this rebundant script
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

	toolParserFlag := ""
	if tp := getVal("tool_parser", ""); tp != "" {
		toolParserFlag = fmt.Sprintf("--enable-auto-tool-choice --tool-call-parser %s", tp)
	}

	reasoningParserFlag := ""
	if rp := getVal("reasoning_parser", ""); rp != "" {
		reasoningParserFlag = fmt.Sprintf("--reasoning-parser %s", rp)
	}

	structuredJsonFlag := ""
	if sj := getVal("structured_json", "true"); sj == "true" {
		structuredJsonFlag = "--guided-decoding-backend xgrammar"
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
	--tensor-parallel-size $TP %s %s %s %s %s
`, modelID, modelID, memUtil, maxLen, cpuOffload, prefixCaching, apiKeyFlag, toolParserFlag, reasoningParserFlag, structuredJsonFlag)

	compressed := strings.ReplaceAll(strings.TrimSpace(script), "\n", "; ")
	compressed = strings.ReplaceAll(compressed, "; ;", ";")
	compressed = strings.ReplaceAll(compressed, "\\; ", "")
	compressed = strings.ReplaceAll(compressed, "\t", " ")
	compressed = strings.ReplaceAll(compressed, "  ", " ")

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

func (v *VLLMRuntime) GetAdvancedConfigSchema() []core.ConfigOption {
	toolOptions := []string{""}
	for _, p := range ToolParsers {
		toolOptions = append(toolOptions, p.ID)
	}

	reasoningOptions := []string{""}
	for _, p := range ReasoningParsers {
		reasoningOptions = append(reasoningOptions, p.ID)
	}

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
		{
			Key:         "tensor_parallel",
			Name:        "Tensor Parallel Size",
			Description: "Number of GPUs to use (0=Disable, 2, 4, 8).",
			Type:        "select",
			Default:     "0",
			Options:     []string{"0", "2", "4", "8"},
		},
		{
			Key:         "tool_parser",
			Name:        "Tool Parser (Advanced)",
			Description: "Forces a specific parser for function calling. Leave empty for Auto Detect.",
			Type:        "select",
			Default:     "",
			Options:     toolOptions,
		},
		{
			Key:         "reasoning_parser",
			Name:        "Reasoning Parser (Advanced)",
			Description: "Forces a specific parser for reasoning output (Thought blocks).",
			Type:        "select",
			Default:     "",
			Options:     reasoningOptions,
		},
		{
			Key:         "kv_cache_dtype",
			Name:        "KV Cache Quantization (Advanced)",
			Description: "Forces FP8 KV cache to save 50% memory. WARNING: Requires RTX 4000/5000 or H100 GPU.",
			Type:        "select",
			Default:     "",
			Options:     []string{"", "fp8"},
		},
		{
			Key:         "enforce_eager",
			Name:        "CUDA Graphs",
			Description: "Enable CUDA graph capture for better decoding performance. Disable this if the model has CUDA graph capture issues.",
			Type:        "boolean",
			Default:     "false",
		},
	}
}
