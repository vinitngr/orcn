package api

import (
	"encoding/json"
	"net/http"
	"orcn/models"
)

func (s *Server) handleListSecrets(w http.ResponseWriter, r *http.Request) {
	var secrets []models.Secret
	if err := s.DB.Select("name", "description", "created_at", "updated_at").Find(&secrets).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to list secrets")
		return
	}
	respondJSON(w, http.StatusOK, secrets)
}

func (s *Server) handleCreateSecret(w http.ResponseWriter, r *http.Request) {
	var secret models.Secret
	if err := json.NewDecoder(r.Body).Decode(&secret); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if secret.Name == "" || secret.Value == "" {
		respondError(w, http.StatusBadRequest, "Name and Value are required")
		return
	}

	if err := s.DB.Create(&secret).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create secret")
		return
	}

	// Don't return the raw value in the response
	secret.Value = ""
	respondJSON(w, http.StatusCreated, secret)
}

func (s *Server) handleDeleteSecret(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if err := s.DB.Where("name = ?", name).Delete(&models.Secret{}).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete secret")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
