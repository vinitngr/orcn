package api

import (
	"net/http"

	"orcn/core/providerconn"
	"orcn/models"
)

// handleNodeMetrics returns a live normalized telemetry snapshot for a node.
// History is not persisted — the console buffers samples while the Metrics tab
// is open. Revisit storage when a node agent emits real timeseries.
func (s *Server) handleNodeMetrics(w http.ResponseWriter, r *http.Request) {
	deploymentID := r.PathValue("id")
	nodeID := r.PathValue("node_id")

	var dep models.Deployment
	if err := s.DB.Preload("Nodes").Where("id = ? OR name = ?", deploymentID, deploymentID).First(&dep).Error; err != nil {
		respondError(w, http.StatusNotFound, "Deployment not found")
		return
	}

	var node *models.Node
	for i := range dep.Nodes {
		if dep.Nodes[i].ID == nodeID {
			node = &dep.Nodes[i]
			break
		}
	}
	if node == nil {
		respondError(w, http.StatusNotFound, "Node not found in this deployment")
		return
	}

	provider, err := providerconn.Resolve(r.Context(), s.DB, s.Cfg, dep.ProviderID, dep.ProviderConnectionID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Provider unavailable: "+err.Error())
		return
	}

	metrics, err := provider.GetNodeMetrics(node.ID)
	if err != nil {
		respondError(w, http.StatusBadGateway, "Failed to fetch node metrics: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, metrics)
}
