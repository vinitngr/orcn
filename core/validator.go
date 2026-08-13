package core

import (
	"bytes"
	"encoding/json"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
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
			Resources []struct {
				Type   string   `json:"type"`
				URL    string   `json:"url"`
				Target string   `json:"target"`
				Files  []string `json:"files,omitempty"`
			} `json:"resources"`
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

// ValidateJobSpec validates the canonical job specification used by
// providers, controllers, and node agents.
func ValidateJobSpec(spec *JobSpec) (bool, []string) {
	if spec == nil {
		return false, []string{"job specification is required"}
	}
	errors := validateJobRoot(spec)
	volumes, volumeErrors := validateVolumeDefinitions(spec.Volumes, false)
	errors = append(errors, volumeErrors...)
	errors = append(errors, validateJobContainers(spec.Containers)...)
	errors = append(errors, validateVolumeUsage(spec.Containers, volumes)...)
	return len(errors) == 0, errors
}

func validateJobRoot(spec *JobSpec) []string {
	var errors []string
	if spec.Version != "" && spec.Version != "v2" {
		errors = append(errors, "Invalid version: expected 'v2'")
	}
	if spec.Type != "" && spec.Type != "container" {
		errors = append(errors, "Unsupported type: expected 'container'")
	}
	if len(spec.Containers) == 0 {
		errors = append(errors, "At least one container must be defined in 'containers'")
	}
	return errors
}

func validateVolumeDefinitions(volumes []VolumeSpec, allowEmptyType bool) (map[string]VolumeSpec, []string) {
	definitions := make(map[string]VolumeSpec, len(volumes))
	var errors []string
	for _, volume := range volumes {
		name := strings.TrimSpace(volume.Name)
		if name == "" {
			errors = append(errors, "Volume is missing 'name'")
			continue
		}
		if _, exists := definitions[name]; exists {
			errors = append(errors, fmt.Sprintf("Duplicate volume name: '%s'", name))
		}
		volume.Name = name
		volume.Type = strings.ToLower(strings.TrimSpace(volume.Type))
		if volume.Type == "" && allowEmptyType {
			volume.Type = "persisted"
		}
		if volume.Type != "persisted" && volume.Type != "bind" && volume.Type != "docker" {
			errors = append(errors, fmt.Sprintf("Volume '%s' has unsupported type '%s'", name, volume.Type))
		}
		if volume.Type == "bind" && strings.TrimSpace(volume.Source) == "" {
			errors = append(errors, fmt.Sprintf("Bind volume '%s' requires 'source'", name))
		}
		if (volume.Type == "bind" || volume.Type == "persisted") && volume.Source != "" && !filepath.IsAbs(filepath.Clean(volume.Source)) {
			errors = append(errors, fmt.Sprintf("Volume '%s' source must be an absolute host path", name))
		}
		definitions[name] = volume
	}
	return definitions, errors
}

func validateJobContainers(containers []ContainerSpec) []string {
	var errors []string
	seen := make(map[string]bool, len(containers))
	for _, container := range containers {
		if container.ID == "" {
			errors = append(errors, "Container is missing 'id'")
		} else if seen[container.ID] {
			errors = append(errors, fmt.Sprintf("Duplicate container id: '%s'", container.ID))
		}
		seen[container.ID] = true
		if container.Args.Image == "" {
			errors = append(errors, fmt.Sprintf("Container '%s' is missing required field 'args.image'", container.ID))
		}
		errors = append(errors, validateExposedPorts(container)...)
	}
	return errors
}

func validateExposedPorts(container ContainerSpec) []string {
	var errors []string
	for _, exposed := range container.Args.Expose {
		if exposed.Port <= 0 || exposed.Port > 65535 {
			errors = append(errors, fmt.Sprintf("Container '%s' has invalid port %d", container.ID, exposed.Port))
		}
		if exposed.Protocol != "" && exposed.Protocol != "tcp" && exposed.Protocol != "udp" && exposed.Protocol != "http" {
			errors = append(errors, fmt.Sprintf("Container '%s' has invalid protocol '%s'", container.ID, exposed.Protocol))
		}
		if exposed.HealthCheck != nil {
			if exposed.HealthCheck.ExpectedStatus < 0 || exposed.HealthCheck.ExpectedStatus > 599 {
				errors = append(errors, fmt.Sprintf("Container '%s' has invalid health-check status", container.ID))
			}
			if exposed.HealthCheck.TimeoutSeconds < 0 {
				errors = append(errors, fmt.Sprintf("Container '%s' has invalid health-check timeout", container.ID))
			}
		}
	}
	return errors
}

func validateVolumeUsage(containers []ContainerSpec, volumes map[string]VolumeSpec) []string {
	var errors []string
	used := make(map[string]bool)
	for _, container := range containers {
		mounted := make(map[string]bool, len(container.Args.VolumeMounts))
		for _, mount := range container.Args.VolumeMounts {
			if _, exists := volumes[mount.VolumeName]; !exists {
				errors = append(errors, fmt.Sprintf("Container '%s' references undefined volume '%s'", container.ID, mount.VolumeName))
			} else {
				used[mount.VolumeName] = true
				mounted[mount.VolumeName] = true
			}
			if strings.TrimSpace(mount.MountPath) == "" || !strings.HasPrefix(mount.MountPath, "/") {
				errors = append(errors, fmt.Sprintf("Container '%s' has invalid mount path for volume '%s'", container.ID, mount.VolumeName))
			}
		}
		for _, resource := range container.Args.Resources {
			if resource.VolumeName == "" {
				continue
			}
			if !mounted[resource.VolumeName] {
				errors = append(errors, fmt.Sprintf("Container '%s' resource volume '%s' is not mounted", container.ID, resource.VolumeName))
			}
			if _, exists := volumes[resource.VolumeName]; !exists {
				errors = append(errors, fmt.Sprintf("Container '%s' resource references undefined volume '%s'", container.ID, resource.VolumeName))
			} else {
				used[resource.VolumeName] = true
			}
			if strings.TrimSpace(resource.Path) == "" || filepath.IsAbs(resource.Path) || strings.Contains(resource.Path, "..") {
				errors = append(errors, fmt.Sprintf("Container '%s' resource has invalid relative path", container.ID))
			}
		}
	}
	for name := range volumes {
		if !used[name] {
			errors = append(errors, fmt.Sprintf("Volume '%s' is declared but not used", name))
		}
	}
	return errors
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

	canonicalVolumes := make([]VolumeSpec, 0, len(spec.Volumes))
	for _, volume := range spec.Volumes {
		canonicalVolumes = append(canonicalVolumes, VolumeSpec{Name: volume.Name, Type: volume.Type, Source: volume.HostPath, SizeGB: volume.SizeGB})
	}
	validatedVolumes, volumeErrors := validateVolumeDefinitions(canonicalVolumes, true)
	errors = append(errors, volumeErrors...)
	usedVolumes := make(map[string]bool)

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
			} else if _, exists := validatedVolumes[m.VolumeName]; !exists {
				errors = append(errors, fmt.Sprintf("Container '%s' references undefined volume: '%s'", c.ID, m.VolumeName))
			} else {
				usedVolumes[m.VolumeName] = true
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

		// Validate Resources
		for j, r := range c.Args.Resources {
			if r.Type == "" {
				errors = append(errors, fmt.Sprintf("Container '%s' resource at index %d is missing 'type'", c.ID, j))
			} else {
				t := strings.ToUpper(r.Type)
				if t != "HF" && t != "S3" && t != "HTTP" && t != "GIT" {
					errors = append(errors, fmt.Sprintf("Container '%s' resource %d has unsupported type '%s'", c.ID, j, r.Type))
				}
			}

			if r.Target == "" {
				errors = append(errors, fmt.Sprintf("Container '%s' resource at index %d is missing 'target' path", c.ID, j))
			}

			if r.URL == "" {
				errors = append(errors, fmt.Sprintf("Container '%s' resource at index %d is missing 'url'", c.ID, j))
			} else {
				// Specific validations
				if strings.ToUpper(r.Type) == "HF" {
					matched, _ := regexp.MatchString(`^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`, r.URL)
					if !matched {
						errors = append(errors, fmt.Sprintf("Container '%s' HF resource at index %d must use 'org/repo' format (e.g., 'runwayml/stable-diffusion-v1-5')", c.ID, j))
					}
				} else if strings.ToUpper(r.Type) == "GIT" {
					if !strings.HasSuffix(r.URL, ".git") && !strings.Contains(r.URL, "github.com") && !strings.Contains(r.URL, "gitlab.com") {
						errors = append(errors, fmt.Sprintf("Container '%s' GIT resource at index %d does not look like a valid git URL", c.ID, j))
					}
				}
			}
		}
	}
	for name := range validatedVolumes {
		if !usedVolumes[name] {
			errors = append(errors, fmt.Sprintf("Volume '%s' is declared but not used", name))
		}
	}

	return len(errors) == 0, errors
}

func ConvertTemplateSpecV2ToJobSpec(v2 *TemplateSpecV2) *JobSpec {
	job := &JobSpec{
		Version: "v2",
		JobName: v2.Name,
		Type:    v2.Type,
		Meta:    make(map[string]any),
	}

	if job.Type == "" {
		job.Type = "container"
	}

	if reqs, ok := v2.Meta["system_requirements"].(map[string]any); ok {
		if vram, ok := reqs["min_vram_gb"].(float64); ok {
			job.SystemRequirements.MinVRAMGB = int(vram)
		}
		if cuda, ok := reqs["cuda_version"].(string); ok {
			job.SystemRequirements.CUDAVersion = cuda
		}
	}

	for _, v := range v2.Volumes {
		job.Volumes = append(job.Volumes, VolumeSpec{
			Name:   v.Name,
			Type:   v.Type,
			Source: v.HostPath,
			SizeGB: v.SizeGB,
		})
	}

	for _, c := range v2.Containers {
		container := ContainerSpec{
			ID: c.ID,
			Args: ContainerArgs{
				Image:      c.Args.Image,
				GPU:        c.Args.GPU,
				Cmd:        c.Args.Cmd,
				Entrypoint: c.Args.Entrypoint,
				Env:        c.Args.Env,
			},
		}

		for _, m := range c.Args.VolumeMounts {
			container.Args.VolumeMounts = append(container.Args.VolumeMounts, VolumeMount{
				VolumeName: m.VolumeName,
				MountPath:  m.MountPath,
			})
		}

		for _, e := range c.Args.Expose {
			container.Args.Expose = append(container.Args.Expose, ExposeSpec{
				Port:     e.Port,
				Protocol: e.Protocol,
				IsPublic: e.IsPublic,
			})
		}

		for _, r := range c.Args.Resources {
			container.Args.Resources = append(container.Args.Resources, ResourceSpec{
				Type:   r.Type,
				URL:    r.URL,
				Target: r.Target,
				Files:  r.Files,
			})
		}

		job.Containers = append(job.Containers, container)
	}

	return job
}
