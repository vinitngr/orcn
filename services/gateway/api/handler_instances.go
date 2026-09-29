package api

import (
	"net/http"
	"strconv"
	"strings"

	"orcn/core"
)

type ProviderConfigField struct {
	Key         string   `json:"key"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Type        string   `json:"type"` // "text", "number", "select", "boolean"
	Required    bool     `json:"required"`
	IsAdvanced  bool     `json:"is_advanced"`
	Default     string   `json:"default"`
	Options     []string `json:"options,omitempty"`
	Placeholder string   `json:"placeholder,omitempty"`
}

type ProviderCapability struct {
	ID               string                `json:"id"`
	Name             string                `json:"name"`
	Description      string                `json:"description"`
	Type             string                `json:"type"` // "depin", "local", "cloud"
	HasVolumeSupport bool                  `json:"has_volume_support"`
	RequiresRegions  bool                  `json:"requires_regions"`
	RequiresVPC      bool                  `json:"requires_vpc"`
	Features         []string              `json:"features"`
	Regions          []string              `json:"regions,omitempty"`
	Schema           []ProviderConfigField `json:"schema"`
}

// InstanceListing is the clean, normalized interface the frontend consumes.
// All vendor / device-type classification happens here in the backend —
// the frontend never infers hardware details from instance names.
type InstanceListing struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Vendor       string  `json:"vendor,omitempty"`        // e.g. "NVIDIA", "AMD", "Apple"
	DeviceType   string  `json:"device_type,omitempty"`   // "gpu" | "cpu"
	GPUModel     string  `json:"gpu_model,omitempty"`     // e.g. "RTX 4090"
	VRAMGB       float64 `json:"vram_gb,omitempty"`
	CPUCores     float64 `json:"cpu_cores,omitempty"`
	RAMGB        float64 `json:"ram_gb,omitempty"`
	PricePerHour float64 `json:"price_per_hour,omitempty"`
	Available    int     `json:"available,omitempty"`
	Tag          string  `json:"tag,omitempty"`
	Location     string  `json:"location,omitempty"`
	Architecture string  `json:"architecture,omitempty"`
}

func (s *Server) handleListProviders(w http.ResponseWriter, r *http.Request) {
	providersList := []ProviderCapability{
		{
			ID:               "nosana",
			Name:             "Nosana Network",
			Description:      "Decentralized GPU compute network powered by Nosana.",
			Type:             "depin",
			HasVolumeSupport: false,
			RequiresRegions:  false,
			RequiresVPC:      false,
			Features:         []string{"Decentralized GPUs", "Cheap pricing", "Pay-as-you-go"},
			Schema:           []ProviderConfigField{},
		},
		{
			ID:               "local",
			Name:             "Local Node",
			Description:      "Deploy directly on your connected local worker node.",
			Type:             "local",
			HasVolumeSupport: false,
			RequiresRegions:  false,
			RequiresVPC:      false,
			Features:         []string{"Zero Network Latency", "Direct Hardware Access", "Private & Isolated"},
			Schema:           []ProviderConfigField{},
		},
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"providers": providersList,
	})
}

func (s *Server) handleListInstances(w http.ResponseWriter, r *http.Request) {
	providerID := r.URL.Query().Get("provider")

	if providerID == "" {
		respondError(w, http.StatusBadRequest, "Missing provider parameter")
		return
	}

	provider, err := core.GetProvider(providerID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	raw, err := provider.GetInstanceTypes()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	instances := normalizeInstances(raw, providerID)

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"provider":  providerID,
		"instances": instances,
	})
}

// normalizeInstances converts raw provider instance data into the clean InstanceListing
// interface. Vendor and device-type classification is backend responsibility only.
func normalizeInstances(raw any, providerID string) []InstanceListing {
	rawList, ok := raw.([]map[string]any)
	if !ok {
		rawList = []map[string]any{}
	}

	listings := make([]InstanceListing, 0, len(rawList))
	seen := make(map[string]bool)

	for _, m := range rawList {
		listing := normalizeInstance(m)

		// Provider-specific tag attachment lives here in the backend, never in
		// the frontend. Nosana is a GPU-only network — every listing is a GPU
		// instance, so tag it accordingly.
		switch providerID {
		case "nosana":
			listing.DeviceType = "gpu"
			if listing.Tag == "" {
				listing.Tag = "GPU"
			}
		}

		if listing.ID == "" {
			continue
		}
		if seen[listing.ID] {
			continue
		}
		seen[listing.ID] = true
		listings = append(listings, listing)
	}

	return listings
}

func normalizeInstance(m map[string]any) InstanceListing {
	listing := InstanceListing{
		ID:           firstString(m, "id", "address", "market_id", "instance_type"),
		Name:         firstString(m, "name", "title", "gpu_name", "gpu_model"),
		Vendor:       firstString(m, "vendor", "gpu_vendor", "brand"),
		GPUModel:     firstString(m, "gpu_model", "gpu_name", "gpu"),
		Tag:          firstString(m, "tag", "type", "market_type"),
		Location:     firstString(m, "location", "region", "country"),
		Architecture: firstString(m, "architecture", "cpu_arch"),
	}

	if listing.Name == "" {
		listing.Name = listing.GPUModel
	}

	listing.VRAMGB = firstNumber(m, "vram_gb", "vram", "gpu_vram", "gpu_memory_gb")
	if listing.VRAMGB == 0 {
		listing.VRAMGB = vramFromMetadata(m["metadata"])
	}
	listing.CPUCores = firstNumber(m, "cpu_cores", "cpu", "vcpu", "cores")
	listing.RAMGB = firstNumber(m, "ram_gb", "ram", "memory_gb")
	listing.PricePerHour = firstNumber(m, "price_per_hour", "price_per_hour_usd", "usd_reward_per_hour", "price")
	listing.Available = int(firstNumber(m, "available", "available_nodes", "availableNodes", "free_nodes"))
	if listing.Available == 0 {
		listing.Available = int(countOf(m["nodes"]))
	}

	// Vendor classification is backend responsibility — derived from explicit
	// fields (vendor / gpu_model) when present, then from the instance name.
	if listing.Vendor == "" {
		listing.Vendor = classifyVendor(listing.GPUModel)
	}
	if listing.Vendor == "" {
		listing.Vendor = classifyVendor(listing.Name)
	}

	// Device type: explicit field wins, then GPU evidence, then CPU evidence.
	listing.DeviceType = firstString(m, "device_type", "hardware_type")
	if listing.DeviceType == "" {
		switch {
		case listing.GPUModel != "" || listing.VRAMGB > 0:
			listing.DeviceType = "gpu"
		case listing.CPUCores > 0 && listing.VRAMGB == 0:
			listing.DeviceType = "cpu"
		}
	}

	return listing
}

func classifyVendor(gpuModel string) string {
	model := strings.ToLower(gpuModel)
	switch {
	case model == "":
		return ""
	case strings.Contains(model, "nvidia"), strings.Contains(model, "rtx"),
		strings.Contains(model, "gtx"), strings.Contains(model, "tesla"),
		strings.Contains(model, "quadro"):
		return "NVIDIA"
	case strings.Contains(model, "amd"), strings.Contains(model, "radeon"),
		strings.Contains(model, "instinct"), strings.Contains(model, "mi3"):
		return "AMD"
	case strings.Contains(model, "apple"), strings.Contains(model, " m1"),
		strings.Contains(model, " m2"), strings.Contains(model, " m3"),
		strings.Contains(model, " m4"):
		return "Apple"
	case strings.Contains(model, "intel"), strings.Contains(model, "arc"):
		return "Intel"
	default:
		return ""
	}
}

// vramFromMetadata extracts VRAM from provider key/value metadata arrays,
// e.g. Nosana's [{"key":"vram","value":"24GB"}].
func vramFromMetadata(metadata any) float64 {
	entries, ok := metadata.([]any)
	if !ok {
		return 0
	}
	for _, entry := range entries {
		item, ok := entry.(map[string]any)
		if !ok {
			continue
		}
		if key, _ := item["key"].(string); !strings.EqualFold(key, "vram") {
			continue
		}
		switch value := item["value"].(type) {
		case float64:
			return value
		case string:
			if parsed, err := strconv.ParseFloat(leadingNumber(value), 64); err == nil {
				return parsed
			}
		}
	}
	return 0
}

// countOf returns the length of an array value, e.g. Nosana's list of
// connected nodes for a market.
func countOf(v any) float64 {
	if arr, ok := v.([]any); ok {
		return float64(len(arr))
	}
	return 0
}

// leadingNumber returns the first numeric run in a string like "24GB".
func leadingNumber(s string) string {
	for start := 0; start < len(s); start++ {
		if s[start] >= '0' && s[start] <= '9' {
			end := start
			for end < len(s) && ((s[end] >= '0' && s[end] <= '9') || s[end] == '.') {
				end++
			}
			return s[start:end]
		}
	}
	return ""
}

func firstString(m map[string]any, keys ...string) string {
	for _, key := range keys {
		if v, ok := m[key]; ok {
			switch value := v.(type) {
			case string:
				if value != "" {
					return value
				}
			case float64:
				return strconv.FormatFloat(value, 'f', -1, 64)
			}
		}
	}
	return ""
}

func firstNumber(m map[string]any, keys ...string) float64 {
	for _, key := range keys {
		if v, ok := m[key]; ok {
			switch value := v.(type) {
			case float64:
				return value
			case int:
				return float64(value)
			case int64:
				return float64(value)
			case string:
				if parsed, err := strconv.ParseFloat(strings.TrimSpace(value), 64); err == nil {
					return parsed
				}
			}
		}
	}
	return 0
}
