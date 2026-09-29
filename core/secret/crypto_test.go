package secret

import (
	"context"
	"os"
	"testing"

	"orcn/core/config"
)

func TestEncryptDecryptRoundtrip(t *testing.T) {
	os.Setenv("KMS_PROVIDER", "local")
	os.Setenv("KMS_MASTER_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")

	cfg, err := config.LoadConfig()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}

	plaintext := []byte("test-secret-value-123")
	ctx := context.Background()

	ciphertextB64, encryptedDEKB64, nonceB64, err := EncryptSecret(ctx, cfg, plaintext)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	decrypted, err := DecryptSecret(ctx, cfg, ciphertextB64, encryptedDEKB64, nonceB64)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}

	if string(decrypted) != string(plaintext) {
		t.Errorf("decrypted != plaintext: got %q want %q", string(decrypted), string(plaintext))
	}
}

func TestEncryptDecryptDifferentValues(t *testing.T) {
	os.Setenv("KMS_PROVIDER", "local")
	os.Setenv("KMS_MASTER_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")

	cfg, err := config.LoadConfig()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}

	testCases := []string{
		"simple",
		"",
		"with spaces and special chars !@#$%^&*()",
		"very long secret " + string(make([]byte, 1000)),
	}

	for _, tc := range testCases {
		ctx := context.Background()
		ciphertextB64, encryptedDEKB64, nonceB64, err := EncryptSecret(ctx, cfg, []byte(tc))
		if err != nil {
			t.Fatalf("encrypt %q: %v", tc, err)
		}

		decrypted, err := DecryptSecret(ctx, cfg, ciphertextB64, encryptedDEKB64, nonceB64)
		if err != nil {
			t.Fatalf("decrypt %q: %v", tc, err)
		}

		if string(decrypted) != tc {
			t.Errorf("roundtrip failed for %q: got %q", tc, string(decrypted))
		}
	}
}