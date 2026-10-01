package telemetry

import (
	"sync"
	"time"

	"orcn/core"
)

// Buffer maintains a thread-safe circular buffer of recent telemetry samples.
type Buffer struct {
	mu         sync.RWMutex
	limit      int
	samples    []core.ContainerSample
	latestHost *core.HostMetrics
}

func NewBuffer(limit int) *Buffer {
	if limit <= 0 {
		limit = 60 // 5 minutes at 5s interval
	}
	return &Buffer{
		limit:   limit,
		samples: make([]core.ContainerSample, 0, limit),
	}
}

// Push adds a sample and updates the latest host metrics snapshot.
func (b *Buffer) Push(sample core.ContainerSample, host *core.HostMetrics) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.latestHost = host
	b.samples = append(b.samples, sample)
	if len(b.samples) > b.limit {
		b.samples = b.samples[len(b.samples)-b.limit:]
	}
}

// Snapshot returns the current NodeMetrics structure compatible with core.NodeMetrics.
func (b *Buffer) Snapshot() core.NodeMetrics {
	b.mu.RLock()
	defer b.mu.RUnlock()

	now := time.Now().UTC()
	series := make([]core.ContainerSample, len(b.samples))
	copy(series, b.samples)

	containers := []string{}
	seen := make(map[string]struct{})
	for _, s := range series {
		if _, ok := seen[s.Container]; !ok && s.Container != "" {
			seen[s.Container] = struct{}{}
			containers = append(containers, s.Container)
		}
	}

	return core.NodeMetrics{
		Timestamp:  now,
		Containers: containers,
		Series:     series,
		Host:       b.latestHost,
	}
}

// Latest returns the single most recent sample.
func (b *Buffer) Latest() *core.ContainerSample {
	b.mu.RLock()
	defer b.mu.RUnlock()

	if len(b.samples) == 0 {
		return nil
	}
	sample := b.samples[len(b.samples)-1]
	return &sample
}
