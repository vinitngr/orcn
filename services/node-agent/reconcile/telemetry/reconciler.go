package telemetry

import (
	"context"
	"time"

	"orcn/services/node-agent/reconcile"
)

// Reconciler is an autonomous component that samples node telemetry and populates an in-memory buffer.
type Reconciler struct {
	loop    *reconcile.Loop
	sampler *Sampler
	buffer  *Buffer
}

// New creates a new Telemetry Reconciler component.
func New(interval time.Duration, bufferLimit int) *Reconciler {
	r := &Reconciler{
		sampler: NewSampler(),
		buffer:  NewBuffer(bufferLimit),
	}
	r.loop = reconcile.NewLoop("Telemetry_Reconciler", interval, r.sample)
	return r
}

func (r *Reconciler) Name() string {
	return r.loop.Name()
}

func (r *Reconciler) Start(ctx context.Context) error {
	return r.loop.Start(ctx)
}

func (r *Reconciler) Stop(ctx context.Context) error {
	return r.loop.Stop(ctx)
}

// Buffer returns access to the in-memory telemetry buffer.
func (r *Reconciler) Buffer() *Buffer {
	return r.buffer
}

func (r *Reconciler) sample(ctx context.Context) error {
	sample := r.sampler.Sample(ctx)
	host := r.sampler.SampleHost(ctx, sample)
	r.buffer.Push(sample, host)
	return nil
}
