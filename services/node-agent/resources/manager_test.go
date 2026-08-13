package resources

import (
	"context"
	"errors"
	"io"
	"testing"

	"orcn/core"
)

type fakeRuntime struct {
	createErr     error
	copyErr       error
	startErr      error
	waitErr       error
	removeIDs     []string
	removedVolume []string
}

func (f *fakeRuntime) Pull(context.Context, string) error { return nil }

func (f *fakeRuntime) CreateLoader(context.Context, string, string, []core.VolumeMount) (string, error) {
	if f.createErr != nil {
		return "", f.createErr
	}
	return "loader", nil
}

func (f *fakeRuntime) CopyToContainer(context.Context, string, string, io.Reader) error {
	return f.copyErr
}

func (f *fakeRuntime) Start(context.Context, string) error { return f.startErr }

func (f *fakeRuntime) Wait(context.Context, string) (int64, error) { return 0, f.waitErr }

func (f *fakeRuntime) Logs(context.Context, string, bool, int, io.Writer) error { return nil }

func (f *fakeRuntime) Remove(_ context.Context, id string, _ bool) error {
	f.removeIDs = append(f.removeIDs, id)
	return nil
}

func (f *fakeRuntime) RemoveVolume(_ context.Context, name string) error {
	f.removedVolume = append(f.removedVolume, name)
	return nil
}

func TestDestinationUsesVolumeMount(t *testing.T) {
	got, err := destination(core.ResourceSpec{
		VolumeName: "model-cache",
		Path:       "models/model.bin",
	}, []core.VolumeMount{{VolumeName: "model-cache", MountPath: "/mnt/models"}})
	if err != nil {
		t.Fatal(err)
	}
	if got != "/mnt/models/models/model.bin" {
		t.Fatalf("destination = %q", got)
	}
}

func TestDestinationRejectsTraversal(t *testing.T) {
	_, err := destination(core.ResourceSpec{
		VolumeName: "model-cache",
		Path:       "../outside.bin",
	}, []core.VolumeMount{{VolumeName: "model-cache", MountPath: "/mnt/models"}})
	if err == nil {
		t.Fatal("expected path traversal to fail")
	}
}

func TestPrepareCleansLoaderAndGeneratedVolumesOnFailure(t *testing.T) {
	runtime := &fakeRuntime{copyErr: errors.New("copy failed")}
	manager := NewManager("loader:dev")

	_, err := manager.Prepare(context.Background(), "workload", []core.ResourceSpec{{
		ID:     "model",
		Type:   "http",
		URL:    "https://example.com/model.bin",
		Target: "/opt/model/model.bin",
	}}, nil, runtime, nil)
	if err == nil {
		t.Fatal("expected resource preparation to fail")
	}
	if len(runtime.removeIDs) != 1 || runtime.removeIDs[0] != "loader" {
		t.Fatalf("removed loaders = %#v", runtime.removeIDs)
	}
	if len(runtime.removedVolume) != 1 || runtime.removedVolume[0] != "orcn-resource-workload-0" {
		t.Fatalf("removed volumes = %#v", runtime.removedVolume)
	}
}

func TestPrepareCleansGeneratedVolumesWhenLoaderCreationFails(t *testing.T) {
	runtime := &fakeRuntime{createErr: errors.New("create failed")}
	manager := NewManager("loader:dev")

	_, err := manager.Prepare(context.Background(), "workload", []core.ResourceSpec{{
		ID:     "model",
		Type:   "http",
		URL:    "https://example.com/model.bin",
		Target: "/opt/model/model.bin",
	}}, nil, runtime, nil)
	if err == nil {
		t.Fatal("expected resource preparation to fail")
	}
	if len(runtime.removeIDs) != 0 {
		t.Fatalf("removed loaders = %#v", runtime.removeIDs)
	}
	if len(runtime.removedVolume) != 1 || runtime.removedVolume[0] != "orcn-resource-workload-0" {
		t.Fatalf("removed volumes = %#v", runtime.removedVolume)
	}
}
