package api

import (
	"net/http"
	"orcn/models"
)

func (s *Server) handleListEndpoints(w http.ResponseWriter, r *http.Request) {
	deploymentID := r.URL.Query().Get("deployment_id")
	
	var endpoints []models.RouteEndpoint
	query := s.DB.Model(&models.RouteEndpoint{})
	
	if deploymentID != "" {
		query = query.Where("deployment_id = ?", deploymentID)
	}
	
	if err := query.Find(&endpoints).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to list endpoints")
		return
	}
	
	respondJSON(w, http.StatusOK, endpoints)
}
