package api

import (
	"net/http"
	"strings"

	"orcn/core"
)

func (s *Server) handleSearchModels(w http.ResponseWriter, r *http.Request) {
	runtimeID := r.URL.Query().Get("runtime")
	query := r.URL.Query().Get("q")
	task := core.NormalizeModelTask(core.ModelTask(r.URL.Query().Get("task")))
	capabilities := core.NormalizeCapabilities(splitCSV(r.URL.Query().Get("capabilities")))

	if runtimeID == "" || query == "" {
		respondError(w, http.StatusBadRequest, "Missing runtime or q parameter")
		return
	}

	runtime, err := core.GetRuntime(runtimeID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	results, err := runtime.SearchModels(query, task, capabilities)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"runtime": runtimeID,
		"results": results,
	})
}

// splitCSV splits a comma-separated query value, trimming spaces and
// dropping empties. "tools, thinking" -> ["tools", "thinking"].
func splitCSV(value string) []string {
	if value == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func (s *Server) handleGetModelDetails(w http.ResponseWriter, r *http.Request) {
	runtimeID := r.URL.Query().Get("runtime")
	modelID := r.URL.Query().Get("model")
	task := core.NormalizeModelTask(core.ModelTask(r.URL.Query().Get("task")))

	if runtimeID == "" || modelID == "" {
		respondError(w, http.StatusBadRequest, "Missing runtime or model parameter")
		return
	}

	runtime, err := core.GetRuntime(runtimeID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	details, err := runtime.GetModelDetails(modelID, task)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"runtime": runtimeID,
		"model":   modelID,
		"details": details,
	})
}
