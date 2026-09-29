package secret

import (
	"context"
	"encoding/base64"

	"orcn/core/secret/kms"
	"orcn/core/config"
)

func GetKMS(cfg *config.Config) (kms.KMS, error) {
	switch cfg.KMSProvider {
	case "local":
		return kms.NewLocalKMS(cfg)
	default:
		return nil, ErrUnsupportedKMSProvider
	}
}

func EncryptSecret(ctx context.Context, cfg *config.Config, plaintext []byte) (ciphertextB64, encryptedDEKB64, nonceB64 string, err error) {
	k, err := GetKMS(cfg)
	if err != nil {
		return "", "", "", err
	}
	ciphertext, encryptedDEK, nonce, err := k.Encrypt(ctx, plaintext)
	if err != nil {
		return "", "", "", err
	}
	return base64.StdEncoding.EncodeToString(ciphertext),
		base64.StdEncoding.EncodeToString(encryptedDEK),
		base64.StdEncoding.EncodeToString(nonce), nil
}

func DecryptSecret(ctx context.Context, cfg *config.Config, ciphertextB64, encryptedDEKB64, nonceB64 string) ([]byte, error) {
	k, err := GetKMS(cfg)
	if err != nil {
		return nil, err
	}
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return nil, err
	}
	encryptedDEK, err := base64.StdEncoding.DecodeString(encryptedDEKB64)
	if err != nil {
		return nil, err
	}
	nonce, err := base64.StdEncoding.DecodeString(nonceB64)
	if err != nil {
		return nil, err
	}
	return k.Decrypt(ctx, ciphertext, encryptedDEK, nonce)
}

var ErrUnsupportedKMSProvider = &unsupportedKMSProviderError{}
type unsupportedKMSProviderError struct{}
func (e *unsupportedKMSProviderError) Error() string { return "unsupported KMS provider" }