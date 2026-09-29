package providerconn

import (
	"context"
	"encoding/json"
	"fmt"

	"orcn/core"
	"orcn/core/config"
	"orcn/core/secret"
	"orcn/models"

	"gorm.io/gorm"
)

func LoadConfig(ctx context.Context, db *gorm.DB, cfg *config.Config, pc *models.ProviderConnection) (*core.ProviderConnectionConfig, error) {
	out := &core.ProviderConnectionConfig{
		Config: map[string]any{},
		Secret: map[string]any{},
	}
	if pc.Config != "" {
		if err := json.Unmarshal([]byte(pc.Config), &out.Config); err != nil {
			return nil, err
		}
	}
	if pc.CredentialSecretID != nil {
		var sec models.Secret
		if err := db.Where("id = ?", *pc.CredentialSecretID).First(&sec).Error; err != nil {
			return nil, err
		}
		plaintext, err := secret.DecryptSecret(ctx, cfg, sec.Ciphertext, sec.EncryptedDEK, sec.Nonce)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal(plaintext, &out.Secret); err != nil {
			return nil, err
		}
	}
	return out, nil
}

func Resolve(ctx context.Context, db *gorm.DB, cfg *config.Config, providerID, connectionID string) (core.Provider, error) {
	base, err := core.GetProvider(providerID)
	if err != nil {
		return nil, err
	}
	if connectionID == "" {
		return base, nil
	}

	var pc models.ProviderConnection
	if err := db.Where("id = ?", connectionID).First(&pc).Error; err != nil {
		return nil, fmt.Errorf("provider connection not found")
	}
	if pc.Provider != providerID {
		return nil, fmt.Errorf("provider connection %q does not belong to provider %q", pc.Provider, providerID)
	}

	connCfg, err := LoadConfig(ctx, db, cfg, &pc)
	if err != nil {
		return nil, err
	}
	if pc.Status != "verified" {
		return nil, fmt.Errorf("provider connection %q is not verified", pc.Name)
	}
	return base.WithConfig(connCfg)
}
