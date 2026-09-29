package main

import (
	"testing"

	"orcn/pkg/resourcetype"
)

func TestResourceInstallerCoverage(t *testing.T) {
	registry := newInstallerRegistry()

	// Register all known installers (same as main())
	if err := registry.Register("http", installHTTP); err != nil {
		t.Fatalf("register HTTP: %v", err)
	}
	if err := registry.Register("https", installHTTP); err != nil {
		t.Fatalf("register HTTPS: %v", err)
	}
	if err := registry.Register("hf", installHF); err != nil {
		t.Fatalf("register HF: %v", err)
	}

	// Verify every advertised provider has an installer
	for _, provider := range resourcetype.Providers {
		_, ok := registry.installers[provider.ID]
		if !ok {
			t.Errorf("no installer registered for advertised resource type %q (%s)", provider.ID, provider.Name)
		}
	}
}