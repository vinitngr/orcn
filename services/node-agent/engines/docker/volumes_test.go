package docker

import (
	"testing"
	"orcn/core"
)

func TestResolvedVolumeSource(t *testing.T) {
	tests := []struct {
		name   string
		volume core.VolumeSpec
		want   string
	}{
		{name: "docker", volume: core.VolumeSpec{Name: "model-cache", Type: "docker"}, want: "model-cache"},
		{name: "bind", volume: core.VolumeSpec{Name: "data", Type: "bind", Source: "/srv/orcn/data"}, want: "/srv/orcn/data"},
		{name: "persisted default", volume: core.VolumeSpec{Name: "models", Type: "persisted"}, want: "/mnt/models"},
		{name: "persisted source", volume: core.VolumeSpec{Name: "models", Type: "persisted", Source: "/ebs/models"}, want: "/ebs/models"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := resolvedVolumeSource(test.volume)
			if err != nil {
				t.Fatal(err)
			}
			if got != test.want {
				t.Fatalf("source = %q, want %q", got, test.want)
			}
		})
	}
}

func TestResolvedVolumeSourceRejectsBindWithoutSource(t *testing.T) {
	_, err := resolvedVolumeSource(core.VolumeSpec{Name: "data", Type: "bind"})
	if err == nil {
		t.Fatal("expected bind volume without source to fail")
	}
}
