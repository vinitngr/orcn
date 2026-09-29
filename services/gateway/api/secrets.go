package api

import (
	"encoding/json"
	"net/http"

	"orcn/core/logger"
	"orcn/core/secret"
	"orcn/models"

	"gorm.io/gorm"
)

var secretLog = logger.New("SECRETS")

type SecretRequest struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description"`
	Type        string `json:"type" validate:"required"`
	Value       string `json:"value" validate:"required"`
	Metadata    string `json:"metadata"`
}

func (s *Server) handleCreateSecret(w http.ResponseWriter, r *http.Request) {
	var req SecretRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	orgID := getOrgID(r)
	userID := getUserID(r)

	ciphertext, encryptedDEK, nonce, err := secret.EncryptSecret(r.Context(), s.Cfg, []byte(req.Value))
	if err != nil {
		secretLog.Error("encrypt secret: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to encrypt secret")
		return
	}

	sec := models.Secret{
		OrganizationID: orgID,
		Name:           req.Name,
		Description:    req.Description,
		Type:           req.Type,
		Ciphertext:     ciphertext,
		EncryptedDEK:   encryptedDEK,
		Nonce:          nonce,
		KeyVersion:     "v1",
		Metadata:       req.Metadata,
		CreatedBy:      userID,
	}

	if err := s.DB.Create(&sec).Error; err != nil {
		secretLog.Error("failed to create secret: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to create secret")
		return
	}

	respondJSON(w, http.StatusCreated, sec)
}

func (s *Server) handleListSecrets(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r)
	var secrets []models.Secret
	if err := s.DB.Where("organization_id = ?", orgID).Find(&secrets).Error; err != nil {
		secretLog.Error("list secrets: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to list secrets")
		return
	}
	respondJSON(w, http.StatusOK, secrets)
}

func (s *Server) handleGetSecret(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	orgID := getOrgID(r)

	var sec models.Secret
	if err := s.DB.Where("id = ? AND organization_id = ?", id, orgID).First(&sec).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			respondError(w, http.StatusNotFound, "secret not found")
			return
		}
		secretLog.Error("get secret: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to get secret")
		return
	}

	plaintext, err := secret.DecryptSecret(r.Context(), s.Cfg, sec.Ciphertext, sec.EncryptedDEK, sec.Nonce)
	if err != nil {
		secretLog.Error("decrypt secret: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to decrypt secret")
		return
	}

	response := map[string]interface{}{
		"id":              sec.ID,
		"organization_id": sec.OrganizationID,
		"name":            sec.Name,
		"description":     sec.Description,
		"type":            sec.Type,
		"value":           string(plaintext),
		"metadata":        sec.Metadata,
		"created_by":      sec.CreatedBy,
		"created_at":      sec.CreatedAt,
		"updated_at":      sec.UpdatedAt,
	}
	respondJSON(w, http.StatusOK, response)
}

func (s *Server) handleDeleteSecret(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	orgID := getOrgID(r)

	if err := s.DB.Where("id = ? AND organization_id = ?", id, orgID).Delete(&models.Secret{}).Error; err != nil {
		secretLog.Error("delete secret: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to delete secret")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func getUserID(r *http.Request) string {
	if uid := r.Header.Get("X-User-ID"); uid != "" {
		return uid
	}
	return "system"
}
