package health

import (
	"sync"
	"time"
)

// Store maintains the in-memory health state of all deployments and containers.
type Store struct {
	mu          sync.RWMutex
	deployments map[string]*DeploymentHealth
}

// NewStore initializes a new in-memory health store.
func NewStore() *Store {
	return &Store{
		deployments: make(map[string]*DeploymentHealth),
	}
}

// GetContainer returns health for a specific container in a deployment.
func (s *Store) GetContainer(deploymentName, containerID string) (*ContainerHealth, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dep, ok := s.deployments[deploymentName]
	if !ok || dep.Containers == nil {
		return nil, false
	}

	c, exists := dep.Containers[containerID]
	if !exists {
		return nil, false
	}

	cp := *c
	return &cp, true
}

// FindContainer searches for a container by ID across all deployments.
func (s *Store) FindContainer(containerID string) (*ContainerHealth, string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for depName, dep := range s.deployments {
		if dep.Containers == nil {
			continue
		}
		if c, exists := dep.Containers[containerID]; exists {
			cp := *c
			return &cp, depName, true
		}
	}
	return nil, "", false
}

// GetDeployment returns the health snapshot of a deployment.
func (s *Store) GetDeployment(deploymentName string) (*DeploymentHealth, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dep, ok := s.deployments[deploymentName]
	if !ok {
		return nil, false
	}
	return cloneDeployment(dep), true
}

// GetDeployments returns all deployments.
func (s *Store) GetDeployments() map[string]*DeploymentHealth {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make(map[string]*DeploymentHealth, len(s.deployments))
	for name, dep := range s.deployments {
		result[name] = cloneDeployment(dep)
	}
	return result
}

// SetDeployment updates or inserts a deployment health snapshot.
func (s *Store) SetDeployment(dep *DeploymentHealth) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.deployments[dep.DeploymentName] = cloneDeployment(dep)
}

// Prune removes deployments that are no longer active/registered.
func (s *Store) Prune(activeDeployments map[string]struct{}) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for name := range s.deployments {
		if _, active := activeDeployments[name]; !active {
			delete(s.deployments, name)
		}
	}
}

// Summary builds a complete node-level summary of all deployments.
func (s *Store) Summary() NodeHealthSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()

	summary := NodeHealthSummary{
		Status:      StatusHealthy,
		Deployments: make(map[string]*DeploymentHealth, len(s.deployments)),
		Timestamp:   time.Now().UTC(),
	}

	for name, dep := range s.deployments {
		cloned := cloneDeployment(dep)
		summary.Deployments[name] = cloned
		summary.TotalDeployments++
		summary.TotalContainers += cloned.TotalContainers
		summary.HealthyContainers += cloned.HealthyContainers
		summary.DegradedContainers += cloned.DegradedContainers
		summary.UnhealthyContainers += cloned.UnhealthyContainers
	}

	if summary.TotalDeployments == 0 {
		summary.Status = StatusUnknown
	} else if summary.UnhealthyContainers > 0 {
		if summary.HealthyContainers > 0 {
			summary.Status = StatusDegraded
		} else {
			summary.Status = StatusUnhealthy
		}
	} else if summary.DegradedContainers > 0 {
		summary.Status = StatusDegraded
	}

	return summary
}

func cloneDeployment(dep *DeploymentHealth) *DeploymentHealth {
	if dep == nil {
		return nil
	}
	cloned := &DeploymentHealth{
		DeploymentName:      dep.DeploymentName,
		Status:              dep.Status,
		TotalContainers:     dep.TotalContainers,
		HealthyContainers:   dep.HealthyContainers,
		DegradedContainers:  dep.DegradedContainers,
		UnhealthyContainers: dep.UnhealthyContainers,
		Containers:          make(map[string]*ContainerHealth, len(dep.Containers)),
		LastCheckedAt:       dep.LastCheckedAt,
	}
	for id, c := range dep.Containers {
		if c != nil {
			cp := *c
			cloned.Containers[id] = &cp
		}
	}
	return cloned
}
