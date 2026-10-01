package health

import (
	"context"
	"errors"
	"testing"
	"time"

	"orcn/core"

	containertypes "github.com/docker/docker/api/types/container"
)

type mockWorkloadProvider struct {
	jobs map[string]core.JobSpec
}

func (m *mockWorkloadProvider) Jobs() map[string]core.JobSpec {
	return m.jobs
}

type mockInspector struct {
	containers map[string]containertypes.InspectResponse
	err        error
}

func (m *mockInspector) Inspect(ctx context.Context, id string) (containertypes.InspectResponse, error) {
	if m.err != nil {
		return containertypes.InspectResponse{}, m.err
	}
	resp, ok := m.containers[id]
	if !ok {
		return containertypes.InspectResponse{}, errors.New("not found")
	}
	return resp, nil
}

type mockProber struct {
	results map[string]probeResult
}

type probeResult struct {
	status  int
	latency int64
	err     error
}

func (m *mockProber) Probe(ctx context.Context, url string, expectedStatus int, timeout time.Duration) (int, int64, error) {
	if res, ok := m.results[url]; ok {
		return res.status, res.latency, res.err
	}
	return 200, 10, nil
}

func TestHealthReconciler(t *testing.T) {
	ctx := context.Background()

	// 1. Setup specs: 1 deployment with 2 containers
	// c1 has probe
	// c2 has NO probe
	workloads := &mockWorkloadProvider{
		jobs: map[string]core.JobSpec{
			"dep-1": {
				JobName: "dep-1",
				Containers: []core.ContainerSpec{
					{
						ID: "c1",
						Args: core.ContainerArgs{
							Image: "nginx:latest",
							Expose: []core.ExposeSpec{
								{
									Port: 80,
									HealthCheck: &core.HealthCheckSpec{
										Path:           "/healthz",
										ExpectedStatus: 200,
										TimeoutSeconds: 2,
									},
								},
							},
						},
					},
					{
						ID: "c2",
						Args: core.ContainerArgs{
							Image: "redis:latest",
						},
					},
				},
			},
		},
	}

	inspector := &mockInspector{
		containers: map[string]containertypes.InspectResponse{
			"c1": {
				ContainerJSONBase: &containertypes.ContainerJSONBase{
					State: &containertypes.State{
						Running: true,
						Status:  "running",
					},
				},
				NetworkSettings: &containertypes.NetworkSettings{
					DefaultNetworkSettings: containertypes.DefaultNetworkSettings{
						IPAddress: "172.17.0.2",
					},
				},
			},
			"c2": {
				ContainerJSONBase: &containertypes.ContainerJSONBase{
					State: &containertypes.State{
						Running: true,
						Status:  "running",
					},
				},
				NetworkSettings: &containertypes.NetworkSettings{
					DefaultNetworkSettings: containertypes.DefaultNetworkSettings{
						IPAddress: "172.17.0.3",
					},
				},
			},
		},
	}

	prober := &mockProber{
		results: map[string]probeResult{
			"http://172.17.0.2:80/healthz": {status: 200, latency: 15, err: nil},
		},
	}

	store := NewStore()
	reconciler := NewReconciler(Config{
		Interval:         time.Second,
		FailureThreshold: 3,
	}, workloads, inspector, store)
	reconciler.SetProber(prober)

	// Step 1: Initial reconcile -> both should be healthy
	if err := reconciler.reconcile(ctx); err != nil {
		t.Fatalf("reconcile error: %v", err)
	}

	dep, ok := store.GetDeployment("dep-1")
	if !ok {
		t.Fatalf("deployment dep-1 not found in store")
	}
	if dep.Status != StatusHealthy {
		t.Errorf("expected dep status healthy, got %v", dep.Status)
	}
	if dep.HealthyContainers != 2 {
		t.Errorf("expected 2 healthy containers, got %d", dep.HealthyContainers)
	}

	c1, _ := store.GetContainer("dep-1", "c1")
	if c1.Status != StatusHealthy || !c1.IsReady || !c1.HasProbe {
		t.Errorf("unexpected c1 state: %+v", c1)
	}

	c2, _ := store.GetContainer("dep-1", "c2")
	if c2.Status != StatusHealthy || !c2.IsReady || c2.HasProbe {
		t.Errorf("unexpected c2 state: %+v", c2)
	}

	// Step 2: Probe fails 1 time for c1 -> degraded (not unhealthy yet)
	prober.results["http://172.17.0.2:80/healthz"] = probeResult{
		status:  500,
		latency: 12,
		err:     errors.New("expected status 200, got 500"),
	}

	_ = reconciler.reconcile(ctx)
	c1, _ = store.GetContainer("dep-1", "c1")
	if c1.Status != StatusDegraded {
		t.Errorf("expected c1 status degraded on 1st fail, got %v", c1.Status)
	}
	if c1.ConsecutiveFailures != 1 {
		t.Errorf("expected 1 failure, got %d", c1.ConsecutiveFailures)
	}

	dep, _ = store.GetDeployment("dep-1")
	if dep.Status != StatusDegraded {
		t.Errorf("expected dep status degraded, got %v", dep.Status)
	}

	// Step 3: Probe fails 2nd time -> still degraded
	_ = reconciler.reconcile(ctx)
	c1, _ = store.GetContainer("dep-1", "c1")
	if c1.Status != StatusDegraded {
		t.Errorf("expected c1 status degraded on 2nd fail, got %v", c1.Status)
	}
	if c1.ConsecutiveFailures != 2 {
		t.Errorf("expected 2 failures, got %d", c1.ConsecutiveFailures)
	}

	// Step 4: Probe fails 3rd time -> threshold reached -> unhealthy
	_ = reconciler.reconcile(ctx)
	c1, _ = store.GetContainer("dep-1", "c1")
	if c1.Status != StatusUnhealthy {
		t.Errorf("expected c1 status unhealthy on 3rd fail, got %v", c1.Status)
	}
	if c1.IsReady {
		t.Errorf("expected c1 IsReady to be false")
	}

	// Step 5: Process crash for c2 -> immediate Down without waiting 3 checks
	inspector.containers["c2"] = containertypes.InspectResponse{
		ContainerJSONBase: &containertypes.ContainerJSONBase{
			State: &containertypes.State{
				Running:  false,
				Status:   "exited",
				ExitCode: 137,
			},
		},
	}
	_ = reconciler.reconcile(ctx)
	c2, _ = store.GetContainer("dep-1", "c2")
	if c2.Status != StatusDown {
		t.Errorf("expected c2 status down immediately, got %v", c2.Status)
	}
	if c2.ExitCode == nil || *c2.ExitCode != 137 {
		t.Errorf("expected c2 exit code 137, got %v", c2.ExitCode)
	}

	// Summary check
	summary := store.Summary()
	if summary.TotalContainers != 2 || summary.HealthyContainers != 0 {
		t.Errorf("unexpected summary: %+v", summary)
	}

	// Step 6: Recovery for c1
	prober.results["http://172.17.0.2:80/healthz"] = probeResult{status: 200, latency: 10, err: nil}
	_ = reconciler.reconcile(ctx)
	c1, _ = store.GetContainer("dep-1", "c1")
	if c1.Status != StatusHealthy || !c1.IsReady {
		t.Errorf("expected c1 to recover to healthy, got %+v", c1)
	}
	if c1.ConsecutiveFailures != 0 {
		t.Errorf("expected 0 failures after recovery, got %d", c1.ConsecutiveFailures)
	}
}
