package main

import (
	"context"
	"fmt"
	"strings"

	"orcn/services/node-agent/resources"
)

type installer func(context.Context, resources.Resource, progressFunc) error

type installerRegistry struct {
	installers map[string]installer
}

func newInstallerRegistry() *installerRegistry {
	return &installerRegistry{installers: make(map[string]installer)}
}

func (r *installerRegistry) Register(resourceType string, install installer) error {
	resourceType = strings.ToLower(strings.TrimSpace(resourceType))
	if resourceType == "" {
		return fmt.Errorf("resource installer type is required")
	}
	if install == nil {
		return fmt.Errorf("resource installer for %q is nil", resourceType)
	}
	if _, exists := r.installers[resourceType]; exists {
		return fmt.Errorf("resource installer for %q is already registered", resourceType)
	}
	r.installers[resourceType] = install
	return nil
}

func (r *installerRegistry) Install(ctx context.Context, resource resources.Resource, progress progressFunc) error {
	resourceType := strings.ToLower(strings.TrimSpace(resource.Type))
	install, ok := r.installers[resourceType]
	if !ok {
		return fmt.Errorf("unsupported resource type %q", resource.Type)
	}
	return install(ctx, resource, progress)
}
