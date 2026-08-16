package docker

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	containertypes "github.com/docker/docker/api/types/container"
)

func dockerHealthcheck(spec ContainerConfig) *containertypes.HealthConfig {
	checks := make([]string, 0)
	maxTimeout := 10
	for _, port := range spec.Ports {
		if len(port.HealthChecks) == 0 || port.Protocol != "" && port.Protocol != "http" {
			continue
		}
		for _, health := range port.HealthChecks {
			timeout := health.TimeoutSeconds
			if timeout <= 0 {
				timeout = 10
			}
			if timeout > maxTimeout {
				maxTimeout = timeout
			}
			path := health.Path
			if path == "" {
				path = "/"
			}
			if path[0] != '/' {
				path = "/" + path
			}
			expected := health.ExpectedStatus
			if expected == 0 {
				expected = http.StatusOK
			}
			checks = append(checks, fmt.Sprintf("code=$(curl -f --max-time %d -o /dev/null -s -w '%%{http_code}' http://localhost:%d%s) && test \"$code\" = \"%d\"", timeout, port.Container, path, expected))
		}
	}
	if len(checks) == 0 {
		return nil
	}
	return &containertypes.HealthConfig{Test: []string{"CMD-SHELL", strings.Join(checks, " && ")}, Interval: 30 * time.Second, Timeout: time.Duration(maxTimeout) * time.Second, Retries: 3, StartPeriod: 30 * time.Second}
}
