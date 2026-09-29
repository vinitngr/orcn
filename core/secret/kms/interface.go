package kms

import (
	"context"
)

type KMS interface {
	Encrypt(ctx context.Context, plaintext []byte) (ciphertext, encryptedDEK, nonce []byte, err error)
	Decrypt(ctx context.Context, ciphertext, encryptedDEK, nonce []byte) (plaintext []byte, err error)
}