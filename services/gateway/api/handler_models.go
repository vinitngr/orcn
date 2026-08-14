package api

import (
	"net/http"

	"orcn/core"
)

func (s *Server) handleSearchModels(w http.ResponseWriter, r *http.Request) {
	runtimeID := r.URL.Query().Get("runtime")
	query := r.URL.Query().Get("q")
	task := core.NormalizeModelTask(core.ModelTask(r.URL.Query().Get("task")))

	if runtimeID == "" || query == "" {
		respondError(w, http.StatusBadRequest, "Missing runtime or q parameter")
		return
	}

	runtime, err := core.GetRuntime(runtimeID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	results, err := runtime.SearchModels(query, task)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"runtime": runtimeID,
		"results": results,
	})
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
