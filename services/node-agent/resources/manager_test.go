package resources

import (
	"testing"

	"orcn/core"
)

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
