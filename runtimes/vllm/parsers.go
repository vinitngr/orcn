package vllm

import "regexp"

type ParserProfile struct {
	ID          string
	DisplayName string
	Regex       *regexp.Regexp
}

var ToolParsers = []ParserProfile{
	{
		ID:          "hermes",
		DisplayName: "Hermes (NousResearch)",
		Regex:       regexp.MustCompile(`(?i)<tool_call>`),
	},
	{
		ID:          "llama3_json",
		DisplayName: "Llama 3 / 3.1 JSON",
		Regex:       regexp.MustCompile(`(?i)<\|start_header_id\|>tool<\|end_header_id\|>`),
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
    ID:          "qwen3_xml",
    DisplayName: "Qwen3 XML",
    Regex:       regexp.MustCompile(`(?i)<tool_call>|<tool_response>|<function=`),
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
