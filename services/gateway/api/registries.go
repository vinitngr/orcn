package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"orcn/models"
	"time"
)

func (s *Server) handleListRegistries(w http.ResponseWriter, r *http.Request) {
	var registries []models.Registry
	// We specifically omit the password field when sending data to the frontend for security.
	if err := s.DB.Select("id", "name", "server_url", "username", "created_at", "updated_at").Find(&registries).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to list registries")
		return
	}
	respondJSON(w, http.StatusOK, registries)
}

func (s *Server) handleCreateRegistry(w http.ResponseWriter, r *http.Request) {
	var reg models.Registry
	if err := json.NewDecoder(r.Body).Decode(&reg); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if reg.Name == "" || reg.ServerURL == "" || reg.Username == "" || reg.Password == "" {
		respondError(w, http.StatusBadRequest, "Name, ServerURL, Username, and Password are required")
		return
	}

	reg.ID = fmt.Sprintf("reg-%d", time.Now().UnixNano())

	if err := s.DB.Create(&reg).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create registry")
		return
	}

	reg.Password = "" // Hide password in response
	respondJSON(w, http.StatusCreated, reg)
}

func (s *Server) handleDeleteRegistry(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var reg models.Registry
	if err := s.DB.First(&reg, "id = ?", id).Error; err != nil {
		respondError(w, http.StatusNotFound, "Registry not found")
		return
	}

	if err := s.DB.Delete(&reg).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete registry")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}