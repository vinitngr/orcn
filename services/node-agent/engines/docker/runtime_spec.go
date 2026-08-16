package docker

import (
	"fmt"
	"strings"

	containertypes "github.com/docker/docker/api/types/container"
	"github.com/docker/go-connections/nat"
	"orcn/core"
)

type ContainerConfig struct {
	ID           string              `json:"id"`
	Image        string              `json:"image"`
	GPU          bool                `json:"gpu,omitempty"`
	Command      []string            `json:"command,omitempty"`
	Entrypoint   []string            `json:"entrypoint,omitempty"`
	Environment  map[string]string   `json:"environment,omitempty"`
	Ports        []Port              `json:"ports,omitempty"`
	Resources    []core.ResourceSpec `json:"resources,omitempty"`
	VolumeMounts []core.VolumeMount  `json:"volume_mounts,omitempty"`
	Volumes      []core.VolumeSpec   `json:"volumes,omitempty"`
}

type Port struct {
	Container    int
	Host         int
	Protocol     string
	Public       bool
	HealthChecks []core.HealthCheckSpec
}

func ContainerConfigFromJob(container core.ContainerSpec) ContainerConfig {
	return ContainerConfigFromJobWithVolumes(container, nil)
}

func ContainerConfigFromJobWithVolumes(container core.ContainerSpec, volumes []core.VolumeSpec) ContainerConfig {
	spec := ContainerConfig{
		ID:           container.ID,
		Image:        container.Args.Image,
		GPU:          container.Args.GPU,
		Command:      container.Args.Cmd,
		Entrypoint:   container.Args.Entrypoint,
		Environment:  container.Args.Env,
		Resources:    container.Args.Resources,
		VolumeMounts: container.Args.VolumeMounts,
		Volumes:      volumes,
	}

	for _, exposed := range container.Args.Expose {
		port := findPort(spec.Ports, exposed.Port)
		if port == nil {
			spec.Ports = append(spec.Ports, Port{
				Container: exposed.Port,
				Host:      exposed.Port,
				Protocol:  exposed.Protocol,
				Public:    exposed.IsPublic,
			})
			port = &spec.Ports[len(spec.Ports)-1]
		} else if port.Protocol == "" {
			port.Protocol = exposed.Protocol
		}

		if exposed.IsPublic {
			port.Public = true
			port.Host = exposed.Port
		}
		if exposed.HealthCheck != nil {
			port.HealthChecks = append(port.HealthChecks, *exposed.HealthCheck)
		}
	}

	return spec
}

func findPort(ports []Port, containerPort int) *Port {
	for index := range ports {
		if ports[index].Container == containerPort {
			return &ports[index]
		}
	}
	return nil
}

func containerConfig(spec ContainerConfig) *containertypes.Config {
	exposedPorts := make(nat.PortSet)
	for _, port := range spec.Ports {
		protocol := port.Protocol
		if protocol == "" || protocol == "http" {
			protocol = "tcp"
		}
		exposedPorts[nat.Port(fmt.Sprintf("%d/%s", port.Container, protocol))] = struct{}{}
	}

	labels := map[string]string{"orcn.node-agent.managed": "true"}
	for index, resource := range spec.Resources {
		labels[fmt.Sprintf("orcn.resource.%d", index)] = resource.Type + "|" + resource.URL + "|" + resource.Target + "|" + resource.VolumeName + "|" + resource.Path
	}

	return &containertypes.Config{
		Image:        spec.Image,
		Cmd:          spec.Command,
		Entrypoint:   spec.Entrypoint,
		Env:          environmentSlice(spec.Environment),
		ExposedPorts: exposedPorts,
		Healthcheck:  dockerHealthcheck(spec),
		Labels:       labels,
	}
}

func hostConfig(spec ContainerConfig) *containertypes.HostConfig {
	bindings := make(nat.PortMap)
	for _, port := range spec.Ports {
		if !port.Public {
			continue
		}
		bindings[nat.Port(fmt.Sprintf("%d/tcp", port.Container))] = []nat.PortBinding{{
			HostIP:   "127.0.0.1",
			HostPort: fmt.Sprintf("%d", port.Host),
		}}
	}

	host := &containertypes.HostConfig{PortBindings: bindings}
	for _, mount := range spec.VolumeMounts {
		source := mount.Source
		if source == "" {
			source = mount.VolumeName
		}
		host.Binds = append(host.Binds, source+":"+mount.MountPath)
	}
	if spec.GPU {
		host.DeviceRequests = []containertypes.DeviceRequest{{
			Count:        -1,
			Capabilities: [][]string{{"gpu"}},
		}}
	}
	return host
}

func ValidateConfig(spec ContainerConfig) error {
	if strings.TrimSpace(spec.ID) == "" || strings.TrimSpace(spec.Image) == "" {
		return fmt.Errorf("container id and image are required")
	}
	if strings.ContainsAny(spec.ID, " /\\") || strings.HasPrefix(spec.ID, ".") {
		return fmt.Errorf("invalid container id")
	}
	for key := range spec.Environment {
		if strings.TrimSpace(key) == "" || strings.ContainsAny(key, "=\\n\\r") {
			return fmt.Errorf("invalid environment variable name")
		}
	}
	for _, port := range spec.Ports {
		if port.Container < 1 || port.Container > 65535 {
			return fmt.Errorf("invalid container port")
		}
		if port.Public && (port.Host < 1 || port.Host > 65535) {
			return fmt.Errorf("invalid public port mapping")
		}
		if port.Protocol != "" && port.Protocol != "tcp" && port.Protocol != "udp" && port.Protocol != "http" {
			return fmt.Errorf("invalid protocol %q", port.Protocol)
		}
	}
	for _, resource := range spec.Resources {
		if !strings.EqualFold(resource.Type, "http") {
			return fmt.Errorf("unsupported resource type %q; only HTTP resources are supported", resource.Type)
		}
		if strings.TrimSpace(resource.URL) == "" && len(resource.Config) == 0 {
			return fmt.Errorf("resource URL or config is required")
		}
		if resource.VolumeName == "" && strings.TrimSpace(resource.Target) == "" {
			return fmt.Errorf("resource target or volume_name/path is required")
		}
	}
	for _, mount := range spec.VolumeMounts {
		if strings.TrimSpace(mount.VolumeName) == "" || strings.TrimSpace(mount.MountPath) == "" {
			return fmt.Errorf("volume name and mount path are required")
		}
	}
	return nil
}
