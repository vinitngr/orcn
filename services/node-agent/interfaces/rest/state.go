package rest

import (
	"fmt"
	"strings"
	"sync"

	"orcn/core"
	"orcn/services/node-agent/engines/docker"
)

type RegistrationState struct {
	mu         sync.RWMutex
	registered bool
	job        core.JobSpec
}

func NewRegistrationState() *RegistrationState { return &RegistrationState{} }

func (s *RegistrationState) Register(job core.JobSpec) error {
	if valid, errors := core.ValidateJobSpec(&job); !valid {
		return fmt.Errorf("invalid job specification: %s", strings.Join(errors, "; "))
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.registered {
		return fmt.Errorf("agent is already registered")
	}
	s.job = job
	s.registered = true
	return nil
}

func (s *RegistrationState) RequireRegistered() error {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if !s.registered {
		return fmt.Errorf("agent is not registered")
	}
	return nil
}

func (s *RegistrationState) Job() (core.JobSpec, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.job, s.registered
}

func (s *RegistrationState) Allows(id string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if !s.registered {
		return false
	}
	for _, container := range s.job.Containers {
		if container.ID == id {
			return true
		}
	}
	return false
}

func (s *RegistrationState) Spec(id string) (docker.ContainerConfig, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if !s.registered {
		return docker.ContainerConfig{}, false
	}
	for _, container := range s.job.Containers {
		if container.ID == id {
			return docker.ContainerConfigFromJobWithVolumes(container, s.job.Volumes), true
		}
	}
	return docker.ContainerConfig{}, false
}
