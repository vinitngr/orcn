package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"orcn/core"
	"orcn/core/logger"
	"orcn/core/providerconn"
	"orcn/core/secret"
	"orcn/models"

	"gorm.io/gorm"
)

var pcLog = logger.New("PROVIDER_CONNECTIONS")

// parseConnectionInput reads provider-defined fields from either a JSON body or a
// multipart/form-data body. File parts are returned as raw []byte so providers can
// parse them (e.g. a GCP service-account JSON upload).
func parseConnectionInput(r *http.Request) (map[string]any, error) {
	ct := r.Header.Get("Content-Type")
	if strings.HasPrefix(ct, "multipart/form-data") {
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			return nil, err
		}
		out := map[string]any{}
		if r.MultipartForm != nil {
			for k, v := range r.MultipartForm.Value {
				if len(v) > 0 {
					out[k] = v[0]
				}
			}
			for k, files := range r.MultipartForm.File {
				if len(files) == 0 {
					continue
				}
				f, err := files[0].Open()
				if err != nil {
					return nil, err
				}
				b, err := io.ReadAll(f)
				f.Close()
				if err != nil {
					return nil, err
				}
				out[k] = b
			}
		}
		return out, nil
	}

	var raw map[string]any
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		return nil, err
	}
	return raw, nil
}

// processAndVerify runs the provider pipeline for raw user input.
// The provider owns interpretation of all fields; infra only stores the result.
func processAndVerify(providerID string, raw map[string]any) (*core.ProviderConnectionConfig, string, error) {
	p, err := core.GetProvider(providerID)
	if err != nil {
		return nil, "", fmt.Errorf("provider not registered")
	}
	cfg, err := p.ProcessConnection(raw)
	if err != nil {
		return nil, "", err
	}
	status := "verified"
	if err := p.VerifyConnection(cfg); err != nil {
		status = "failed"
		return cfg, status, err
	}
	return cfg, status, nil
}

// storeConnectionConfig encrypts the secret part and persists the raw config part.
func (s *Server) storeConnectionConfig(r *http.Request, orgID, userID, providerID, name string, cfg *core.ProviderConnectionConfig, status string) (*models.ProviderConnection, error) {
	secretBytes, err := json.Marshal(cfg.Secret)
	if err != nil {
		return nil, err
	}
	ciphertext, encryptedDEK, nonce, err := secret.EncryptSecret(r.Context(), s.Cfg, secretBytes)
	if err != nil {
		return nil, err
	}

	sec := models.Secret{
		OrganizationID: orgID,
		Name:           fmt.Sprintf("%s/%s", providerID, name),
		Description:    "Provider connection credentials",
		Type:           "provider_connection",
		Ciphertext:     ciphertext,
		EncryptedDEK:   encryptedDEK,
		Nonce:          nonce,
		KeyVersion:     "v1",
		CreatedBy:      userID,
	}
	if err := s.DB.Create(&sec).Error; err != nil {
		return nil, err
	}

	configBytes, err := json.Marshal(cfg.Config)
	if err != nil {
		return nil, err
	}

	pc := models.ProviderConnection{
		OrganizationID:     orgID,
		Provider:           providerID,
		Name:               name,
		Config:             string(configBytes),
		CredentialSecretID: &sec.ID,
		Status:             status,
	}
	if err := s.DB.Create(&pc).Error; err != nil {
		return nil, err
	}
	return &pc, nil
}

func (s *Server) loadConnectionConfig(ctx context.Context, pc *models.ProviderConnection) (*core.ProviderConnectionConfig, error) {
	return providerconn.LoadConfig(ctx, s.DB, s.Cfg, pc)
}

// handleGetProviderConnectionSchema returns the connection form fields for one
// provider (or all providers when no ?provider= is supplied).
func (s *Server) handleGetProviderConnectionSchema(w http.ResponseWriter, r *http.Request) {
	providerID := r.URL.Query().Get("provider")
	if providerID == "" {
		schemas := map[string][]core.ProviderField{}
		for id, p := range core.ListProviders() {
			schemas[id] = p.ConnectionSchema()
		}
		respondJSON(w, http.StatusOK, schemas)
		return
	}

	p, err := core.GetProvider(providerID)
	if err != nil {
		respondError(w, http.StatusNotFound, "provider not registered")
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{
		"provider": providerID,
		"fields":   p.ConnectionSchema(),
	})
}

// handleVerifyProviderConnection performs a dry-run verification. Nothing is saved.
func (s *Server) handleVerifyProviderConnection(w http.ResponseWriter, r *http.Request) {
	raw, err := parseConnectionInput(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	providerID, _ := raw["provider"].(string)
	if providerID == "" {
		respondError(w, http.StatusBadRequest, "provider is required")
		return
	}

	_, _, err = processAndVerify(providerID, raw)
	if err != nil {
		respondJSON(w, http.StatusOK, map[string]any{"verified": false, "error": err.Error()})
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"verified": true})
}

func (s *Server) handleCreateProviderConnection(w http.ResponseWriter, r *http.Request) {
	raw, err := parseConnectionInput(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	providerID, _ := raw["provider"].(string)
	name, _ := raw["name"].(string)
	if providerID == "" || name == "" {
		respondError(w, http.StatusBadRequest, "provider and name are required")
		return
	}

	cfg, status, err := processAndVerify(providerID, raw)
	if err != nil {
		pcLog.Warn("provider connection verification failed for %s: %v", providerID, err)
		respondError(w, http.StatusBadRequest, "provider verification failed: "+err.Error())
		return
	}

	orgID := getOrgID(r)
	userID := getUserID(r)

	pc, err := s.storeConnectionConfig(r, orgID, userID, providerID, name, cfg, status)
	if err != nil {
		pcLog.Error("create provider connection: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to create provider connection")
		return
	}

	respondJSON(w, http.StatusCreated, pc)
}

func (s *Server) handleListProviderConnections(w http.ResponseWriter, r *http.Request) {
	orgID := getOrgID(r)
	var pcs []models.ProviderConnection
	if err := s.DB.Where("organization_id = ?", orgID).Find(&pcs).Error; err != nil {
		pcLog.Error("list provider connections: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to list provider connections")
		return
	}
	respondJSON(w, http.StatusOK, pcs)
}

func (s *Server) handleGetProviderConnection(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	orgID := getOrgID(r)

	var pc models.ProviderConnection
	if err := s.DB.Where("id = ? AND organization_id = ?", id, orgID).First(&pc).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			respondError(w, http.StatusNotFound, "provider connection not found")
			return
		}
		pcLog.Error("get provider connection: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to get provider connection")
		return
	}
	respondJSON(w, http.StatusOK, pc)
}

func (s *Server) handleUpdateProviderConnection(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	orgID := getOrgID(r)

	var pc models.ProviderConnection
	if err := s.DB.Where("id = ? AND organization_id = ?", id, orgID).First(&pc).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			respondError(w, http.StatusNotFound, "provider connection not found")
			return
		}
		pcLog.Error("update provider connection: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to update provider connection")
		return
	}

	raw, err := parseConnectionInput(r)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if name, ok := raw["name"].(string); ok && name != "" {
		pc.Name = name
	}

	// If any provider credential fields were supplied, reprocess and re-verify.
	hasCredentials := false
	for k := range raw {
		if k != "name" && k != "provider" {
			hasCredentials = true
			break
		}
	}
	if hasCredentials {
		// Merge onto existing config/secret so partial updates work.
		existing, err := s.loadConnectionConfig(r.Context(), &pc)
		if err != nil {
			pcLog.Error("load provider connection config: %v", err)
			respondError(w, http.StatusInternalServerError, "failed to load provider connection")
			return
		}
		merged := map[string]any{}
		for k, v := range existing.Config {
			merged[k] = v
		}
		for k, v := range existing.Secret {
			merged[k] = v
		}
		for k, v := range raw {
			if k != "name" {
				merged[k] = v
			}
		}

		cfg, status, err := processAndVerify(pc.Provider, merged)
		if err != nil {
			respondError(w, http.StatusBadRequest, "provider verification failed: "+err.Error())
			return
		}

		secretBytes, _ := json.Marshal(cfg.Secret)
		ciphertext, encryptedDEK, nonce, err := secret.EncryptSecret(r.Context(), s.Cfg, secretBytes)
		if err != nil {
			pcLog.Error("encrypt provider connection secret: %v", err)
			respondError(w, http.StatusInternalServerError, "failed to update provider connection")
			return
		}
		configBytes, _ := json.Marshal(cfg.Config)

		userID := getUserID(r)
		if pc.CredentialSecretID != nil {
			s.DB.Model(&models.Secret{}).Where("id = ?", *pc.CredentialSecretID).Updates(map[string]any{
				"ciphertext":    ciphertext,
				"encrypted_dek": encryptedDEK,
				"nonce":         nonce,
				"key_version":   "v1",
				"created_by":    userID,
			})
		} else {
			sec := models.Secret{
				OrganizationID: orgID,
				Name:           fmt.Sprintf("%s/%s", pc.Provider, pc.Name),
				Type:           "provider_connection",
				Ciphertext:     ciphertext,
				EncryptedDEK:   encryptedDEK,
				Nonce:          nonce,
				KeyVersion:     "v1",
				CreatedBy:      userID,
			}
			if err := s.DB.Create(&sec).Error; err != nil {
				pcLog.Error("create provider connection secret: %v", err)
				respondError(w, http.StatusInternalServerError, "failed to update provider connection")
				return
			}
			pc.CredentialSecretID = &sec.ID
		}
		pc.Config = string(configBytes)
		pc.Status = status
	}

	if err := s.DB.Save(&pc).Error; err != nil {
		pcLog.Error("update provider connection save: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to update provider connection")
		return
	}

	respondJSON(w, http.StatusOK, pc)
}

func (s *Server) handleVerifyProviderConnectionByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	orgID := getOrgID(r)

	var pc models.ProviderConnection
	if err := s.DB.Where("id = ? AND organization_id = ?", id, orgID).First(&pc).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			respondError(w, http.StatusNotFound, "provider connection not found")
			return
		}
		pcLog.Error("get provider connection: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to get provider connection")
		return
	}

	p, err := core.GetProvider(pc.Provider)
	if err != nil {
		respondError(w, http.StatusBadRequest, "provider not registered")
		return
	}

	cfg, err := s.loadConnectionConfig(r.Context(), &pc)
	if err != nil {
		pcLog.Error("load provider connection config: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to load provider connection")
		return
	}

	status := "verified"
	if err := p.VerifyConnection(cfg); err != nil {
		status = "failed"
	}

	s.DB.Model(&pc).Update("status", status)

	if status != "verified" {
		respondJSON(w, http.StatusOK, map[string]any{"verified": false, "status": status})
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"verified": true, "status": status})
}

func (s *Server) handleDeleteProviderConnection(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	orgID := getOrgID(r)

	if err := s.DB.Where("id = ? AND organization_id = ?", id, orgID).Delete(&models.ProviderConnection{}).Error; err != nil {
		pcLog.Error("delete provider connection: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to delete provider connection")
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func getOrgID(r *http.Request) string {
	if org := r.Header.Get("X-Organization-ID"); org != "" {
		return org
	}
	return "00000000-0000-0000-0000-000000000001"
}
