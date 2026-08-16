//go:build integration

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"orcn/core"
	"orcn/services/node-agent/config"
	"orcn/services/node-agent/engines/docker"
	"orcn/services/node-agent/events"
	restinterface "orcn/services/node-agent/interfaces/rest"
)

const integrationRegistrationKey = "integration-registration-key"

func TestNodeAgentDockerIntegration(t *testing.T) {
	image := os.Getenv("NODE_AGENT_TEST_IMAGE")
	if image == "" {
		image = "busybox:latest"
	}
	eventBuffer := events.NewBuffer(200)

	engine, err := docker.NewEngine(config.Config{
		DockerHost:   os.Getenv("DOCKER_HOST"),
		LogTailLimit: 100,
	}, events.NewRecorder(eventBuffer, nil))
	if err != nil {
		t.Skipf("Docker is unavailable: %v", err)
	}
	defer engine.Close()

	if err := engine.Ping(context.Background()); err != nil {
		t.Skipf("Docker is unavailable: %v", err)
	}

	job := integrationJob(image)
	removeIntegrationContainers(t, engine, job)
	routes := restinterface.NewRouteTable()
	state := restinterface.NewRegistrationState()
	admin := httptest.NewServer(restinterface.NewAdminServer(engine, routes, state, eventBuffer, "", integrationRegistrationKey).Handler())
	defer admin.Close()
	proxyHost := os.Getenv("NODE_AGENT_TEST_PROXY_HOST")
	if proxyHost == "" {
		proxyHost = "127.0.0.1"
	}
	forwarder := httptest.NewServer(restinterface.NewRouter(routes, state, proxyHost).Handler())
	defer forwarder.Close()

	client := admin.Client()
	proxyClient := forwarder.Client()
	cleanup := func() {
		for _, container := range job.Containers {
			request(t, client, http.MethodPost, admin.URL+"/containers/"+container.ID+"/stop", "", "")
			request(t, client, http.MethodDelete, admin.URL+"/containers/"+container.ID, "", "")
		}
	}
	defer cleanup()

	t.Run("blocked before registration", func(t *testing.T) {
		response := request(t, client, http.MethodGet, admin.URL+"/healthz", "", "")
		assertStatus(t, response, http.StatusForbidden)
	})

	t.Run("registers and starts all containers", func(t *testing.T) {
		response := register(t, client, admin.URL, job)
		assertStatus(t, response, http.StatusOK)
		for _, container := range job.Containers {
			inspect, err := engine.Inspect(context.Background(), container.ID)
			if err != nil {
				t.Fatalf("inspect %s: %v", container.ID, err)
			}
			if inspect.State == nil || !inspect.State.Running {
				t.Fatalf("container %s is not running", container.ID)
			}
		}
	})

	t.Run("admin health and events", func(t *testing.T) {
		assertStatus(t, request(t, client, http.MethodGet, admin.URL+"/healthz", "", ""), http.StatusOK)
		response := request(t, client, http.MethodGet, admin.URL+"/events", "", "")
		assertStatus(t, response, http.StatusOK)
		body := readBody(t, response)
		if !strings.Contains(body, "image_pull_started") || !strings.Contains(body, "started") {
			t.Fatalf("expected lifecycle events, got %s", body)
		}
	})

	t.Run("idempotent run reuses matching containers", func(t *testing.T) {
		for _, container := range job.Containers {
			payload := fmt.Sprintf(`{"id":%q}`, container.ID)
			response := request(t, client, http.MethodPost, admin.URL+"/containers", payload, "")
			assertStatus(t, response, http.StatusOK)
			if strings.Contains(readBody(t, response), `"created":true`) {
				t.Fatalf("matching container %s was recreated", container.ID)
			}
		}
	})

	t.Run("logs snapshot", func(t *testing.T) {
		response := request(t, client, http.MethodGet, admin.URL+"/containers/agent-log-test/logs?tail=20", "", "")
		assertStatus(t, response, http.StatusOK)
		if !strings.Contains(readBody(t, response), "node-agent-integration") {
			t.Fatal("expected test log output")
		}
	})

	t.Run("stop rejects remove while running", func(t *testing.T) {
		response := request(t, client, http.MethodDelete, admin.URL+"/containers/agent-log-test", "", "")
		assertStatus(t, response, http.StatusConflict)

		assertStatus(t, request(t, client, http.MethodPost, admin.URL+"/containers/agent-log-test/stop", "", ""), http.StatusOK)
		assertStatus(t, request(t, client, http.MethodDelete, admin.URL+"/containers/agent-log-test", "", ""), http.StatusOK)
	})

	t.Run("start and restart", func(t *testing.T) {
		payload := `{"id":"agent-log-test"}`
		assertStatus(t, request(t, client, http.MethodPost, admin.URL+"/containers", payload, ""), http.StatusOK)
		assertStatus(t, request(t, client, http.MethodPost, admin.URL+"/containers/agent-log-test/restart", "", ""), http.StatusOK)
	})

	t.Run("proxy forwards public route and strips headers", func(t *testing.T) {
		requestURL := forwarder.URL + "/"
		req, err := http.NewRequest(http.MethodGet, requestURL, nil)
		if err != nil {
			t.Fatal(err)
		}
		req.Header.Set("X-Orcn-Container", "agent-http-test")
		req.Header.Set("X-Orcn-Port", "18081")
		response, err := proxyClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer response.Body.Close()
		if response.StatusCode != http.StatusOK {
			t.Fatalf("proxy status = %d, want %d: %s", response.StatusCode, http.StatusOK, readBody(t, response))
		}
		if body := readBody(t, response); !strings.Contains(body, "node-agent-integration") {
			t.Fatalf("unexpected proxy response: %s", body)
		}
	})
}

func integrationJob(image string) core.JobSpec {
	return core.JobSpec{
		Version: "v2",
		JobName: "node-agent-integration",
		Type:    "container",
		NodeID:  "integration-node",
		Containers: []core.ContainerSpec{
			{
				ID: "agent-log-test",
				Args: core.ContainerArgs{
					Image: image,
					Cmd:   []string{"sh", "-c", "while true; do echo node-agent-integration; sleep 1; done"},
				},
			},
			{
				ID: "agent-http-test",
				Args: core.ContainerArgs{
					Image: image,
					Cmd:   []string{"sh", "-c", "mkdir -p /www && echo node-agent-integration > /www/index.html && exec httpd -f -p 18081 -h /www"},
					Expose: []core.ExposeSpec{{
						Port:     18081,
						Protocol: "http",
						IsPublic: true,
					}},
				},
			},
		},
	}
}

func removeIntegrationContainers(t *testing.T, engine *docker.Engine, job core.JobSpec) {
	t.Helper()
	for _, container := range job.Containers {
		inspect, err := engine.Inspect(context.Background(), container.ID)
		if err != nil {
			continue
		}
		if inspect.State != nil && inspect.State.Running {
			if err := engine.Stop(context.Background(), container.ID); err != nil {
				t.Fatalf("stop stale container %s: %v", container.ID, err)
			}
		}
		for attempt := 0; attempt < 20; attempt++ {
			inspect, err = engine.Inspect(context.Background(), container.ID)
			if err != nil || inspect.State == nil || !inspect.State.Running {
				break
			}
			time.Sleep(100 * time.Millisecond)
		}
		if err := engine.Remove(context.Background(), container.ID); err != nil {
			t.Fatalf("remove stale container %s: %v", container.ID, err)
		}
	}
}

func register(t *testing.T, client *http.Client, endpoint string, job core.JobSpec) *http.Response {
	t.Helper()
	body, err := json.Marshal(job)
	if err != nil {
		t.Fatal(err)
	}
	return request(t, client, http.MethodPost, endpoint+"/register", string(body), integrationRegistrationKey)
}

func request(t *testing.T, client *http.Client, method, endpoint, body, registrationKey string) *http.Response {
	t.Helper()
	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	req, err := http.NewRequest(method, endpoint, reader)
	if err != nil {
		t.Fatal(err)
	}
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if registrationKey != "" {
		req.Header.Set("X-Registration-Key", registrationKey)
	}
	response, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	return response
}

func assertStatus(t *testing.T, response *http.Response, expected int) {
	t.Helper()
	if response.StatusCode == expected {
		return
	}
	body := readBody(t, response)
	t.Fatalf("status = %d, want %d: %s", response.StatusCode, expected, body)
}

func readBody(t *testing.T, response *http.Response) string {
	t.Helper()
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	return string(body)
}
