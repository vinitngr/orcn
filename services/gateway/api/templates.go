package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"orcn/models"
)

func generateID(prefix string) string {
	b := make([]byte, 6)
	rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
}

func (s *Server) handleListTemplates(w http.ResponseWriter, r *http.Request) {
	var templates []models.Template
	if err := s.DB.Find(&templates).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to list templates")
		return
	}
	respondJSON(w, http.StatusOK, templates)
}

func (s *Server) handleCreateTemplate(w http.ResponseWriter, r *http.Request) {
	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	name, _ := payload["name"].(string)
	image, _ := payload["image"].(string)
	computeType, _ := payload["computeType"].(string)

	if name == "" || image == "" {
		respondError(w, http.StatusBadRequest, "Name and Image are required")
		return
	}

	// Remove top level fields so we can store the rest in Data
	delete(payload, "name")
	delete(payload, "image")
	delete(payload, "computeType")
	
	dataBytes, _ := json.Marshal(payload)

	template := models.Template{
		ID:          generateID("temp"),
		Name:        name,
		Image:       image,
		ComputeType: computeType,
		Data:        string(dataBytes),
	}

	if err := s.DB.Create(&template).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create template")
		return
	}

	respondJSON(w, http.StatusCreated, template)
}

func (s *Server) handleGetTemplate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var template models.Template
	if err := s.DB.Where("id = ?", id).First(&template).Error; err != nil {
		respondError(w, http.StatusNotFound, "Template not found")
		return
	}
	respondJSON(w, http.StatusOK, template)
}

func (s *Server) handleUpdateTemplate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var template models.Template
	if err := s.DB.Where("id = ?", id).First(&template).Error; err != nil {
		respondError(w, http.StatusNotFound, "Template not found")
		return
	}

	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if name, ok := payload["name"].(string); ok && name != "" {
		template.Name = name
	}
	if image, ok := payload["image"].(string); ok && image != "" {
		template.Image = image
	}
	if computeType, ok := payload["computeType"].(string); ok && computeType != "" {
		template.ComputeType = computeType
	}

	delete(payload, "name")
	delete(payload, "image")
	delete(payload, "computeType")
	delete(payload, "id")
	delete(payload, "created_at")
	delete(payload, "updated_at")

	dataBytes, _ := json.Marshal(payload)
	template.Data = string(dataBytes)

	if err := s.DB.Save(&template).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update template")
		return
	}

	respondJSON(w, http.StatusOK, template)
}

func (s *Server) handleDeleteTemplate(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := s.DB.Where("id = ?", id).Delete(&models.Template{}).Error; err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete template")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
