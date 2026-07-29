package api

import (
	"net/http"

	"orcn/core"
)

func (s *Server) handleGetMarkets(w http.ResponseWriter, r *http.Request) {
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
