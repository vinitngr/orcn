package api

import (
	"net/http"

	"orcn/core"
)

func (s *Server) handleGetRuntimeSchema(w http.ResponseWriter, r *http.Request) {
	runtimeID := r.URL.Query().Get("runtime")
	if runtimeID == "" {
		respondError(w, http.StatusBadRequest, "Missing runtime parameter")
		return
	}

	runtime, err := core.GetRuntime(runtimeID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	schema := runtime.GetAdvancedConfigSchema()
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"runtime": runtimeID,
		"schema":  schema,
	})
}
