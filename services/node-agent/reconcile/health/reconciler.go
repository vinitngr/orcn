package health

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"orcn/core"
	"orcn/core/logger"
	"orcn/services/node-agent/reconcile"

	containertypes "github.com/docker/docker/api/types/container"
)

// WorkloadProvider returns the current registered jobs.
type WorkloadProvider interface {
	Jobs() map[string]core.JobSpec
}

// ContainerInspector inspects containers via Docker or mock.
type ContainerInspector interface {
	Inspect(ctx context.Context, id string) (containertypes.InspectResponse, error)
}

// HTTPProber executes an HTTP health check probe.
type HTTPProber interface {
	Probe(ctx context.Context, targetURL string, expectedStatus int, timeout time.Duration) (statusCode int, latencyMs int64, err error)
}

type defaultHTTPProber struct {
	client *http.Client
}

func newDefaultHTTPProber() *defaultHTTPProber {
	return &defaultHTTPProber{
		client: &http.Client{
			// Transport with keepalive reuse for efficiency
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     90 * time.Second,
			},
		},
	}
}

func (p *defaultHTTPProber) Probe(ctx context.Context, targetURL string, expectedStatus int, timeout time.Duration) (int, int64, error) {
	reqCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, targetURL, nil)
	if err != nil {
		return 0, 0, err
	}

	start := time.Now()
	resp, err := p.client.Do(req)
	latency := time.Since(start).Milliseconds()
	if err != nil {
		return 0, latency, err
	}
	defer resp.Body.Close()

	if expectedStatus > 0 && resp.StatusCode != expectedStatus {
		return resp.StatusCode, latency, fmt.Errorf("expected status %d, got %d", expectedStatus, resp.StatusCode)
	} else if expectedStatus == 0 && (resp.StatusCode < 200 || resp.StatusCode >= 400) {
		return resp.StatusCode, latency, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	return resp.StatusCode, latency, nil
}

// Reconciler is an agent component that reconciles health status across all deployments and containers.
type Reconciler struct {
	loop             *reconcile.Loop
	workloads        WorkloadProvider
	inspector        ContainerInspector
	store            *Store
	prober           HTTPProber
	proxyTargetHost  string
	failureThreshold int
	logger           *logger.Logger
}

// Config holds configuration parameters for the health reconciler.
type Config struct {
	Interval         time.Duration
	FailureThreshold int
	ProxyTargetHost  string
}

// NewReconciler creates a new Health Reconciler component.
func NewReconciler(cfg Config, workloads WorkloadProvider, inspector ContainerInspector, store *Store) *Reconciler {
	if cfg.Interval <= 0 {
		cfg.Interval = 5 * time.Second
	}
	if cfg.FailureThreshold <= 0 {
		cfg.FailureThreshold = 3
	}
	if store == nil {
		store = NewStore()
	}

	r := &Reconciler{
		workloads:        workloads,
		inspector:        inspector,
		store:            store,
		prober:           newDefaultHTTPProber(),
		proxyTargetHost:  cfg.ProxyTargetHost,
		failureThreshold: cfg.FailureThreshold,
		logger:           logger.New("HEALTH_RECONCILER"),
	}

	r.loop = reconcile.NewLoop("Health_Reconciler", cfg.Interval, r.reconcile)
	return r
}

func (r *Reconciler) SetProber(prober HTTPProber) {
	r.prober = prober
}

func (r *Reconciler) Name() string {
	return r.loop.Name()
}

func (r *Reconciler) Start(ctx context.Context) error {
	r.logger.Info("Starting health reconcile loop...")
	return r.loop.Start(ctx)
}

func (r *Reconciler) Stop(ctx context.Context) error {
	r.logger.Info("Stopping health reconcile loop...")
	return r.loop.Stop(ctx)
}

func (r *Reconciler) Store() *Store {
	return r.store
}

func (r *Reconciler) reconcile(ctx context.Context) error {
	if r.workloads == nil || r.inspector == nil {
		return nil
	}

	jobs := r.workloads.Jobs()
	activeDeployments := make(map[string]struct{}, len(jobs))

	now := time.Now().UTC()

	for jobName, job := range jobs {
		depName := job.JobName
		if depName == "" {
			depName = jobName
		}
		activeDeployments[depName] = struct{}{}

		depHealth := &DeploymentHealth{
			DeploymentName: depName,
			Containers:     make(map[string]*ContainerHealth, len(job.Containers)),
			LastCheckedAt:  now,
		}

		for _, containerSpec := range job.Containers {
			cHealth := r.checkContainer(ctx, depName, containerSpec, now)
			depHealth.Containers[containerSpec.ID] = cHealth
			depHealth.TotalContainers++

			switch cHealth.Status {
			case StatusHealthy:
				depHealth.HealthyContainers++
			case StatusDegraded:
				depHealth.DegradedContainers++
			case StatusUnhealthy, StatusDown:
				depHealth.UnhealthyContainers++
			}
		}

		// Compute deployment aggregate status
		if depHealth.TotalContainers == 0 {
			depHealth.Status = StatusUnknown
		} else if depHealth.UnhealthyContainers > 0 {
			if depHealth.HealthyContainers > 0 {
				depHealth.Status = StatusDegraded
			} else {
				depHealth.Status = StatusUnhealthy
			}
		} else if depHealth.DegradedContainers > 0 {
			depHealth.Status = StatusDegraded
		} else {
			depHealth.Status = StatusHealthy
		}

		r.store.SetDeployment(depHealth)
	}

	// Purge workloads that were unregistered
	r.store.Prune(activeDeployments)
	return nil
}

func (r *Reconciler) checkContainer(ctx context.Context, depName string, spec core.ContainerSpec, now time.Time) *ContainerHealth {
	current, exists := r.store.GetContainer(depName, spec.ID)
	if !exists {
		current = &ContainerHealth{
			ContainerID:      spec.ID,
			DeploymentName:   depName,
			Status:           StatusStarting,
			LastTransitionAt: now,
		}
	}

	current.LastCheckedAt = now

	// 1. Inspect container
	inspection, err := r.inspector.Inspect(ctx, spec.ID)
	if err != nil || inspection.State == nil || !inspection.State.Running {
		// Process is not running or not found -> Immediate Down
		var exitCode *int
		if inspection.State != nil {
			ec := inspection.State.ExitCode
			exitCode = &ec
		}

		r.transitionStatus(current, StatusDown, false, now)
		current.ConsecutiveFailures++
		current.ConsecutiveSuccesses = 0
		current.ExitCode = exitCode
		if err != nil {
			current.LastError = fmt.Sprintf("container inspect failed: %v", err)
		} else if inspection.State != nil && inspection.State.Status != "" {
			current.LastError = fmt.Sprintf("container state is %q", inspection.State.Status)
		} else {
			current.LastError = "container is not running"
		}
		current.LastStatusCode = 0
		current.LastLatencyMs = 0
		return current
	}

	// Process is running, clear exit code
	current.ExitCode = nil

	// 2. Check if health check probe is configured in expose spec
	probeSpec, port := findHealthCheckProbe(spec.Args.Expose)
	if probeSpec == nil {
		// No HTTP probe configured: Process is running -> Healthy
		current.HasProbe = false
		current.ConsecutiveSuccesses++
		current.ConsecutiveFailures = 0
		current.LastError = ""
		current.LastStatusCode = 0
		current.LastLatencyMs = 0
		r.transitionStatus(current, StatusHealthy, true, now)
		return current
	}

	current.HasProbe = true

	// 3. Resolve target address for HTTP probe
	host := r.resolveContainerHost(inspection)
	targetURL := formatProbeURL(host, port, probeSpec.Path)

	timeout := time.Duration(probeSpec.TimeoutSeconds) * time.Second
	if timeout <= 0 {
		timeout = 5 * time.Second
	}

	statusCode, latency, probeErr := r.prober.Probe(ctx, targetURL, probeSpec.ExpectedStatus, timeout)
	current.LastStatusCode = statusCode
	current.LastLatencyMs = latency

	if probeErr == nil {
		// Probe succeeded
		current.ConsecutiveSuccesses++
		current.ConsecutiveFailures = 0
		current.LastError = ""
		r.transitionStatus(current, StatusHealthy, true, now)
		return current
	}

	// Probe failed
	current.ConsecutiveFailures++
	current.ConsecutiveSuccesses = 0
	current.LastError = probeErr.Error()

	if current.ConsecutiveFailures >= r.failureThreshold {
		r.transitionStatus(current, StatusUnhealthy, false, now)
	} else {
		// Degraded: failed probe count < threshold
		r.transitionStatus(current, StatusDegraded, false, now)
	}

	return current
}

func (r *Reconciler) transitionStatus(c *ContainerHealth, next Status, ready bool, now time.Time) {
	if c.Status != next {
		c.Status = next
		c.LastTransitionAt = now
	}
	c.IsReady = ready
}

func (r *Reconciler) resolveContainerHost(inspection containertypes.InspectResponse) string {
	if r.proxyTargetHost != "" {
		return r.proxyTargetHost
	}
	if inspection.NetworkSettings != nil {
		for _, network := range inspection.NetworkSettings.Networks {
			if network.IPAddress != "" {
				return network.IPAddress
			}
		}
		if inspection.NetworkSettings.IPAddress != "" {
			return inspection.NetworkSettings.IPAddress
		}
	}
	return "127.0.0.1"
}

func findHealthCheckProbe(expose []core.ExposeSpec) (*core.HealthCheckSpec, int) {
	for _, exp := range expose {
		if exp.HealthCheck != nil {
			return exp.HealthCheck, exp.Port
		}
	}
	return nil, 0
}

func formatProbeURL(host string, port int, path string) string {
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return fmt.Sprintf("http://%s:%s%s", host, strconv.Itoa(port), path)
}
