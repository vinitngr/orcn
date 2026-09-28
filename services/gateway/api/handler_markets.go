package api

import (
	"net/http"

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

func (s *Server) handleListProviders(w http.ResponseWriter, r *http.Request) {
	providersList := []ProviderCapability{
		{
			ID:               "nosana",
			Name:             "Nosana Network",
			Description:      "Decentralized GPU compute network powered by Solana.",
			Type:             "depin",
			HasVolumeSupport: false,
			RequiresRegions:  false,
			RequiresVPC:      false,
			Features:         []string{"On-demand GPUs", "Competitive Pricing", "Pay-as-you-go"},
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

func (s *Server) handleGetMarkets(w http.ResponseWriter, r *http.Request) {
	providerID := r.URL.Query().Get("provider")

	if providerID == "" {
		respondError(w, http.StatusBadRequest, "Missing provider parameter")
		return
	}

	if providerID == "local" {
		localMarkets := []map[string]interface{}{
			{
				"id":           "local-default",
				"name":         "Host GPU / Hardware",
				"vendor":       "NVIDIA / Local Host",
				"vram_gb":      24,
				"cpu_cores":    16,
				"ram_gb":       64,
				"price":        0.00,
				"available":    1,
				"tag":          "Local Node",
				"location":     "localhost",
				"architecture": "Local Host Engine",
			},
		}
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"provider": "local",
			"markets":  localMarkets,
		})
		return
	}

	provider, err := core.GetProvider(providerID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	markets, err := provider.GetMarkets()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"provider": providerID,
		"markets":  markets,
	})
}
