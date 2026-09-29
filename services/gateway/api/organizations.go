package api

import (
	"net/http"

	"orcn/models"
	"orcn/core/logger"
	"gorm.io/gorm"
)

var orgLog = logger.New("ORGANIZATIONS")

func (s *Server) handleListOrganizations(w http.ResponseWriter, r *http.Request) {
	var orgs []models.Organization
	if err := s.DB.Find(&orgs).Error; err != nil {
		orgLog.Error("list organizations: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to list organizations")
		return
	}
	respondJSON(w, http.StatusOK, orgs)
}

func (s *Server) handleGetOrganization(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var org models.Organization
	if err := s.DB.Where("id = ?", id).First(&org).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			respondError(w, http.StatusNotFound, "organization not found")
			return
		}
		orgLog.Error("get organization: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to get organization")
		return
	}
	respondJSON(w, http.StatusOK, org)
}
