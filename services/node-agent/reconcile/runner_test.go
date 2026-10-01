package reconcile

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestLoopRunAndStop(t *testing.T) {
	var count int32
	loop := NewLoop("test_loop", 20*time.Millisecond, func(ctx context.Context) error {
		atomic.AddInt32(&count, 1)
		return nil
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := loop.Start(ctx); err != nil {
		t.Fatalf("failed to start loop: %v", err)
	}

	// Wait for ticker to run at least 2 times
	time.Sleep(70 * time.Millisecond)

	if err := loop.Stop(ctx); err != nil {
		t.Fatalf("failed to stop loop: %v", err)
	}

	val := atomic.LoadInt32(&count)
	if val < 2 {
		t.Errorf("expected count >= 2, got %d", val)
	}
}
