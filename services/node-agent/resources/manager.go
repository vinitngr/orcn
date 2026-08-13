package resources

import (
	"archive/tar"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"orcn/core"
)

type Runtime interface {
	Pull(context.Context, string) error
	CreateLoader(context.Context, string, string, []core.VolumeMount) (string, error)
	CopyToContainer(context.Context, string, string, io.Reader) error
	Start(context.Context, string) error
	Wait(context.Context, string) (int64, error)
	Logs(context.Context, string, bool, int, io.Writer) error
	Remove(context.Context, string, bool) error
}

type EventFunc func(eventType, message, eventID string, metadata map[string]any)

type Manager struct{ LoaderImage string }

func NewManager(loaderImage string) *Manager { return &Manager{LoaderImage: loaderImage} }

type Plan struct {
	Version   int        `json:"version"`
	Resources []Resource `json:"resources"`
}

type Resource struct {
	ID          string         `json:"id,omitempty"`
	Type        string         `json:"type"`
	Config      map[string]any `json:"config,omitempty"`
	Destination string         `json:"destination"`
}

func BuildPlan(specs []core.ResourceSpec) (Plan, error) {
	plan := Plan{Version: 1, Resources: make([]Resource, 0, len(specs))}
	for _, spec := range specs {
		if !strings.EqualFold(spec.Type, "http") && !strings.EqualFold(spec.Type, "https") {
			return Plan{}, fmt.Errorf("unsupported resource type %q", spec.Type)
		}
		plan.Resources = append(plan.Resources, Resource{
			ID:          spec.ID,
			Type:        strings.ToLower(spec.Type),
			Config:      resourceConfig(spec),
			Destination: spec.Target,
		})
	}
	return plan, nil
}

func (m *Manager) Prepare(ctx context.Context, containerID string, specs []core.ResourceSpec, mounts []core.VolumeMount, runtime Runtime, emit EventFunc) ([]core.VolumeMount, error) {
	if len(specs) == 0 {
		return mounts, nil
	}
	plan, err := BuildPlan(specs)
	if err != nil {
		return nil, err
	}
	for index, resource := range specs {
		target, targetErr := destination(resource, mounts)
		if targetErr != nil {
			return nil, targetErr
		}
		plan.Resources[index].Destination = target
		directory := filepath.Dir(target)
		if directory == "." || directory == "/" {
			return nil, fmt.Errorf("resource target %q must be inside a mounted directory", target)
		}
		if !hasMount(mounts, directory) {
			mounts = append(mounts, core.VolumeMount{VolumeName: fmt.Sprintf("orcn-resource-%s-%d", containerID, index), MountPath: directory})
		}
	}
	loaderID := "orcn-loader-" + containerID
	if emit != nil {
		emit("resource_loader_pulling", "pulling resource loader image", "", nil)
	}
	if err := runtime.Pull(ctx, m.LoaderImage); err != nil {
		return nil, fmt.Errorf("pull resource loader image: %w", err)
	}
	created, err := runtime.CreateLoader(ctx, loaderID, m.LoaderImage, mounts)
	if err != nil {
		return nil, fmt.Errorf("create resource loader: %w", err)
	}
	cleanup := func() { _ = runtime.Remove(context.Background(), created, true) }
	defer func() {
		if err != nil {
			cleanup()
		}
	}()
	data, err := json.Marshal(plan)
	if err != nil {
		return nil, fmt.Errorf("encode resource plan: %w", err)
	}
	if err := runtime.CopyToContainer(ctx, created, "/run", planArchive(data)); err != nil {
		return nil, fmt.Errorf("send resource plan: %w", err)
	}
	if emit != nil {
		emit("resource_installing", "resource loader installing resources", "", nil)
	}
	if err := runtime.Start(ctx, created); err != nil {
		return nil, fmt.Errorf("start resource loader: %w", err)
	}
	go captureProgress(ctx, containerID, created, runtime, emit)
	status, err := runtime.Wait(ctx, created)
	if err != nil {
		return nil, fmt.Errorf("wait for resource loader: %w", err)
	}
	if status != 0 {
		return nil, fmt.Errorf("resource loader exited with status %d", status)
	}
	cleanup()
	if emit != nil {
		emit("resource_installed", "resource loader completed", "", nil)
	}
	return mounts, nil
}

func resourceConfig(resource core.ResourceSpec) map[string]any {
	if len(resource.Config) > 0 {
		return resource.Config
	}
	if resource.URL != "" {
		return map[string]any{"url": resource.URL}
	}
	return nil
}

func destination(resource core.ResourceSpec, mounts []core.VolumeMount) (string, error) {
	if resource.VolumeName == "" {
		if resource.Target == "" {
			return "", fmt.Errorf("resource target is required")
		}
		return filepath.Clean(resource.Target), nil
	}
	if resource.Path == "" || filepath.IsAbs(resource.Path) || strings.Contains(resource.Path, "..") {
		return "", fmt.Errorf("resource path must be relative and stay inside volume %q", resource.VolumeName)
	}
	for _, mount := range mounts {
		if mount.VolumeName == resource.VolumeName {
			return filepath.Join(mount.MountPath, resource.Path), nil
		}
	}
	return "", fmt.Errorf("resource volume %q is not mounted", resource.VolumeName)
}

var progressPattern = regexp.MustCompile(`id=([^ ]+) downloaded_bytes=([0-9]+)(?: total_bytes=([0-9]+) percentage=([0-9.]+))?`)

func captureProgress(ctx context.Context, _, loaderID string, runtime Runtime, emit EventFunc) {
	if emit == nil {
		return
	}
	lastPercent := make(map[string]int)
	parser := &progressLogWriter{emit: func(line string) {
		match := progressPattern.FindStringSubmatch(line)
		if len(match) == 0 {
			return
		}
		metadata := map[string]any{"resource_id": match[1]}
		if value, err := strconv.ParseInt(match[2], 10, 64); err == nil {
			metadata["downloaded_bytes"] = value
		}
		if match[3] != "" {
			if value, err := strconv.ParseInt(match[3], 10, 64); err == nil {
				metadata["total_bytes"] = value
			}
		}
		if match[4] != "" {
			value, err := strconv.ParseFloat(match[4], 64)
			if err == nil {
				metadata["percentage"] = value
				bucket := int(value)
				if previous, ok := lastPercent[match[1]]; ok && bucket <= previous && value < 100 {
					return
				}
				lastPercent[match[1]] = bucket
			}
		}
		emit("progress", "resource download progress", match[1], metadata)
	}}
	if err := runtime.Logs(ctx, loaderID, true, 0, parser); err != nil {
		return
	}
}

type progressLogWriter struct {
	buffer []byte
	emit   func(string)
}

func (w *progressLogWriter) Write(data []byte) (int, error) {
	w.buffer = append(w.buffer, data...)
	for {
		index := bytes.IndexByte(w.buffer, '\n')
		if index < 0 {
			break
		}
		w.emit(strings.TrimSpace(string(w.buffer[:index])))
		w.buffer = w.buffer[index+1:]
	}
	return len(data), nil
}

func planArchive(data []byte) io.Reader {
	var buffer bytes.Buffer
	archive := tar.NewWriter(&buffer)
	_ = archive.WriteHeader(&tar.Header{Name: "resource-plan.json", Mode: 0o600, Size: int64(len(data))})
	_, _ = archive.Write(data)
	_ = archive.Close()
	return &buffer
}

func hasMount(mounts []core.VolumeMount, target string) bool {
	for _, mount := range mounts {
		root := filepath.Clean(mount.MountPath)
		if target == root || strings.HasPrefix(target, root+string(filepath.Separator)) {
			return true
		}
	}
	return false
}
