package telemetry

import (
	"context"
	"testing"
)

func TestSamplerGPUAgnostic(t *testing.T) {
	sampler := NewSampler()
	ctx := context.Background()

	// Should not panic or error even on CPU-only or non-NVIDIA machines
	sample := sampler.Sample(ctx)
	if sample.Container != "host" {
		t.Errorf("expected container name 'host', got %q", sample.Container)
	}

	host := sampler.SampleHost(ctx, sample)
	if host == nil {
		t.Fatal("expected non-nil host metrics")
	}
	// GPU can be nil or present depending on machine, but must not panic
}
