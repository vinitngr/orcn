package main

import (
	"encoding/json"
	"fmt"
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
	Name       string `json:"name"`
	ProviderID string `json:"provider_id"`
	MarketID   string `json:"market_id"`
	RuntimeID  string `json:"runtime_id"`
	ModelID    string `json:"model_id"`
	Replicas   int    `json:"replicas"`
	HFToken    string `json:"hf_token,omitempty"`
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

	specBytes, _ := json.Marshal(spec)
	specJSON := string(specBytes)

	// 1. Create the parent Deployment row
	deploymentID := fmt.Sprintf("dep-%s-%d", req.Name, time.Now().UnixMilli())
	dbDeployment := models.Deployment{
		ID:         deploymentID,
		Name:       req.Name,
		Status:     "DRAFT",
		ProviderID: req.ProviderID,
		MarketID:   req.MarketID,
		RuntimeID:  req.RuntimeID,
		ModelID:    req.ModelID,
		Replicas:   req.Replicas,
		JobSpecJSON: specJSON,
	}
	if err := s.DB.Create(&dbDeployment).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to save deployment: "+err.Error())
		return
	}

	// 2. Loop to create Nodes (each provider job = 1 Node)
	var createdNodeIDs []string
	var lastErr error

	for i := 0; i < req.Replicas; i++ {
		providerJobID, err := provider.CreateDeployment(req.Name, req.MarketID, spec)
		if err != nil {
			lastErr = err
			break
		}

		node := models.Node{
			ID:           providerJobID,
			DeploymentID: deploymentID,
			ProviderID:   req.ProviderID,
			Status:       "PENDING",
		}
		if err := s.DB.Create(&node).Error; err != nil {
			lastErr = fmt.Errorf("failed to save node to db: %v", err)
			break
		}
		createdNodeIDs = append(createdNodeIDs, providerJobID)
	}

	if len(createdNodeIDs) == 0 && lastErr != nil {
		s.DB.Delete(&dbDeployment)
		respondError(w, http.StatusInternalServerError, "Failed to create nodes: "+lastErr.Error())
		return
	}

	if lastErr != nil {
		dbDeployment.Status = "PARTIAL"
		dbDeployment.Replicas = len(createdNodeIDs)
	}
	s.DB.Save(&dbDeployment)

	response := map[string]interface{}{
		"deployment_id": deploymentID,
		"node_ids":      createdNodeIDs,
		"status":        dbDeployment.Status,
		"created_at":    time.Now().UTC().Format(time.RFC3339),
	}

	if lastErr != nil {
		response["warning"] = fmt.Sprintf("Partial failure: Only created %d of %d nodes. Error: %s", len(createdNodeIDs), req.Replicas, lastErr.Error())
	}

	respondJSON(w, http.StatusCreated, response)
}

func (s *Server) handleGetDeployment(w http.ResponseWriter, r *http.Request) {
	idOrName := r.PathValue("id")
	
	var dep models.Deployment
	if err := s.DB.Preload("Nodes").Where("id = ? OR name = ?", idOrName, idOrName).First(&dep).Error; err != nil {
		respondError(w, http.StatusNotFound, "Deployment not found")
		return
	}

	provider, err := core.GetProvider(dep.ProviderID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Provider missing for this deployment")
		return
	}

	var spec core.ContainerSpec
	json.Unmarshal([]byte(dep.JobSpecJSON), &spec)
	
	var hcPath string
	var hcExpected int
	for _, p := range spec.Ports {
		if p.HealthCheck.Path != "" {
			hcPath = p.HealthCheck.Path
			hcExpected = p.HealthCheck.ExpectedStatus
			if hcExpected == 0 {
				hcExpected = 200
			}
			break
		}
	}

	hasRunningNode := false
	hasReadyNode := false
	allCompleted := true

	for i := range dep.Nodes {
		node := &dep.Nodes[i]
		info, err := provider.GetNodeInfo(node.ID)
		if err == nil && info != nil {
			if node.Status != info.Status {
				if !(node.Status == "READY" && info.Status == "RUNNING") {
					node.Status = info.Status
				}
			}
			if len(info.Endpoints) > 0 {
				if b, err := json.Marshal(info.Endpoints); err == nil {
					node.EndpointsJSON = string(b)
				}
			}

			if node.Status == "RUNNING" && len(info.Endpoints) > 0 && hcPath != "" {
				go s.runHealthCheck(node.ID, info.Endpoints[0], hcPath, hcExpected)
			}

			s.DB.Save(node)
		}
		
		switch node.Status {
		case "READY":
			hasReadyNode = true
			allCompleted = false
		case "RUNNING":
			hasRunningNode = true
			allCompleted = false
		case "PENDING", "DRAFT":
			allCompleted = false
		}
	}

	newStatus := dep.Status
	if hasReadyNode {
		newStatus = "READY"
	} else if hasRunningNode {
		newStatus = "RUNNING"
	} else if len(dep.Nodes) > 0 && allCompleted {
		newStatus = "STOPPED"
	}

	if dep.Status != newStatus {
		dep.Status = newStatus
		s.DB.Save(&dep)
	}

	respondJSON(w, http.StatusOK, dep)
}

type actionRequest struct {
	Action         string `json:"action"`
	TimeoutMinutes int    `json:"timeout_minutes,omitempty"`
}

func (s *Server) handleDeploymentAction(w http.ResponseWriter, r *http.Request) {
	deploymentID := r.PathValue("id")

	var dep models.Deployment
	if err := s.DB.Preload("Nodes").Where("id = ?", deploymentID).First(&dep).Error; err != nil {
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

	var lastErr error
	for _, node := range dep.Nodes {
		var actionErr error
		switch req.Action {
		case "start":
			actionErr = provider.StartDeployment(node.ID)
		case "stop":
			actionErr = provider.StopDeployment(node.ID)
		case "update_timeout":
			if req.TimeoutMinutes == 0 {
				respondError(w, http.StatusBadRequest, "timeout_minutes required for update_timeout action")
				return
			}
			actionErr = provider.UpdateTimeout(node.ID, req.TimeoutMinutes)
		default:
			respondError(w, http.StatusBadRequest, "Unknown action")
			return
		}
		
		if actionErr != nil {
			lastErr = actionErr
		}
	}

	if lastErr != nil {
		respondError(w, http.StatusInternalServerError, "Action failed on one or more nodes: "+lastErr.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"deployment_id": deploymentID,
		"message":       "Action successfully processed",
	})
}

func (s *Server) handleListDeployments(w http.ResponseWriter, r *http.Request) {
	var deployments []models.Deployment
	if err := s.DB.Preload("Nodes").Find(&deployments).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch deployments")
		return
	}
	respondJSON(w, http.StatusOK, deployments)
}

func (s *Server) runHealthCheck(nid string, endpoint core.Endpoint, hcPath string, expectedStatus int) {
	client := &http.Client{Timeout: 2 * time.Second}
	url := fmt.Sprintf("%s://%s%s", endpoint.Protocol, endpoint.BaseURL, hcPath)
	if endpoint.Port > 0 && endpoint.Port != 80 && endpoint.Port != 443 {
		url = fmt.Sprintf("%s://%s:%d%s", endpoint.Protocol, endpoint.BaseURL, endpoint.Port, hcPath)
	}

	resp, err := client.Get(url)
	if err == nil {
		if resp.StatusCode == expectedStatus {
			s.DB.Model(&models.Node{}).Where("id = ?", nid).Update("status", "READY")
		}
		resp.Body.Close()
	}
}
