package core

type ModelCapability string

const (
	CapabilityTools    ModelCapability = "tools"
	CapabilityThinking ModelCapability = "thinking"
	CapabilityVision   ModelCapability = "vision"
)

type ModelCapabilityInfo struct {
	ID          ModelCapability `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
}

var modelCapabilityCatalog = []ModelCapabilityInfo{
	{ID: CapabilityTools, Name: "Tool use", Description: "Models that can call tools / function calling."},
	{ID: CapabilityThinking, Name: "Thinking", Description: "Models with explicit reasoning traces."},
	{ID: CapabilityVision, Name: "Vision", Description: "Models that accept images alongside text."},
}

func ModelCapabilities() []ModelCapabilityInfo {
	caps := make([]ModelCapabilityInfo, len(modelCapabilityCatalog))
	copy(caps, modelCapabilityCatalog)
	return caps
}

func CapabilityInfos(ids []ModelCapability) []ModelCapabilityInfo {
	byID := make(map[ModelCapability]ModelCapabilityInfo, len(modelCapabilityCatalog))
	for _, c := range modelCapabilityCatalog {
		byID[c.ID] = c
	}
	out := make([]ModelCapabilityInfo, 0, len(ids))
	seen := make(map[ModelCapability]bool)
	for _, id := range ids {
		info, ok := byID[NormalizeCapability(id)]
		if !ok || info.ID == "" || seen[info.ID] {
			continue
		}
		seen[info.ID] = true
		out = append(out, info)
	}
	return out
}

func NormalizeCapabilities(values []string) []string {
	known := make(map[string]bool, len(modelCapabilityCatalog))
	for _, c := range modelCapabilityCatalog {
		known[string(c.ID)] = true
	}
	out := make([]string, 0, len(values))
	seen := make(map[string]bool)
	for _, v := range values {
		nv := string(NormalizeCapability(ModelCapability(v)))
		if nv == "" || seen[nv] {
			continue
		}
		seen[nv] = true
		if known[nv] {
			out = append(out, nv)
		}
	}
	return out
}

func NormalizeCapability(c ModelCapability) ModelCapability {
	switch ModelCapability(lowerASCII(string(c))) {
	case CapabilityTools:
		return CapabilityTools
	case CapabilityThinking:
		return CapabilityThinking
	case CapabilityVision:
		return CapabilityVision
	default:
		return ""
	}
}

func lowerASCII(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + ('a' - 'A')
		}
	}
	return string(b)
}
