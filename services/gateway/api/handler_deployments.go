package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"orcn/core"
	"orcn/models"
)

type createDeploymentRequest struct {
	Name       string `json:"name"`
	ProviderID string `json:"provider_id"`
	MarketID   string `json:"market_id"`
	RuntimeID  string `json:"runtime_id"`
	ModelID        string            `json:"model_id"`
	Replicas       int               `json:"replicas"`
	HFToken        string            `json:"hf_token,omitempty"`
	AdvancedConfig map[string]string `json:"advanced_config,omitempty"`
}

type actionRequest struct {
	Action         string `json:"action"`
	TimeoutMinutes int    `json:"timeout_minutes,omitempty"`
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

	spec, err := runtime.BuildContainerSpec(req.ModelID, req.AdvancedConfig)
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
		ID:          deploymentID,
		Name:        req.Name,
		Status:      "DRAFT",
		ProviderID:  req.ProviderID,
		MarketID:    req.MarketID,
		RuntimeID:   req.RuntimeID,
		ModelID:     req.ModelID,
		Replicas:    req.Replicas,
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
		response["warning"] = fmt.Sprintf(
			"Partial failure: Only created %d of %d nodes. Error: %s",
			len(createdNodeIDs), req.Replicas, lastErr.Error(),
		)
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
				ep := info.Endpoints[0]
				go s.Health.RunCheck(node.ID, ep.BaseURL, ep.Protocol, hcPath, hcExpected)
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

func (s *Server) handleListDeployments(w http.ResponseWriter, r *http.Request) {
	var deployments []models.Deployment
	if err := s.DB.Preload("Nodes").Find(&deployments).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch deployments")
		return
	}
	respondJSON(w, http.StatusOK, deployments)
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