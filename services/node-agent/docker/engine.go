package docker

import (
	"context"
	"fmt"
	"io"
	"strings"
	"sync"
	"time"

	"orcn/core"
	"orcn/services/node-agent/config"
	"orcn/services/node-agent/events"
	"orcn/services/node-agent/resources"

	containertypes "github.com/docker/docker/api/types/container"
)

type Engine struct {
	client          *Client
	logs            int
	eventSink       events.Sink
	loaderImage     string
	resourceManager *resources.Manager
	resourceRuntime resources.Runtime
	locks           sync.Map
}

func NewEngine(cfg config.Config, eventSink events.Sink) (*Engine, error) {
	dockerClient, err := NewClient(cfg)
	if err != nil {
		return nil, err
	}
	if eventSink == nil {
		eventSink = events.NopSink{}
	}
	if cfg.ResourceLoaderImage == "" {
		cfg.ResourceLoaderImage = "vinitngr/orcn-resource-loader:dev"
	}
	runtime := resourceRuntime{client: dockerClient}
	return &Engine{client: dockerClient, logs: cfg.LogTailLimit, eventSink: eventSink, loaderImage: cfg.ResourceLoaderImage, resourceManager: resources.NewManager(cfg.ResourceLoaderImage), resourceRuntime: runtime}, nil
}

func (e *Engine) Close() error { return e.client.Close() }

func (e *Engine) Ping(ctx context.Context) error { return e.client.Ping(ctx) }

func (e *Engine) Inspect(ctx context.Context, id string) (containertypes.InspectResponse, error) {
	return e.client.Inspect(ctx, id)
}

func (e *Engine) Ensure(ctx context.Context, spec ContainerConfig, force bool) (string, bool, error) {
	return e.ensure(ctx, spec, force, true)
}

// EnsureStopped prepares a container and its resources without starting it.
// Registration uses this to enforce a job-wide preparation barrier.
func (e *Engine) EnsureStopped(ctx context.Context, spec ContainerConfig, force bool) (string, bool, error) {
	return e.ensure(ctx, spec, force, false)
}

func (e *Engine) ensure(ctx context.Context, spec ContainerConfig, force, start bool) (string, bool, error) {
	unlock := e.lock(spec.ID)
	defer unlock()
	var err error
	spec, err = e.resolveVolumes(ctx, spec, true)
	if err != nil {
		e.emit(spec.ID, "error", err.Error())
		return "", false, err
	}
	if err := ValidateConfig(spec); err != nil {
		e.emit(spec.ID, "error", err.Error())
		return "", false, err
	}

	existing, err := e.client.Inspect(ctx, spec.ID)
	if err == nil {
		matches := Matches(existing, spec)
		if !matches && !force {
			e.emit(spec.ID, "configuration_mismatch", "existing container does not match requested configuration")
			return "", false, fmt.Errorf("container %q exists but does not match the supplied configuration", spec.ID)
		}
		if !matches {
			if err := e.remove(ctx, spec.ID); err != nil {
				return "", false, err
			}
		} else {
			if start && !isRunning(existing) {
				e.emit(spec.ID, "starting", "starting existing stopped container")
				if err := e.client.Start(ctx, existing.ID); err != nil {
					e.emit(spec.ID, "error", err.Error())
					return "", false, err
				}
				e.emit(spec.ID, "started", "existing container started")
			}
			return existing.ID, false, nil
		}
	} else if !isNotFound(err) {
		return "", false, fmt.Errorf("inspect container: %w", err)
	}

	if err := e.pull(ctx, spec.ID, spec.Image); err != nil {
		return "", false, err
	}
	preparedSpec := spec
	if len(spec.Resources) > 0 {
		emitResource := func(eventType, message, eventID string, metadata map[string]any) {
			e.emitWithMetadata(spec.ID, eventType, message, eventID, metadata)
		}
		mounts, prepareErr := e.resourceManager.Prepare(ctx, spec.ID, spec.Resources, spec.VolumeMounts, e.resourceRuntime, emitResource)
		if prepareErr != nil {
			e.emit(spec.ID, "error", prepareErr.Error())
			return "", false, prepareErr
		}
		preparedSpec.VolumeMounts = mounts
		resolvedSpec, resolveErr := e.resolveVolumes(ctx, preparedSpec, true)
		if resolveErr != nil {
			e.removeManagedResourceVolumes(ctx, spec.ID, preparedSpec.VolumeMounts)
			e.emit(spec.ID, "error", resolveErr.Error())
			return "", false, resolveErr
		}
		preparedSpec = resolvedSpec
	}
	spec = preparedSpec
	created, err := e.client.Create(ctx, spec)
	if err != nil {
		e.removeManagedResourceVolumes(ctx, spec.ID, spec.VolumeMounts)
		e.emit(spec.ID, "error", err.Error())
		return "", false, err
	}
	if !start {
		return created.ID, true, nil
	}
	if err := e.client.Start(ctx, created.ID); err != nil {
		_ = e.removeCreated(ctx, created.ID)
		e.emit(spec.ID, "error", err.Error())
		return "", false, err
	}
	e.emit(spec.ID, "started", "container created and started")
	return created.ID, true, nil
}

func (e *Engine) ValidateJob(ctx context.Context, job core.JobSpec) error {
	if valid, validationErrors := core.ValidateJobSpec(&job); !valid {
		return fmt.Errorf("invalid job specification: %s", strings.Join(validationErrors, "; "))
	}
	for _, container := range job.Containers {
		spec := ContainerConfigFromJobWithVolumes(container, job.Volumes)
		var err error
		spec, err = e.resolveVolumes(ctx, spec, false)
		if err != nil {
			return fmt.Errorf("invalid volumes for container %q: %w", spec.ID, err)
		}
		if err := ValidateConfig(spec); err != nil {
			return fmt.Errorf("invalid container %q: %w", spec.ID, err)
		}
		existing, err := e.client.Inspect(ctx, spec.ID)
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

func (e *Engine) Start(ctx context.Context, id string) error {
	unlock := e.lock(id)
	defer unlock()
	container, err := e.client.Inspect(ctx, id)
	if err != nil {
		return err
	}
	if isRunning(container) {
		return nil
	}
	e.emit(id, "starting", "starting container")
	if err := e.client.Start(ctx, id); err != nil {
		e.emit(id, "error", err.Error())
		return err
	}
	e.emit(id, "started", "container started")
	return nil
}

func (e *Engine) Restart(ctx context.Context, id string) error {
	unlock := e.lock(id)
	defer unlock()
	e.emit(id, "restarting", "restarting container")
	if err := e.client.Restart(ctx, id); err != nil {
		e.emit(id, "error", err.Error())
		return err
	}
	e.emit(id, "restarted", "container restarted")
	return nil
}

func (e *Engine) Stop(ctx context.Context, id string) error {
	unlock := e.lock(id)
	defer unlock()
	e.emit(id, "stopping", "stopping container")
	if err := e.client.Stop(ctx, id); err != nil {
		e.emit(id, "error", err.Error())
		return err
	}
	if err := e.waitStopped(ctx, id); err != nil {
		e.emit(id, "error", err.Error())
		return err
	}
	e.emit(id, "stopped", "container stopped")
	return nil
}

func (e *Engine) waitStopped(ctx context.Context, id string) error {
	waitCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	for {
		container, err := e.client.Inspect(waitCtx, id)
		if err != nil {
			return fmt.Errorf("verify container %q stopped: %w", id, err)
		}
		if !isRunning(container) {
			return nil
		}
		select {
		case <-waitCtx.Done():
			return fmt.Errorf("timed out waiting for container %q to stop", id)
		case <-time.After(100 * time.Millisecond):
		}
	}
}

func (e *Engine) Remove(ctx context.Context, id string) error {
	unlock := e.lock(id)
	defer unlock()
	container, err := e.client.Inspect(ctx, id)
	if err != nil {
		return err
	}
	if isRunning(container) {
		return fmt.Errorf("container %q is running; stop it before removing", id)
	}
	if err := e.remove(ctx, id); err != nil {
		return err
	}
	for _, volume := range managedResourceVolumes(container) {
		if err := e.client.RemoveVolume(ctx, volume); err != nil {
			e.emit(id, "warning", fmt.Sprintf("cleanup volume %q: %v", volume, err))
		}
	}
	return nil
}

func managedResourceVolumes(container containertypes.InspectResponse) []string {
	if container.HostConfig == nil {
		return nil
	}
	var volumes []string
	for _, bind := range container.HostConfig.Binds {
		parts := strings.SplitN(bind, ":", 3)
		if len(parts) >= 2 && strings.HasPrefix(parts[0], "orcn-resource-") {
			volumes = append(volumes, parts[0])
		}
	}
	return volumes
}

func (e *Engine) removeManagedResourceVolumes(ctx context.Context, containerID string, mounts []core.VolumeMount) {
	seen := make(map[string]struct{})
	for _, mount := range mounts {
		name := mount.Source
		if name == "" {
			name = mount.VolumeName
		}
		if !strings.HasPrefix(name, "orcn-resource-") {
			continue
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		if err := e.client.RemoveVolume(ctx, name); err != nil {
			e.emit(containerID, "warning", fmt.Sprintf("cleanup volume %q: %v", name, err))
		}
	}
}

func isRunning(container containertypes.InspectResponse) bool {
	return container.State != nil && container.State.Running
}

func (e *Engine) remove(ctx context.Context, id string) error {
	e.emit(id, "removing", "removing container")
	if err := e.client.Remove(ctx, id, true); err != nil {
		e.emit(id, "error", err.Error())
		return err
	}
	e.emit(id, "removed", "container removed")
	return nil
}

func (e *Engine) removeCreated(ctx context.Context, id string) error {
	container, err := e.client.Inspect(ctx, id)
	removeErr := e.client.Remove(ctx, id, true)
	if removeErr != nil {
		return removeErr
	}
	if err != nil {
		return nil
	}
	for _, volume := range managedResourceVolumes(container) {
		if err := e.client.RemoveVolume(ctx, volume); err != nil {
			e.emit(id, "warning", fmt.Sprintf("cleanup volume %q: %v", volume, err))
		}
	}
	return nil
}

func (e *Engine) Logs(ctx context.Context, id string, live bool, tail int, output io.Writer) error {
	if tail <= 0 || tail > e.logs {
		tail = e.logs
	}
	return e.client.Logs(ctx, id, live, tail, output)
}

func (e *Engine) pull(ctx context.Context, id, image string) error {
	e.emit(id, "image_pulling", "pulling image "+image)
	if err := e.client.Pull(ctx, image); err != nil {
		e.emit(id, "error", err.Error())
		return err
	}
	e.emit(id, "image_pulled", "image pulled "+image)
	return nil
}

func (e *Engine) emit(id, eventType, message string) {
	e.eventSink.Publish(events.Event{ContainerID: id, Type: eventType, Message: message})
}

func (e *Engine) emitWithMetadata(containerID, eventType, message, eventID string, metadata map[string]any) {
	e.eventSink.Publish(events.Event{ID: eventID, ContainerID: containerID, Type: eventType, Message: message, Metadata: metadata})
}

func (e *Engine) lock(id string) func() {
	value, _ := e.locks.LoadOrStore(id, &sync.Mutex{})
	mutex := value.(*sync.Mutex)
	mutex.Lock()
	return mutex.Unlock
}
