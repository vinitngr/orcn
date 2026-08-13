package docker

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"orcn/core"
)

func (e *Engine) resolveVolumes(ctx context.Context, spec ContainerConfig, create bool) (ContainerConfig, error) {
	if len(spec.Volumes) == 0 {
		return spec, nil
	}
	definitions := make(map[string]core.VolumeSpec, len(spec.Volumes))
	for _, volume := range spec.Volumes {
		name := strings.TrimSpace(volume.Name)
		if name == "" {
			return ContainerConfig{}, fmt.Errorf("volume name is required")
		}
		volume.Type = strings.ToLower(strings.TrimSpace(volume.Type))
		definitions[name] = volume
		if create && volume.Type == "docker" {
			if err := e.client.EnsureVolume(ctx, name); err != nil {
				return ContainerConfig{}, err
			}
		}
	}
	for i := range spec.VolumeMounts {
		mount := &spec.VolumeMounts[i]
		volume, ok := definitions[mount.VolumeName]
		if !ok {
			if strings.HasPrefix(mount.VolumeName, "orcn-resource-") {
				volume = core.VolumeSpec{Name: mount.VolumeName, Type: "docker"}
			} else {
				return ContainerConfig{}, fmt.Errorf("volume %q is not defined", mount.VolumeName)
			}
		}
		var sourceErr error
		mount.Source, sourceErr = resolvedVolumeSource(volume)
		if sourceErr != nil {
			return ContainerConfig{}, sourceErr
		}
	}
	for _, resource := range spec.Resources {
		if resource.VolumeName == "" {
			continue
		}
		if !hasLogicalMount(spec.VolumeMounts, resource.VolumeName) {
			return ContainerConfig{}, fmt.Errorf("resource references volume %q without a container mount", resource.VolumeName)
		}
	}
	return spec, nil
}

func resolvedVolumeSource(volume core.VolumeSpec) (string, error) {
	switch strings.ToLower(strings.TrimSpace(volume.Type)) {
	case "docker":
		return volume.Name, nil
	case "bind", "persisted":
		if strings.TrimSpace(volume.Source) != "" {
			return volume.Source, nil
		}
		if volume.Type == "persisted" {
			return filepath.Join("/mnt", volume.Name), nil
		}
		return "", fmt.Errorf("bind volume %q requires source", volume.Name)
	default:
		return "", fmt.Errorf("volume %q has unsupported type %q", volume.Name, volume.Type)
	}
}

func hasLogicalMount(mounts []core.VolumeMount, name string) bool {
	for _, mount := range mounts {
		if mount.VolumeName == name {
			return true
		}
	}
	return false
}
