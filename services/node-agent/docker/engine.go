package docker

import (
	"context"
	"fmt"
	"io"
	"sort"
	"strings"
	"sync"

	"github.com/docker/docker/api/types/container"
	containertypes "github.com/docker/docker/api/types/container"
	imagetypes "github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/api/types/registry"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"

	"orcn/services/node-agent/config"
	"orcn/services/node-agent/events"
)

type ContainerSpec struct {
	ID          string            `json:"id"`
	Image       string            `json:"image"`
	Command     []string          `json:"command,omitempty"`
	Entrypoint  []string          `json:"entrypoint,omitempty"`
	Environment map[string]string `json:"environment,omitempty"`
	Ports       []Port            `json:"ports,omitempty"`
}

type JobSpec struct {
	NodeID     string          `json:"node_id"`
	Containers []ContainerSpec `json:"containers"`
}

func ValidateJobSpec(job JobSpec) error {
	if job.NodeID == "" || len(job.Containers) == 0 {
		return fmt.Errorf("node_id and at least one container are required")
	}
	seen := make(map[string]struct{}, len(job.Containers))
	for _, container := range job.Containers {
		if _, exists := seen[container.ID]; exists {
			return fmt.Errorf("duplicate container id %q", container.ID)
		}
		seen[container.ID] = struct{}{}
		if err := ValidateSpec(container); err != nil {
			return err
		}
	}
	return nil
}

type Port struct {
	Container int `json:"container"`
	Host      int `json:"host"`
}

type Engine struct {
	client       *client.Client
	logs         int
	registryAuth *registry.AuthConfig
	eventSink    events.Sink
	locks        sync.Map
}

func NewEngine(cfg config.Config, eventSink events.Sink) (*Engine, error) {
	options := []client.Opt{client.FromEnv, client.WithAPIVersionNegotiation()}
	if cfg.DockerHost != "" {
		options = append(options, client.WithHost(cfg.DockerHost))
	}
	dockerClient, err := client.NewClientWithOpts(options...)
	if err != nil {
		return nil, fmt.Errorf("create docker client: %w", err)
	}
	if eventSink == nil {
		eventSink = events.NopSink{}
	}
	engine := &Engine{client: dockerClient, logs: cfg.LogTailLimit, eventSink: eventSink}
	
	if cfg.RegistryUsername != "" || cfg.RegistryCredential != "" {
		if cfg.RegistryUsername == "" || cfg.RegistryCredential == "" {
			return nil, fmt.Errorf("docker registry username and credential must be provided together")
		}
		engine.registryAuth = &registry.AuthConfig{
			Username:      cfg.RegistryUsername,
			Password:      cfg.RegistryCredential,
			ServerAddress: cfg.RegistryServerAddress,
		}
	}
	return engine, nil
}

func (e *Engine) Close() error { return e.client.Close() }

func (e *Engine) Ping(ctx context.Context) error {
	_, err := e.client.Ping(ctx)
	return err
}

func (e *Engine) Inspect(ctx context.Context, id string) (container.InspectResponse, error) {
	return e.client.ContainerInspect(ctx, id)
}

func (e *Engine) Ensure(ctx context.Context, spec ContainerSpec, force bool) (string, bool, error) {
	unlock := e.lock(spec.ID)
	defer unlock()
	if err := ValidateSpec(spec); err != nil {
		e.eventSink.Publish(events.Event{ContainerID: spec.ID, Type: "error", Message: err.Error()})
		return "", false, err
	}

	existing, err := e.client.ContainerInspect(ctx, spec.ID)
	if err == nil {
		matches := Matches(existing, spec)
		if !matches && !force {
			e.eventSink.Publish(events.Event{ContainerID: spec.ID, Type: "configuration_mismatch", Message: "existing container does not match requested configuration"})
			return "", false, fmt.Errorf("container %q exists but does not match the supplied configuration", spec.ID)
		}
		if !matches {
			if err := e.remove(ctx, spec.ID); err != nil {
				return "", false, err
			}
		} else {
			if !existing.State.Running {
				e.eventSink.Publish(events.Event{ContainerID: spec.ID, Type: "starting", Message: "starting existing stopped container"})
				if err := e.client.ContainerStart(ctx, existing.ID, containertypes.StartOptions{}); err != nil {
					e.eventSink.Publish(events.Event{ContainerID: spec.ID, Type: "error", Message: err.Error()})
					return "", false, fmt.Errorf("start existing container: %w", err)
				}
				e.eventSink.Publish(events.Event{ContainerID: spec.ID, Type: "started", Message: "existing container started"})
			}
			return existing.ID, false, nil
		}
	} else if !isNotFound(err) {
		return "", false, fmt.Errorf("inspect container: %w", err)
	}
	if err := e.prepareImage(ctx, spec.Image); err != nil {
		e.eventSink.Publish(events.Event{ContainerID: spec.ID, Type: "error", Message: err.Error()})
		return "", false, err
	}

	created, err := e.client.ContainerCreate(ctx, containerConfig(spec), hostConfig(spec), &network.NetworkingConfig{}, nil, spec.ID)
	if err != nil {
		e.eventSink.Publish(events.Event{ContainerID: spec.ID, Type: "error", Message: err.Error()})
		return "", false, fmt.Errorf("create container: %w", err)
	}
	if err := e.client.ContainerStart(ctx, created.ID, containertypes.StartOptions{}); err != nil {
		_ = e.client.ContainerRemove(ctx, created.ID, containertypes.RemoveOptions{Force: true})
		e.eventSink.Publish(events.Event{ContainerID: spec.ID, Type: "error", Message: err.Error()})
		return "", false, fmt.Errorf("start container: %w", err)
	}
	e.eventSink.Publish(events.Event{ContainerID: spec.ID, Type: "started", Message: "container created and started"})
	return created.ID, true, nil
}

func (e *Engine) ValidateJob(ctx context.Context, job JobSpec) error {
	if err := ValidateJobSpec(job); err != nil {
		return err
	}
	for _, spec := range job.Containers {
		existing, err := e.client.ContainerInspect(ctx, spec.ID)
		if err != nil {
			if isNotFound(err) {
				continue
			}
			return fmt.Errorf("inspect container %q: %w", spec.ID, err)
		}
		if !Matches(existing, spec) {
			return fmt.Errorf("container %q exists but does not match the supplied configuration", spec.ID)
		}
	}
	return nil
}

func (e *Engine) prepareImage(ctx context.Context, image string) error {
	var encodedAuth string
	if e.registryAuth != nil {
		e.eventSink.Publish(events.Event{Type: "registry_login", Message: "authenticating with container registry"})
		if _, err := e.client.RegistryLogin(ctx, *e.registryAuth); err != nil {
			return fmt.Errorf("docker registry login: %w", err)
		}
		var err error
		encodedAuth, err = registry.EncodeAuthConfig(*e.registryAuth)
		if err != nil {
			return fmt.Errorf("encode registry credentials: %w", err)
		}
	}
	e.eventSink.Publish(events.Event{Type: "image_pulling", Message: "pulling image " + image})
	stream, err := e.client.ImagePull(ctx, image, imagetypes.PullOptions{RegistryAuth: encodedAuth})
	if err != nil {
		return fmt.Errorf("pull image %q: %w", image, err)
	}
	defer stream.Close()
	if _, err := io.Copy(io.Discard, stream); err != nil {
		return fmt.Errorf("read image pull response: %w", err)
	}
	e.eventSink.Publish(events.Event{Type: "image_pulled", Message: "image pulled " + image})
	return nil
}

func (e *Engine) Restart(ctx context.Context, id string) error {
	unlock := e.lock(id)
	defer unlock()
	e.eventSink.Publish(events.Event{ContainerID: id, Type: "restarting", Message: "restarting container"})
	timeout := 10
	if err := e.client.ContainerRestart(ctx, id, containertypes.StopOptions{Timeout: &timeout}); err != nil {
		e.eventSink.Publish(events.Event{ContainerID: id, Type: "error", Message: err.Error()})
		return fmt.Errorf("restart container: %w", err)
	}
	e.eventSink.Publish(events.Event{ContainerID: id, Type: "restarted", Message: "container restarted"})
	return nil
}

func (e *Engine) Start(ctx context.Context, id string) error {
	unlock := e.lock(id)
	defer unlock()
	container, err := e.client.ContainerInspect(ctx, id)
	if err != nil {
		return fmt.Errorf("inspect container: %w", err)
	}
	if container.State != nil && container.State.Running {
		return nil
	}
	e.eventSink.Publish(events.Event{ContainerID: id, Type: "starting", Message: "starting container"})
	if err := e.client.ContainerStart(ctx, id, containertypes.StartOptions{}); err != nil {
		e.eventSink.Publish(events.Event{ContainerID: id, Type: "error", Message: err.Error()})
		return fmt.Errorf("start container: %w", err)
	}
	e.eventSink.Publish(events.Event{ContainerID: id, Type: "started", Message: "container started"})
	return nil
}

func (e *Engine) Stop(ctx context.Context, id string) error {
	unlock := e.lock(id)
	defer unlock()
	e.eventSink.Publish(events.Event{ContainerID: id, Type: "stopping", Message: "stopping container"})
	timeout := 10
	if err := e.client.ContainerStop(ctx, id, containertypes.StopOptions{Timeout: &timeout}); err != nil {
		e.eventSink.Publish(events.Event{ContainerID: id, Type: "error", Message: err.Error()})
		return fmt.Errorf("stop container: %w", err)
	}
	e.eventSink.Publish(events.Event{ContainerID: id, Type: "stopped", Message: "container stopped"})
	return nil
}

func (e *Engine) Remove(ctx context.Context, id string) error {
	unlock := e.lock(id)
	defer unlock()
	container, err := e.client.ContainerInspect(ctx, id)
	if err != nil {
		return fmt.Errorf("inspect container: %w", err)
	}
	if container.State != nil && container.State.Running {
		return fmt.Errorf("container %q is running; stop it before removing", id)
	}
	return e.remove(ctx, id)
}

func (e *Engine) remove(ctx context.Context, id string) error {
	e.eventSink.Publish(events.Event{ContainerID: id, Type: "removing", Message: "removing container"})
	if err := e.client.ContainerRemove(ctx, id, containertypes.RemoveOptions{Force: true}); err != nil {
		e.eventSink.Publish(events.Event{ContainerID: id, Type: "error", Message: err.Error()})
		return fmt.Errorf("remove container: %w", err)
	}
	e.eventSink.Publish(events.Event{ContainerID: id, Type: "removed", Message: "container removed"})
	return nil
}

func (e *Engine) lock(id string) func() {
	value, _ := e.locks.LoadOrStore(id, &sync.Mutex{})
	mutex := value.(*sync.Mutex)
	mutex.Lock()
	return mutex.Unlock
}

func (e *Engine) Logs(ctx context.Context, id string, live bool, tail int, output io.Writer) error {
	if tail <= 0 || tail > e.logs {
		tail = e.logs
	}
	stream, err := e.client.ContainerLogs(ctx, id, containertypes.LogsOptions{
		ShowStdout: true, ShowStderr: true, Follow: live, Tail: fmt.Sprintf("%d", tail), Timestamps: true,
	})
	if err != nil {
		return fmt.Errorf("get container logs: %w", err)
	}
	defer stream.Close()
	if _, err := stdcopy.StdCopy(output, output, stream); err != nil {
		return fmt.Errorf("stream container logs: %w", err)
	}
	return nil
}

func containerConfig(spec ContainerSpec) *containertypes.Config {
	env := make([]string, 0, len(spec.Environment))
	for key, value := range spec.Environment {
		env = append(env, key+"="+value)
	}
	sort.Strings(env)
	return &containertypes.Config{Image: spec.Image, Cmd: spec.Command, Entrypoint: spec.Entrypoint, Env: env,
		Labels: map[string]string{"orcn.node-agent.managed": "true"}}
}

func hostConfig(spec ContainerSpec) *containertypes.HostConfig {
	bindings := make(nat.PortMap)
	for _, port := range spec.Ports {
		containerPort := nat.Port(fmt.Sprintf("%d/tcp", port.Container))
		bindings[containerPort] = []nat.PortBinding{{HostIP: "127.0.0.1", HostPort: fmt.Sprintf("%d", port.Host)}}
	}
	return &containertypes.HostConfig{PortBindings: bindings, Mounts: []mount.Mount{}}
}

func ValidateSpec(spec ContainerSpec) error {
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
		if port.Container < 1 || port.Container > 65535 || port.Host < 1 || port.Host > 65535 {
			return fmt.Errorf("invalid port mapping")
		}
	}
	return nil
}

func Matches(existing container.InspectResponse, desired ContainerSpec) bool {
	if existing.Config == nil || existing.HostConfig == nil || existing.Config.Image != desired.Image {
		return false
	}

	if len(desired.Command) > 0 && !sameStrings(existing.Config.Cmd, desired.Command) {
		return false
	}
	if len(desired.Entrypoint) > 0 && !sameStrings(existing.Config.Entrypoint, desired.Entrypoint) {
		return false
	}
	wantEnv := make([]string, 0, len(desired.Environment))
	for key, value := range desired.Environment {
		wantEnv = append(wantEnv, key+"="+value)
	}
	sort.Strings(wantEnv)
	haveEnv := append([]string(nil), existing.Config.Env...)
	sort.Strings(haveEnv)
	if !containsEnv(haveEnv, wantEnv) {
		return false
	}
	if existing.HostConfig == nil {
		return false
	}
	wantPorts := hostConfig(desired).PortBindings
	return samePortBindings(existing.HostConfig.PortBindings, wantPorts)
}

func sameStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func containsEnv(have, want []string) bool {
	if len(want) == 0 {
		return true
	}
	set := make(map[string]struct{}, len(have))
	for _, value := range have {
		set[value] = struct{}{}
	}
	for _, value := range want {
		if _, ok := set[value]; !ok {
			return false
		}
	}
	return true
}

func isNotFound(err error) bool { return client.IsErrNotFound(err) }

func samePortBindings(a, b nat.PortMap) bool {
	if len(a) != len(b) {
		return false
	}
	for port, bindings := range a {
		other, ok := b[port]
		if !ok || len(bindings) != len(other) {
			return false
		}
		for i := range bindings {
			if bindings[i].HostIP != other[i].HostIP || bindings[i].HostPort != other[i].HostPort {
				return false
			}
		}
	}
	return true
}
