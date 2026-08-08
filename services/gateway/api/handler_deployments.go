package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"orcn/core"
	"orcn/models"

	"gorm.io/gorm"
)

type createDeploymentRequest struct {
	Name           string            `json:"name"`
	TemplateID     string            `json:"template_id"`
	ProviderID     string            `json:"provider_id"`
	InstanceTypeID string            `json:"instance_type_id"`
	InstanceName   string            `json:"instance_name"`
	RuntimeID      string            `json:"runtime_id"`
	ModelID        string            `json:"model_id"`
	Replicas       int               `json:"replicas"`
	HFToken        string            `json:"hf_token,omitempty"`
	AdvancedConfig map[string]string `json:"advanced_config,omitempty"`
}

type actionRequest struct {
	Action         string `json:"action"`
	TimeoutMinutes int    `json:"timeout_minutes,omitempty"`
}

func validateDeploymentName(name string, db *gorm.DB) error {
	reservedNames := map[string]bool{"llm": true, "embedding": true}
	if reservedNames[name] {
		return fmt.Errorf("the deployment name '%s' is reserved for system use", name)
	}
	var count int64
	db.Model(&models.Deployment{}).Where("name = ?", name).Count(&count)
	if count > 0 {
		return fmt.Errorf("a deployment with the name '%s' already exists", name)
	}
	return nil
}

func (s *Server) handleCreateDeployment(w http.ResponseWriter, r *http.Request) {
	var req createDeploymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := validateDeploymentName(req.Name, s.DB); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
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

	spec, err := runtime.BuildJobSpec(req.ModelID, req.AdvancedConfig)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to build job spec: "+err.Error())
		return
	}

	if req.HFToken != "" {
		for i := range spec.Containers {
			if spec.Containers[i].Args.Env == nil {
				spec.Containers[i].Args.Env = make(map[string]string)
			}
			spec.Containers[i].Args.Env["HF_TOKEN"] = req.HFToken
		}
	}

	if req.Replicas <= 0 {
		req.Replicas = 1
	}

	specBytes, _ := json.Marshal(spec)
	specJSON := string(specBytes)

	// 1. Create the parent Deployment row
	deploymentID := fmt.Sprintf("dep-%s-%d", req.Name, time.Now().UnixMilli())
	dbDeployment := models.Deployment{
		ID:             deploymentID,
		Name:           req.Name,
		TemplateID:     req.TemplateID,
		Status:         models.DeploymentDraft,
		ProviderID:     req.ProviderID,
		InstanceName:   req.InstanceName,
		InstanceTypeID: req.InstanceTypeID,
		RuntimeID:      req.RuntimeID,
		ModelID:        req.ModelID,
		Replicas:       req.Replicas,
		JobSpecJSON:    specJSON,
	}
	if err := s.DB.Create(&dbDeployment).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to save deployment: "+err.Error())
		return
	}

	// 2. Loop to create Nodes (each provider job = 1 Node)
	var createdNodeIDs []string
	var lastErr error

	for i := 0; i < req.Replicas; i++ {
		providerJobID, err := provider.CreateDeployment(req.Name, req.InstanceTypeID, spec)
		if err != nil {
			lastErr = err
			break
		}

		node := models.Node{
			ID:           providerJobID,
			DeploymentID: deploymentID,
			ProviderID:   req.ProviderID,
			InfraStatus:  models.InfraPending,
			AppStatus:    models.AppPending,
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
		dbDeployment.Status = models.DeploymentPartial
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
	if err := s.DB.Preload("Nodes").Preload("Endpoints").Where("id = ? OR name = ?", idOrName, idOrName).First(&dep).Error; err != nil {
		respondError(w, http.StatusNotFound, "Deployment not found")
		return
	}

	respondJSON(w, http.StatusOK, dep)
}

func (s *Server) handleListDeployments(w http.ResponseWriter, r *http.Request) {
	var deployments []models.Deployment
	if err := s.DB.Preload("Nodes").Preload("Endpoints").Find(&deployments).Error; err != nil {
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

func (s *Server) handleGetInternalRoutes(w http.ResponseWriter, r *http.Request) {
	var deps []models.Deployment
	if err := s.DB.Preload("Nodes").Where("status IN ?", []string{models.DeploymentReady, models.DeploymentRunning}).Find(&deps).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch internal routes")
		return
	}
	respondJSON(w, http.StatusOK, deps)
}

// Helper Functions for Endpoint Generation
func (s *Server) generateDeploymentEndpoints(deploymentID, name string, ports []int) {
	for i, port := range ports {
		s.DB.Create(&models.RouteEndpoint{
			ID:           fmt.Sprintf("ep-dep-%s-%d", deploymentID, port),
			Subdomain:    fmt.Sprintf("%s-%d", name, port),
			TargetPort:   port,
			Type:         models.EndpointTypeDeployment,
			DeploymentID: deploymentID,
		})
		// First port acts as the primary wildcard route
		if i == 0 {
			s.DB.Create(&models.RouteEndpoint{
				ID:           fmt.Sprintf("ep-dep-%s-primary", deploymentID),
				Subdomain:    name,
				TargetPort:   port,
				Type:         models.EndpointTypeDeployment,
				DeploymentID: deploymentID,
			})
		}
	}
}

func (s *Server) generateNodeEndpoints(deploymentID, nodeID string, ports []int) {
	shortNodeID := nodeID
	if len(shortNodeID) > 8 {
		shortNodeID = shortNodeID[:8]
	}
	for i, port := range ports {
		s.DB.Create(&models.RouteEndpoint{
			ID:           fmt.Sprintf("ep-node-%s-%d", shortNodeID, port),
			Subdomain:    fmt.Sprintf("%s-%d", shortNodeID, port),
			TargetPort:   port,
			Type:         models.EndpointTypeNode,
			DeploymentID: deploymentID,
			NodeID:       nodeID,
		})
		// First port acts as the primary wildcard route for this node
		if i == 0 {
			s.DB.Create(&models.RouteEndpoint{
				ID:           fmt.Sprintf("ep-node-%s-primary", shortNodeID),
				Subdomain:    shortNodeID,
				TargetPort:   port,
				Type:         models.EndpointTypeNode,
				DeploymentID: deploymentID,
				NodeID:       nodeID,
			})
		}
	}
}

type createWorkloadRequest struct {
	Name           string          `json:"name"`
	TemplateID     string          `json:"template_id"`
	ProviderID     string          `json:"provider_id"`
	InstanceTypeID string          `json:"instance_type_id"`
	InstanceName   string          `json:"instance_name"`
	Replicas       int             `json:"replicas"`
	Spec           json.RawMessage `json:"spec"`
}

func (s *Server) handleCreateWorkload(w http.ResponseWriter, r *http.Request) {
	var req createWorkloadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := validateDeploymentName(req.Name, s.DB); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	provider, err := core.GetProvider(req.ProviderID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid provider_id")
		return
	}

	if req.Replicas <= 0 {
		req.Replicas = 1
	}

	// 1. Strict Validation of the incoming Raw Spec!
	valid, validationErrors := core.ValidateJobSpecBytes(req.Spec)
	if !valid {
		respondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"error":   "Spec validation failed",
			"details": validationErrors,
		})
		return
	}

	var v2Spec core.TemplateSpecV2
	_ = json.Unmarshal(req.Spec, &v2Spec)

	// 2. Convert to Internal Provider Format
	internalSpec := core.ConvertTemplateSpecV2ToJobSpec(&v2Spec)

	// 3. Create the Database Record to archive this deployment
	deploymentID := fmt.Sprintf("workload-%s-%d", req.Name, time.Now().UnixMilli())
	dbDeployment := models.Deployment{
		ID:             deploymentID,
		Name:           req.Name,
		TemplateID:     req.TemplateID,
		Status:         models.DeploymentDraft,
		ProviderID:     req.ProviderID,
		InstanceName:   req.InstanceName,
		InstanceTypeID: req.InstanceTypeID,
		WorkloadType:   "container",
		Replicas:       req.Replicas,
		JobSpecJSON:    string(req.Spec),
	}

	if err := s.DB.Create(&dbDeployment).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to save deployment to db: "+err.Error())
		return
	}
	
	// 3.5 Generate Database Endpoints for UI to query
	var ports []int
	for _, c := range internalSpec.Containers {
		for _, p := range c.Args.Expose {
			ports = append(ports, p.Port)
		}
	}
	s.generateDeploymentEndpoints(dbDeployment.ID, req.Name, ports)

	// 4. Launch on the infrastructure
	var createdNodeIDs []string
	var lastErr error

	for i := 0; i < req.Replicas; i++ {
		providerJobID, err := provider.CreateDeployment(req.Name, req.InstanceTypeID, internalSpec)
		if err != nil {
			lastErr = err
			break
		}

		node := models.Node{
			ID:           providerJobID,
			DeploymentID: deploymentID,
			ProviderID:   req.ProviderID,
			InfraStatus:  models.InfraPending,
			AppStatus:    models.AppPending,
		}
		if err := s.DB.Create(&node).Error; err != nil {
			lastErr = fmt.Errorf("failed to save node to db: %v", err)
			break
		}
		createdNodeIDs = append(createdNodeIDs, providerJobID)
		
		s.generateNodeEndpoints(dbDeployment.ID, providerJobID, ports)
	}

	if len(createdNodeIDs) == 0 && lastErr != nil {
		s.DB.Delete(&dbDeployment)
		respondError(w, http.StatusInternalServerError, "Failed to deploy on provider: "+lastErr.Error())
		return
	}

	if lastErr != nil {
		dbDeployment.Status = models.DeploymentPartial
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
			"Partial failure: Only created %d of %d replicas. Error: %s",
			len(createdNodeIDs), req.Replicas, lastErr.Error(),
		)
	}

	respondJSON(w, http.StatusCreated, response)
}