package agent

import (
	"context"
	"sync"
	"time"

	"orcn/core/logger"
)

type Component interface {
	Name() string
	Start(ctx context.Context) error
	Stop(ctx context.Context) error
}

type Agent struct {
	components []Component
	logger     *logger.Logger
}

func New() *Agent {
	return &Agent{
		components: make([]Component, 0),
		logger:     logger.New("AGENT"),
	}
}

func (a *Agent) Register(c Component) {
	a.components = append(a.components, c)
}

func (a *Agent) Start(ctx context.Context) error {
	a.logger.Info("Booting orchestrator...")

	started := make([]Component, 0, len(a.components))
	for _, comp := range a.components {
		a.logger.Info("Starting component: %s", comp.Name())
		if err := comp.Start(ctx); err != nil {
			a.logger.Error("Failed to start %s: %v", comp.Name(), err)
			
			// Rollback already started components
			rollbackCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			for i := len(started) - 1; i >= 0; i-- {
				_ = started[i].Stop(rollbackCtx)
			}
			return err
		}
		started = append(started, comp)
	}

	<-ctx.Done()
	a.logger.Info("Shutting down orchestrator...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var wg sync.WaitGroup
	for _, comp := range started {
		wg.Add(1)
		go func(c Component) {
			defer wg.Done()
			a.logger.Info("Stopping component: %s", c.Name())
			if err := c.Stop(shutdownCtx); err != nil {
				a.logger.Error("Failed to gracefully stop %s: %v", c.Name(), err)
			}
		}(comp)
	}
	wg.Wait()
	a.logger.Info("Shutdown complete.")

	return nil
}
