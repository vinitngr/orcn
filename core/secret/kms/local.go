package kms

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"

	"orcn/core/config"
)

type LocalKMS struct {
	masterKey []byte
}

func NewLocalKMS(cfg *config.Config) (*LocalKMS, error) {
	if cfg.KMSMasterKey == "" {
		return nil, errors.New("KMS_MASTER_KEY is required for local KMS")
	}
	decoded, err := base64.StdEncoding.DecodeString(cfg.KMSMasterKey)
	if err != nil {
		return nil, err
	}
	if len(decoded) != 32 {
		return nil, errors.New("KMS_MASTER_KEY must be 32 bytes (base64 encoded)")
	}
	return &LocalKMS{masterKey: decoded}, nil
}

func (l *LocalKMS) Encrypt(ctx context.Context, plaintext []byte) (ciphertext, encryptedDEK, nonce []byte, err error) {
	dek := make([]byte, 32)
	if _, err = rand.Read(dek); err != nil {
		return nil, nil, nil, err
	}

	block, err := aes.NewCipher(l.masterKey)
	if err != nil {
		return nil, nil, nil, err
	}
	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, nil, err
	}
	encryptedDEK = make([]byte, aesgcm.NonceSize()+len(dek)+aesgcm.Overhead())
	nonceDEK := encryptedDEK[:aesgcm.NonceSize()]
	if _, err = rand.Read(nonceDEK); err != nil {
		return nil, nil, nil, err
	}
	aesgcm.Seal(encryptedDEK[aesgcm.NonceSize():aesgcm.NonceSize()], nonceDEK, dek, nil)

	block, err = aes.NewCipher(dek)
	if err != nil {
		return nil, nil, nil, err
	}
	aesgcm, err = cipher.NewGCM(block)
	if err != nil {
		return nil, nil, nil, err
	}
	nonce = make([]byte, aesgcm.NonceSize())
	if _, err = rand.Read(nonce); err != nil {
		return nil, nil, nil, err
	}
	ciphertext = aesgcm.Seal(nil, nonce, plaintext, nil)

	return ciphertext, encryptedDEK, nonce, nil
}

func (l *LocalKMS) Decrypt(ctx context.Context, ciphertext, encryptedDEK, nonce []byte) (plaintext []byte, err error) {
	block, err := aes.NewCipher(l.masterKey)
	if err != nil {
		return nil, err
	}
	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonceSize := aesgcm.NonceSize()
	if len(encryptedDEK) < nonceSize {
		return nil, errors.New("encrypted DEK too short")
	}
	nonceDEK := encryptedDEK[:nonceSize]
	dekCiphertext := encryptedDEK[nonceSize:]
	dek, err := aesgcm.Open(nil, nonceDEK, dekCiphertext, nil)
	if err != nil {
		return nil, err
	}

	block, err = aes.NewCipher(dek)
	if err != nil {
		return nil, err
	}
	aesgcm, err = cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	plaintext, err = aesgcm.Open(nil, nonce, ciphertext, nil)
	return plaintext, err
}