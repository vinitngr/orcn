package main

import (
	"context"
	"testing"

	"orcn/services/node-agent/resources"
)

func TestInstallerRegistryRejectsUnknownTypes(t *testing.T) {
	registry := newInstallerRegistry()
	if err := registry.Register("http", func(context.Context, resources.Resource, progressFunc) error { return nil }); err != nil {
		t.Fatal(err)
	}

	err := registry.Install(context.Background(), resources.Resource{Type: "git"}, nil)
	if err == nil {
		t.Fatal("expected unregistered resource type to be rejected")
	}
}

func TestInstallerRegistryNormalizesTypes(t *testing.T) {
	registry := newInstallerRegistry()
	called := false
	if err := registry.Register(" HTTP ", func(context.Context, resources.Resource, progressFunc) error {
		called = true
		return nil
	}); err != nil {
		t.Fatal(err)
	}

	if err := registry.Install(context.Background(), resources.Resource{Type: "http"}, nil); err != nil {
		t.Fatal(err)
	}
	if !called {
		t.Fatal("registered installer was not called")
	}
}

func TestInstallerRegistryRejectsDuplicateTypes(t *testing.T) {
	registry := newInstallerRegistry()
	install := func(context.Context, resources.Resource, progressFunc) error { return nil }
	if err := registry.Register("http", install); err != nil {
		t.Fatal(err)
	}
	if err := registry.Register("HTTP", install); err == nil {
		t.Fatal("expected duplicate installer type to be rejected")
	}
}
