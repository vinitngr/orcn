package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	
	"orcn/core"
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
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}
	defer r.Body.Close()

	isValid, validationErrors := core.ValidateJobSpecBytes(bodyBytes)
	if !isValid {
		respondJSON(w, http.StatusBadRequest, map[string]any{
			"error": "Invalid Template Specification",
			"details": validationErrors,
		})
		return
	}

	var spec core.TemplateSpecV2
	json.Unmarshal(bodyBytes, &spec)

	image := ""
	if len(spec.Containers) > 0 {
		image = spec.Containers[0].Args.Image
	}

	template := models.Template{
		ID:          generateID("temp"),
		Name:        spec.Name,
		Image:       image,
		ComputeType: spec.ComputeType,
		Data:        string(bodyBytes),
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

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}
	defer r.Body.Close()

	isValid, validationErrors := core.ValidateJobSpecBytes(bodyBytes)
	if !isValid {
		respondJSON(w, http.StatusBadRequest, map[string]any{
			"error": "Invalid Template Specification",
			"details": validationErrors,
		})
		return
	}

	var spec core.TemplateSpecV2
	json.Unmarshal(bodyBytes, &spec)

	template.Name = spec.Name
	if len(spec.Containers) > 0 {
		template.Image = spec.Containers[0].Args.Image
	}
	template.ComputeType = spec.ComputeType
	template.Data = string(bodyBytes)

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
