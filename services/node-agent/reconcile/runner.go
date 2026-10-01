package reconcile

import (
	"context"
	"sync"
	"time"
)

// Loop executes a reconciliation function periodically.
// It implements agent.Component.
type Loop struct {
	name     string
	interval time.Duration
	fn       func(ctx context.Context) error

	mu     sync.Mutex
	stopCh chan struct{}
}

// NewLoop creates a named periodic reconciliation loop.
func NewLoop(name string, interval time.Duration, fn func(ctx context.Context) error) *Loop {
	return &Loop{
		name:     name,
		interval: interval,
		fn:       fn,
	}
}

func (l *Loop) Name() string {
	return l.name
}

func (l *Loop) Start(ctx context.Context) error {
	l.mu.Lock()
	l.stopCh = make(chan struct{})
	l.mu.Unlock()

	go func() {
		_ = l.fn(ctx)

		ticker := time.NewTicker(l.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-l.stopCh:
				return
			case <-ticker.C:
				_ = l.fn(ctx)
			}
		}
	}()

	return nil
}

func (l *Loop) Stop(ctx context.Context) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.stopCh != nil {
		select {
		case <-l.stopCh:
			// already closed
		default:
			close(l.stopCh)
		}
	}
	return nil
}
