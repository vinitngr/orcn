package core

import (
	"bytes"
	"encoding/json"
	"fmt"
)

type TemplateSpecV2 struct {
	Name        string         `json:"name"`
	ComputeType string         `json:"computeType"`
	Version     string         `json:"version"`
	Type        string         `json:"type"`
	Meta        map[string]any `json:"meta"`
	Volumes     []struct {
		Name     string `json:"name"`
		Type     string `json:"type"`
		SizeGB   int    `json:"size_gb"`
		HostPath string `json:"host_path"`
	} `json:"volumes"`
	Containers []struct {
		ID   string `json:"id"`
		Args struct {
			Image        string            `json:"image"`
			GPU          bool              `json:"gpu"`
			Cmd          []string          `json:"cmd"`
			Entrypoint   []string          `json:"entrypoint"`
			Env          map[string]string `json:"env"`
			VolumeMounts []struct {
				VolumeName string `json:"volume_name"`
				MountPath  string `json:"mount_path"`
			} `json:"volume_mounts"`
			Expose []struct {
				Port     int    `json:"port"`
				Protocol string `json:"protocol"`
				IsPublic bool   `json:"is_public"`
			} `json:"expose"`
		} `json:"args"`
	} `json:"containers"`
}

func ValidateJobSpecBytes(specJSON []byte) (bool, []string) {
	var errors []string
	var spec TemplateSpecV2

	decoder := json.NewDecoder(bytes.NewReader(specJSON))
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&spec); err != nil {
		errors = append(errors, fmt.Sprintf("Invalid JSON schema or unknown field found: %v", err))
		return false, errors
	}

	return ValidateJobSpecStruct(&spec)
}

func ValidateJobSpecStruct(spec *TemplateSpecV2) (bool, []string) {
	var errors []string

	// 1. Validate Root level fields
	if spec.Version != "v2" {
		errors = append(errors, fmt.Sprintf("Invalid version: expected 'v2', got '%s'", spec.Version))
	}
	if spec.Name == "" {
		errors = append(errors, "Missing required field: 'name'")
	}
	
	// Allow empty defaults for type and computeType
	if spec.Type != "" && spec.Type != "container" {
		errors = append(errors, fmt.Sprintf("Unsupported type: expected 'container', got '%s'", spec.Type))
	}
	if spec.ComputeType != "" && spec.ComputeType != "CPU" && spec.ComputeType != "GPU" {
		errors = append(errors, fmt.Sprintf("Invalid computeType: expected 'CPU' or 'GPU', got '%s'", spec.ComputeType))
	}

	// 2. Validate Volumes
	volNames := make(map[string]bool)
	for i, vol := range spec.Volumes {
		if vol.Name == "" {
			errors = append(errors, fmt.Sprintf("Volume at index %d is missing 'name'", i))
		} else {
			if volNames[vol.Name] {
				errors = append(errors, fmt.Sprintf("Duplicate volume name found: '%s'", vol.Name))
			}
			volNames[vol.Name] = true
		}
		// Note: We don't strictly require vol.Type because it falls back to 'persistent' automatically
	}

	// 3. Validate Containers
	if len(spec.Containers) == 0 {
		errors = append(errors, "At least one container must be defined in 'containers'")
	}

	for i, c := range spec.Containers {
		if c.ID == "" {
			errors = append(errors, fmt.Sprintf("Container at index %d is missing 'id'", i))
		}

		if c.Args.Image == "" {
			errors = append(errors, fmt.Sprintf("Container '%s' is missing required field 'args.image'", c.ID))
		}

		// Validate Mounts
		for j, m := range c.Args.VolumeMounts {
			if m.VolumeName == "" {
				errors = append(errors, fmt.Sprintf("Container '%s' volume mount at index %d is missing 'volume_name'", c.ID, j))
			} else if !volNames[m.VolumeName] {
				errors = append(errors, fmt.Sprintf("Container '%s' references undefined volume: '%s'", c.ID, m.VolumeName))
			}

			if m.MountPath == "" {
				errors = append(errors, fmt.Sprintf("Container '%s' volume mount for '%s' is missing 'mount_path'", c.ID, m.VolumeName))
			}
		}

		// Validate Ports
		for j, p := range c.Args.Expose {
			if p.Port <= 0 || p.Port > 65535 {
				errors = append(errors, fmt.Sprintf("Container '%s' has invalid port %d at index %d", c.ID, p.Port, j))
			}
			// Allow empty protocol to fallback to "tcp"
			if p.Protocol != "" && p.Protocol != "tcp" && p.Protocol != "udp" && p.Protocol != "http" {
				errors = append(errors, fmt.Sprintf("Container '%s' has invalid protocol '%s' for port %d", c.ID, p.Protocol, p.Port))
			}
		}
	}

	return len(errors) == 0, errors
}
