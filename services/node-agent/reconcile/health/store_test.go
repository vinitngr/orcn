package health

import (
	"testing"
	"time"
)

func TestStore(t *testing.T) {
	store := NewStore()

	// Initial empty summary
	s0 := store.Summary()
	if s0.Status != StatusUnknown || s0.TotalDeployments != 0 {
		t.Errorf("expected empty store to have status unknown, got %v", s0.Status)
	}

	now := time.Now().UTC()
	dep1 := &DeploymentHealth{
		DeploymentName:      "ai-prod",
		Status:              StatusHealthy,
		TotalContainers:     2,
		HealthyContainers:   2,
		DegradedContainers:  0,
		UnhealthyContainers: 0,
		Containers: map[string]*ContainerHealth{
			"c-master": {
				ContainerID:    "c-master",
				DeploymentName: "ai-prod",
				Status:         StatusHealthy,
				IsReady:        true,
				LastCheckedAt:  now,
			},
			"c-sidecar": {
				ContainerID:    "c-sidecar",
				DeploymentName: "ai-prod",
				Status:         StatusHealthy,
				IsReady:        true,
				LastCheckedAt:  now,
			},
		},
		LastCheckedAt: now,
	}

	store.SetDeployment(dep1)

	// Check GetDeployment
	d, ok := store.GetDeployment("ai-prod")
	if !ok || d.Status != StatusHealthy {
		t.Fatalf("expected to get ai-prod with healthy status")
	}

	// Check GetContainer
	c, ok := store.GetContainer("ai-prod", "c-master")
	if !ok || !c.IsReady {
		t.Fatalf("expected to get c-master ready")
	}

	// Check FindContainer
	fc, depName, found := store.FindContainer("c-sidecar")
	if !found || depName != "ai-prod" || fc.ContainerID != "c-sidecar" {
		t.Fatalf("failed FindContainer: found=%v, dep=%s", found, depName)
	}

	// Check GetDeployments
	all := store.GetDeployments()
	if len(all) != 1 {
		t.Fatalf("expected 1 deployment, got %d", len(all))
	}

	// Check Summary
	summ := store.Summary()
	if summ.Status != StatusHealthy || summ.HealthyContainers != 2 {
		t.Fatalf("expected summary healthy with 2 containers, got %+v", summ)
	}

	// Test Prune
	active := map[string]struct{}{
		"other-dep": {},
	}
	store.Prune(active)
	if _, ok := store.GetDeployment("ai-prod"); ok {
		t.Fatalf("expected ai-prod to be pruned")
	}
}
