package vllm

import (
	"encoding/json"
	"fmt"
	"net/http"
)

import "regexp"

type ParserProfile struct {
	ID          string
	DisplayName string
	Regex       *regexp.Regexp
}

var ToolParsers = []ParserProfile{
	{
		ID:          "openai",
		DisplayName: "OpenAI Harmony",
		Regex:       regexp.MustCompile(`(?i)<\|channel\|>commentary`),
	},
	{
		ID:          "gemma4",
		DisplayName: "Gemma 4",
		Regex:       regexp.MustCompile(`(?i)<\|tool_call\|>|call:`),
	},
	{
		ID:          "llama3_json",
		DisplayName: "Llama 3 JSON",
		Regex:       regexp.MustCompile(`(?i)<\|start_header_id\|>tool<\|end_header_id\|>`),
	},
	{
		ID:          "llama4_pythonic",
		DisplayName: "Llama 4 Pythonic",
		Regex:       regexp.MustCompile(`(?i)<\|python_tag\|>`),
	},
	{
		ID:          "mistral",
		DisplayName: "Mistral",
		Regex:       regexp.MustCompile(`(?i)\[TOOL_CALLS\]`),
	},
	{
		ID:          "qwen",
		DisplayName: "Qwen",
		Regex:       regexp.MustCompile(`(?i)<\|im_start\|>tool`),
	},
	{
		ID:          "hermes",
		DisplayName: "Hermes",
		Regex:       regexp.MustCompile(`(?i)<tool_call>`),
	},
	{
		ID:          "qwen3_xml",
		DisplayName: "Qwen 3 XML",
		Regex:       regexp.MustCompile(`(?i)<tool_call>|<tool_response>|<function=`),
	},
	{
		ID:          "granite",
		DisplayName: "Granite",
		Regex:       regexp.MustCompile(`(?i)<\|tool_call\|>`),
	},
	{
		ID:          "glm47",
		DisplayName: "GLM 4.7",
		Regex:       regexp.MustCompile(`(?i)<\|assistant\|>|<tool_call>`),
	},
	{
		ID:          "xlam",
		DisplayName: "xLAM",
		Regex:       regexp.MustCompile(`(?i)<function=|<tool_call>`),
	},
	{
		ID:          "cohere_command3",
		DisplayName: "Cohere Command",
		Regex:       regexp.MustCompile(`(?i)<\|START_OF_TURN_TOKEN\|>tool`),
	},
	{
		ID:          "internlm",
		DisplayName: "InternLM",
		Regex:       regexp.MustCompile(`(?i)<\|im_start\|>tool`),
	},
	{
		ID:          "phi4_mini_json",
		DisplayName: "Phi-4 Mini JSON",
		Regex:       regexp.MustCompile(`(?i)<\|tool_call\|>`),
	},
	{
		ID:          "minimax_m2",
		DisplayName: "MiniMax",
		Regex:       regexp.MustCompile(`(?i)<tool_call>`),
	},
}

var ReasoningParsers = []ParserProfile{
	{
		ID:          "deepseek_r1",
		DisplayName: "DeepSeek R1 / V3",
		Regex:       regexp.MustCompile(`(?i)<think>`),
	},
	{
		ID:          "qwen3",
		DisplayName: "Qwen 3",
		Regex:       regexp.MustCompile(`(?i)<think>|</think>`),
	},
	{
		ID:          "granite",
		DisplayName: "Granite Reasoning",
		Regex:       regexp.MustCompile(`(?i)<think>`),
	},
}

func DetectParser(chatTemplate string, profiles []ParserProfile) string {
	for _, p := range profiles {
		if p.Regex != nil && p.Regex.MatchString(chatTemplate) {
			return p.ID
		}
	}
	return ""
}

func injectRecommendedParsers(modelID string, data map[string]interface{}) {
	if template := chatTemplateFrom(data); template != "" {
		setRecommendedParsers(data, template)
		return
	}

	tokenizerURL := fmt.Sprintf("https://huggingface.co/%s/raw/main/tokenizer_config.json", modelID)
	resp, err := http.Get(tokenizerURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		return
	}
	defer resp.Body.Close()

	var tokenizerData map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&tokenizerData); err == nil {
		if template := chatTemplateFrom(tokenizerData); template != "" {
			setRecommendedParsers(data, template)
		}
	}
}

func chatTemplateFrom(data map[string]interface{}) string {
	if template, ok := data["chat_template"].(string); ok {
		return template
	}
	if template, ok := data["chat_template_jinja"].(string); ok {
		return template
	}
	if templates, ok := data["chat_template"].([]interface{}); ok {
		for _, item := range templates {
			if object, ok := item.(map[string]interface{}); ok {
				if template, ok := object["template"].(string); ok {
					return template
				}
			}
		}
	}
	if config, ok := data["config"].(map[string]interface{}); ok {
		if template := chatTemplateFrom(config); template != "" {
			return template
		}
		if tokenizer, ok := config["tokenizer_config"].(map[string]interface{}); ok {
			return chatTemplateFrom(tokenizer)
		}
	}
	return ""
}

func setRecommendedParsers(data map[string]interface{}, template string) {
	toolParser := DetectParser(template, ToolParsers)
	reasoningParser := DetectParser(template, ReasoningParsers)
	data["chat_template"] = template
	data["recommended_tool_parser"] = toolParser
	data["recommended_reasoning_parser"] = reasoningParser
	metadata, _ := data["metadata"].(map[string]interface{})
	if metadata == nil {
		metadata = map[string]interface{}{}
	}
	metadata["tool_parser"] = toolParser
	metadata["reasoning_parser"] = reasoningParser
	data["metadata"] = metadata
}
