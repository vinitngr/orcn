package agent

import (
	"context"
	"log"
	"sync"
)

type Component interface {
	Name() string
	Start(ctx context.Context) error
	Stop(ctx context.Context) error
}

type Agent struct {
	components []Component
}

func New() *Agent {
	return &Agent{
		components: make([]Component, 0),
	}
}

func (a *Agent) Register(c Component) {
	a.components = append(a.components, c)
}

func (a *Agent) Start(ctx context.Context) error {
	log.Println("[AGENT] Booting orchestrator...")
	
	for _, comp := range a.components {
		log.Printf("[AGENT] Starting component: %s", comp.Name())
		if err := comp.Start(ctx); err != nil {
			log.Printf("[AGENT] Failed to start %s: %v", comp.Name(), err)
			return err
		}
	}

	<-ctx.Done()
	log.Println("[AGENT] Shutting down orchestrator...")

	var wg sync.WaitGroup
	for _, comp := range a.components {
		wg.Add(1)
		go func(c Component) {
			defer wg.Done()
			log.Printf("[AGENT] Stopping component: %s", c.Name())
			if err := c.Stop(context.Background()); err != nil {
				log.Printf("[AGENT] Failed to gracefully stop %s: %v", c.Name(), err)
			}
		}(comp)
	}
	wg.Wait()
	log.Println("[AGENT] Shutdown complete.")

	return nil
}
