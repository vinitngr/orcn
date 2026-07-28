package main

import (
	"encoding/json"
	"net/http"
	"time"

	"orcn/core"
	"orcn/models"
)

func (s *Server) handleSearchModels(w http.ResponseWriter, r *http.Request) {
	runtimeID := r.URL.Query().Get("runtime")
	query := r.URL.Query().Get("q")

	if runtimeID == "" || query == "" {
		respondError(w, http.StatusBadRequest, "Missing runtime or q parameter")
		return
	}

	runtime, err := core.GetRuntime(runtimeID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	results, err := runtime.SearchModels(query)
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

	if runtimeID == "" || modelID == "" {
		respondError(w, http.StatusBadRequest, "Missing runtime or model parameter")
		return
	}

	runtime, err := core.GetRuntime(runtimeID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	details, err := runtime.GetModelDetails(modelID)
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

type createDeploymentRequest struct {
	Name           string `json:"name"`
	ProviderID     string `json:"provider_id"`
	MarketID       string `json:"market_id"`
	RuntimeID      string `json:"runtime_id"`
	ModelID        string `json:"model_id"`
	TimeoutMinutes int    `json:"timeout_minutes"`
	Replicas       int    `json:"replicas"`
	Strategy       string `json:"strategy"`
	HFToken        string `json:"hf_token,omitempty"`
}

func (s *Server) handleCreateDeployment(w http.ResponseWriter, r *http.Request) {
	var req createDeploymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	runtime, err := core.GetRuntime(req.RuntimeID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid runtime_id")
		return
	}

	provider, err := core.GetProvider(req.ProviderID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid provider_id")
		return
	}

	spec, err := runtime.BuildContainerSpec(req.ModelID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to build container spec: "+err.Error())
		return
	}

	if req.HFToken != "" {
		if spec.Env == nil {
			spec.Env = make(map[string]string)
		}
		spec.Env["HF_TOKEN"] = req.HFToken
	}

	if req.Replicas <= 0 {
		req.Replicas = 1
	}

	deploymentID, err := provider.CreateDeployment(req.Name, req.MarketID, spec, req.Replicas, req.Strategy, req.TimeoutMinutes)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create deployment: "+err.Error())
		return
	}

	dbDeployment := models.Deployment{
		Name:         req.Name,
		ProviderID:   req.ProviderID,
		ID:           deploymentID,
		MarketID:     req.MarketID,
		ModelID:      req.ModelID,
		Status:       "DRAFT",
	}
	s.DB.Create(&dbDeployment)

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"deployment_id": deploymentID,
		"status":        "DRAFT",
		"created_at":    time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Server) handleGetDeployment(w http.ResponseWriter, r *http.Request) {
	deploymentID := r.PathValue("id")
	
	var dep models.Deployment
	if err := s.DB.Where("id = ?", deploymentID).First(&dep).Error; err != nil {
		respondError(w, http.StatusNotFound, "Deployment not found in DB")
		return
	}

	provider, err := core.GetProvider(dep.ProviderID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Provider missing for this deployment")
		return
	}

	status, err := provider.GetStatus(deploymentID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch remote status: "+err.Error())
		return
	}

	// Update DB Status
	if dep.Status != status {
		dep.Status = status
		s.DB.Save(&dep)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"deployment_id": deploymentID,
		"status":        status,
	})
}

type actionRequest struct {
	Action         string `json:"action"`
	TimeoutMinutes int    `json:"timeout_minutes,omitempty"`
}

func (s *Server) handleDeploymentAction(w http.ResponseWriter, r *http.Request) {
	deploymentID := r.PathValue("id")

	var dep models.Deployment
	if err := s.DB.Where("id = ?", deploymentID).First(&dep).Error; err != nil {
		respondError(w, http.StatusNotFound, "Deployment not found in DB")
		return
	}

	provider, err := core.GetProvider(dep.ProviderID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Provider missing")
		return
	}

	var req actionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var actionErr error
	switch req.Action {
	case "start":
		actionErr = provider.StartDeployment(deploymentID)
	case "stop":
		actionErr = provider.StopDeployment(deploymentID)
	case "update_timeout":
		if req.TimeoutMinutes == 0 {
			respondError(w, http.StatusBadRequest, "timeout_minutes required for update_timeout action")
			return
		}
		actionErr = provider.UpdateTimeout(deploymentID, req.TimeoutMinutes)
	default:
		respondError(w, http.StatusBadRequest, "Unknown action")
		return
	}

	if actionErr != nil {
		respondError(w, http.StatusInternalServerError, "Action failed: "+actionErr.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"deployment_id": deploymentID,
		"message":       "Action successfully processed",
	})
}
