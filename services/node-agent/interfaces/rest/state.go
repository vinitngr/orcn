package rest

import (
	"fmt"
	"strings"
	"sync"

	"orcn/core"
	"orcn/services/node-agent/engines/docker"
)

// RegistrationState manages workload registrations.
// In "exclusive" mode it locks after a single registration (original behavior).
// In "shared" mode it allows multiple registrations up to MaxWorkloads (0 = unlimited).
type RegistrationState struct {
	mu           sync.RWMutex
	mode         string // "exclusive" or "shared"
	maxWorkloads int    // 0 means unlimited (shared mode only)
	jobs         map[string]core.JobSpec
}

func NewRegistrationState(mode string, maxWorkloads int) *RegistrationState {
	if mode != "shared" {
		mode = "exclusive"
	}
	return &RegistrationState{
		mode:         mode,
		maxWorkloads: maxWorkloads,
		jobs:         make(map[string]core.JobSpec),
	}
}

func (s *RegistrationState) Mode() string {
	return s.mode
}

func (s *RegistrationState) Register(job core.JobSpec) error {
	if valid, errors := core.ValidateJobSpec(&job); !valid {
		return fmt.Errorf("invalid job specification: %s", strings.Join(errors, "; "))
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.mode == "exclusive" {
		if len(s.jobs) > 0 {
			return fmt.Errorf("agent is in exclusive mode and already has a registered workload")
		}
	} else {
		if s.maxWorkloads > 0 && len(s.jobs) >= s.maxWorkloads {
			return fmt.Errorf("agent has reached max workload capacity (%d)", s.maxWorkloads)
		}
	}

	key := job.JobName
	if key == "" {
		key = job.NodeID
	}
	if _, exists := s.jobs[key]; exists {
		return fmt.Errorf("workload %q is already registered", key)
	}
	s.jobs[key] = job
	return nil
}

func (s *RegistrationState) Unregister(jobName string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.jobs[jobName]; !exists {
		return fmt.Errorf("workload %q is not registered", jobName)
	}
	delete(s.jobs, jobName)
	return nil
}

func (s *RegistrationState) RequireRegistered() error {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.jobs) == 0 {
		return fmt.Errorf("agent is not registered")
	}
	return nil
}

// Job returns the first (and in exclusive mode, only) registered job.
// Kept for backward compatibility with proxy and single-job consumers.
func (s *RegistrationState) Job() (core.JobSpec, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, job := range s.jobs {
		return job, true
	}
	return core.JobSpec{}, false
}

// Jobs returns all registered jobs.
func (s *RegistrationState) Jobs() map[string]core.JobSpec {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make(map[string]core.JobSpec, len(s.jobs))
	for k, v := range s.jobs {
		result[k] = v
	}
	return result
}

func (s *RegistrationState) Allows(id string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, job := range s.jobs {
		for _, container := range job.Containers {
			if container.ID == id {
				return true
			}
		}
	}
	return false
}

func (s *RegistrationState) Spec(id string) (docker.ContainerConfig, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, job := range s.jobs {
		for _, container := range job.Containers {
			if container.ID == id {
				return docker.ContainerConfigFromJobWithVolumes(container, job.Volumes), true
			}
		}
	}
	return docker.ContainerConfig{}, false
}
