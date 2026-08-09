package proxy

import (
	"fmt"
	"sync"

	"orcn/services/node-agent/docker"
)

type RegistrationState struct {
	mu         sync.RWMutex
	registered bool
	job        docker.JobSpec
}

func NewRegistrationState() *RegistrationState { return &RegistrationState{} }

func (s *RegistrationState) Register(job docker.JobSpec) error {
	if err := docker.ValidateJobSpec(job); err != nil {
		return err
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

func (s *RegistrationState) Job() (docker.JobSpec, bool) {
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

func (s *RegistrationState) Spec(id string) (docker.ContainerSpec, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if !s.registered {
		return docker.ContainerSpec{}, false
	}
	for _, container := range s.job.Containers {
		if container.ID == id {
			return container, true
		}
	}
	return docker.ContainerSpec{}, false
}
