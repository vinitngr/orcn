package nosana

import (
	"testing"
	"time"
)

func TestNormalizeNosanaJobStats(t *testing.T) {
	raw := []byte(`[
		{
			"timestamp": 1790805055856,
			"cpu": {"cpu_percent": 0.4},
			"memory": {"memory_usage": 3134.2, "memory_limit": 31.25, "memory_percent": 9.8},
			"disk": {"read": 10.14, "write": 0},
			"network": {"received": 1226.73, "sent": 12.44},
			"opId": "vllm-inference-server"
		},
		{
			"timestamp": 1790805060860,
			"cpu": {"cpu_percent": 0.41},
			"memory": {"memory_usage": 3134.2, "memory_limit": 31.25, "memory_percent": 9.8},
			"disk": {"read": 10.14, "write": 0},
			"network": {"received": 1226.73, "sent": 12.44},
			"opId": "vllm-inference-server"
		}
	]`)

	got, err := normalizeNosanaJobStats(raw, time.UnixMilli(1790805060860).UTC())
	if err != nil {
		t.Fatalf("normalize: %v", err)
	}
	if len(got.Containers) != 1 || got.Containers[0] != "vllm-inference-server" {
		t.Fatalf("containers = %#v", got.Containers)
	}
	if len(got.Series) != 2 {
		t.Fatalf("series len = %d", len(got.Series))
	}
	s0 := got.Series[0]
	if s0.Container != "vllm-inference-server" {
		t.Fatalf("container = %q", s0.Container)
	}
	if s0.CPU == nil || s0.CPU.UsagePercent == nil || *s0.CPU.UsagePercent != 0.4 {
		t.Fatalf("cpu = %#v", s0.CPU)
	}
	if s0.Memory == nil || s0.Memory.UsedMB == nil || *s0.Memory.UsedMB != 3134.2 {
		t.Fatalf("memory used = %#v", s0.Memory)
	}
	if s0.Memory.TotalMB == nil || *s0.Memory.TotalMB != 31.25*1024 {
		t.Fatalf("memory total = %#v", s0.Memory.TotalMB)
	}
	if s0.Disk == nil || s0.Disk.ReadMB == nil || *s0.Disk.ReadMB != 10.14 {
		t.Fatalf("disk = %#v", s0.Disk)
	}
	if s0.Network == nil || s0.Network.RxMB == nil || *s0.Network.RxMB != 1226.73 {
		t.Fatalf("network = %#v", s0.Network)
	}
}
