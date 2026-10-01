package telemetry

import (
	"testing"
	"time"

	"orcn/core"
)

func TestBufferPushAndSnapshot(t *testing.T) {
	buf := NewBuffer(3)

	cpuVal := 25.5
	s1 := core.ContainerSample{
		Timestamp: time.Now().UTC(),
		Container: "host",
		CPU:       &core.CPUMetrics{UsagePercent: &cpuVal},
	}
	s2 := core.ContainerSample{
		Timestamp: time.Now().UTC(),
		Container: "host",
		CPU:       &core.CPUMetrics{UsagePercent: &cpuVal},
	}
	s3 := core.ContainerSample{
		Timestamp: time.Now().UTC(),
		Container: "host",
		CPU:       &core.CPUMetrics{UsagePercent: &cpuVal},
	}
	s4 := core.ContainerSample{
		Timestamp: time.Now().UTC(),
		Container: "host",
		CPU:       &core.CPUMetrics{UsagePercent: &cpuVal},
	}

	buf.Push(s1, nil)
	buf.Push(s2, nil)
	buf.Push(s3, nil)
	buf.Push(s4, nil)

	snapshot := buf.Snapshot()
	if len(snapshot.Series) != 3 {
		t.Fatalf("expected 3 samples in buffer due to limit, got %d", len(snapshot.Series))
	}

	latest := buf.Latest()
	if latest == nil {
		t.Fatal("expected latest sample, got nil")
	}
	if *latest.CPU.UsagePercent != 25.5 {
		t.Errorf("unexpected cpu value in latest: %v", *latest.CPU.UsagePercent)
	}
}

func TestBufferEmpty(t *testing.T) {
	buf := NewBuffer(5)
	if buf.Latest() != nil {
		t.Fatal("expected nil for empty buffer latest")
	}
	snapshot := buf.Snapshot()
	if len(snapshot.Series) != 0 {
		t.Fatalf("expected 0 series in empty snapshot, got %d", len(snapshot.Series))
	}
}
