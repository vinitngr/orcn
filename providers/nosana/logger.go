package nosana

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"orcn/core"

	"github.com/gorilla/websocket"
)

// nosanaLogAdapter implements core.LogAdapter for Nosana. It resolves the
// deployment owner and its active jobs, opens one log WebSocket per node, and
// normalizes every incoming record into a core.LogEvent.
type nosanaLogAdapter struct {
	client *Client
	events chan core.LogEvent

	cancel    context.CancelFunc
	wg        sync.WaitGroup
	closeOnce sync.Once
}

// NewLogAdapter returns a streaming log adapter for a Nosana deployment.
// The supplied client MUST already be bound to a verified provider connection
// (see Client.WithConfig) so that authenticated requests succeed.
func (c *Client) NewLogAdapter(deploymentID string) (core.LogAdapter, error) {
	if deploymentID == "" {
		return nil, fmt.Errorf("deployment id is required")
	}
	if c == nil || c.APIKey == "" {
		return nil, fmt.Errorf("nosana client is not bound to a provider connection")
	}

	ctx, cancel := context.WithCancel(context.Background())

	owner, err := c.resolveOwner(deploymentID)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to resolve deployment owner: %w", err)
	}

	jobs, err := c.listJobs(deploymentID)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to list deployment jobs: %w", err)
	}

	adapter := &nosanaLogAdapter{
		client: c,
		events: make(chan core.LogEvent, 256),
		cancel: cancel,
	}

	if len(jobs) == 0 {
		adapter.emit(ctx, core.LogEvent{
			Node:      shortNodeID(deploymentID),
			Container: "system",
			Timestamp: time.Now().UTC(),
			Log:       "no active jobs found for this deployment",
			Source:    core.LogSourceSystem,
		})
		close(adapter.events)
		return adapter, nil
	}

	adapter.wg.Add(len(jobs))
	for _, job := range jobs {
		go adapter.streamJob(ctx, deploymentID, job, owner)
	}

	go func() {
		adapter.wg.Wait()
		close(adapter.events)
	}()

	return adapter, nil
}

// Events returns the normalized log stream.
func (a *nosanaLogAdapter) Events() <-chan core.LogEvent {
	return a.events
}

// Close stops all streams and releases every underlying resource. It is
// idempotent.
func (a *nosanaLogAdapter) Close() error {
	a.closeOnce.Do(a.cancel)
	return nil
}

func (a *nosanaLogAdapter) emit(ctx context.Context, ev core.LogEvent) {
	select {
	case a.events <- ev:
	case <-ctx.Done():
	}
}

func (a *nosanaLogAdapter) streamJob(ctx context.Context, deploymentID string, job jobInfo, owner string) {
	defer a.wg.Done()

	nodeID := job.Node
	if nodeID == "" {
		nodeID = job.Host
	}
	jobID := job.ID
	if jobID == "" {
		jobID = job.Job
	}
	if nodeID == "" || jobID == "" {
		a.emit(ctx, core.LogEvent{
			Node:      shortNodeID(deploymentID),
			Container: "system",
			Timestamp: time.Now().UTC(),
			Log:       "skipping job with missing node or job id",
			Source:    core.LogSourceSystem,
		})
		return
	}

	backoff := time.Second
	const maxBackoff = 30 * time.Second

	for {
		if ctx.Err() != nil {
			return
		}

		err := a.connectAndRead(ctx, deploymentID, jobID, nodeID, owner)
		if ctx.Err() != nil {
			return
		}

		a.emit(ctx, core.LogEvent{
			Node:      shortNodeID(nodeID),
			Container: "system",
			Timestamp: time.Now().UTC(),
			Log:       fmt.Sprintf("log stream interrupted: %v; reconnecting in %s", err, backoff),
			Source:    core.LogSourceSystem,
		})

		select {
		case <-time.After(backoff):
		case <-ctx.Done():
			return
		}
		if backoff < maxBackoff {
			backoff *= 2
			if backoff > maxBackoff {
				backoff = maxBackoff
			}
		}
	}
}

func (a *nosanaLogAdapter) connectAndRead(ctx context.Context, deploymentID, jobID, nodeID, owner string) error {
	authHeader, err := a.client.fetchAuthHeader(deploymentID, jobID)
	if err != nil {
		return fmt.Errorf("auth header: %w", err)
	}

	wsURL := fmt.Sprintf("wss://%s.node.k8s.prd.nos.ci/", strings.ToLower(nodeID))

	dialer := websocket.Dialer{
		HandshakeTimeout: 15 * time.Second,
	}
	conn, _, err := dialer.DialContext(ctx, wsURL, nil)
	if err != nil {
		return fmt.Errorf("dial %s: %w", wsURL, err)
	}

	connCtx, connCancel := context.WithCancel(ctx)
	defer connCancel()

	// Guarantee the socket is unblocked when the adapter is closed.
	go func() {
		<-connCtx.Done()
		conn.Close()
	}()

	request := map[string]any{
		"path": "/log",
		"body": map[string]any{
			"jobAddress": jobID,
			"address":    owner,
		},
		"header": authHeader,
	}
	if err := conn.WriteJSON(request); err != nil {
		return fmt.Errorf("subscribe: %w", err)
	}

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			return err
		}
		a.handleMessage(ctx, nodeID, data)
	}
}

func (a *nosanaLogAdapter) handleMessage(ctx context.Context, nodeID string, data []byte) {
	raw := string(data)

	var envelope struct {
		Path  string          `json:"path"`
		Data  json.RawMessage `json:"data"`
		Error string          `json:"error"`
	}
	if err := json.Unmarshal(data, &envelope); err != nil {
		// Not JSON: pass through as a system line unless it is a health check.
		line := cleanLine(raw)
		if line != "" && !strings.Contains(line, "GET /health") {
			a.emit(ctx, core.LogEvent{
				Node:      shortNodeID(nodeID),
				Container: "system",
				Timestamp: time.Now().UTC(),
				Log:       line,
				Source:    core.LogSourceSystem,
			})
		}
		return
	}

	if envelope.Error != "" {
		a.emit(ctx, core.LogEvent{
			Node:      shortNodeID(nodeID),
			Container: "system",
			Timestamp: time.Now().UTC(),
			Log:       cleanLine(envelope.Error),
			Source:    core.LogSourceSystem,
		})
		return
	}

	if envelope.Path != "log" || len(envelope.Data) == 0 {
		return
	}

	payload := normalizeLogData(envelope.Data)

	if payload.Method == containerLogMethod {
		if strings.Contains(payload.Log, "GET /health") {
			return
		}
		line := cleanLine(payload.Log)
		if line == "" {
			return
		}
		container := payload.OpID
		if container == "" {
			container = "app"
		}
		a.emit(ctx, core.LogEvent{
			Node:      shortNodeID(nodeID),
			Container: container,
			Timestamp: time.Now().UTC(),
			Log:       line,
			Source:    core.LogSourceApp,
		})
		return
	}

	message := extractSystemMessage(payload)
	if message == "" {
		return
	}
	a.emit(ctx, core.LogEvent{
		Node:      shortNodeID(nodeID),
		Container: "system",
		Timestamp: time.Now().UTC(),
		Log:       message,
		Source:    core.LogSourceSystem,
	})
}

const containerLogMethod = "NodeRepository.displayLog"

// extractSystemMessage converts a non-container Nosana record into a single
// human-readable system line. It returns "" for intermediate progress noise
// that should not reach the UI.
func extractSystemMessage(payload normalizedLog) string {
	if strings.Contains(payload.Method, "MultiProgressBarReporter") {
		var progress struct {
			Event struct {
				Status string `json:"status"`
				ID     string `json:"id"`
			} `json:"event"`
		}
		if len(payload.Payload) > 0 {
			_ = json.Unmarshal(payload.Payload, &progress)
		}
		switch progress.Event.Status {
		case "Download complete", "Already exists", "Pull complete":
			return strings.TrimSpace(progress.Event.Status + ": " + progress.Event.ID)
		}
		return ""
	}

	if payload.Method == "TaskManager.start" {
		job := payload.Job
		if job == "" {
			job = "unknown"
		}
		return "TaskManager started (job: " + job + ")"
	}

	text := cleanLine(payload.Log)
	if text == "" {
		return ""
	}
	if strings.Contains(text, "APIServer") || strings.Contains(text, "HTTP/1.1") || strings.Contains(text, "tokens/s") {
		return ""
	}
	return text
}

type normalizedLog struct {
	Method  string          `json:"method"`
	OpID    string          `json:"opId"`
	Log     string          `json:"log"`
	Job     string          `json:"job"`
	Payload json.RawMessage `json:"payload"`
}

var ansiPattern = regexp.MustCompile(`\x1b\[[0-9;?]*[a-zA-Z]`)

// cleanLine strips ANSI escape sequences, carriage returns and surrounding
// whitespace so raw provider output renders cleanly in a browser.
func cleanLine(s string) string {
	s = ansiPattern.ReplaceAllString(s, "")
	s = strings.ReplaceAll(s, "\r", "")
	return strings.TrimSpace(s)
}

// normalizeLogData accepts the various shapes Nosana uses for the `data`
// field (nested JSON string, raw object, or plain text) and returns a
// canonical record.
func normalizeLogData(data json.RawMessage) normalizedLog {
	if len(data) > 0 && data[0] == '"' {
		var inner string
		if err := json.Unmarshal(data, &inner); err == nil {
			if inner == "" {
				return normalizedLog{}
			}
			var parsed normalizedLog
			if err := json.Unmarshal([]byte(inner), &parsed); err == nil {
				return parsed
			}
			return normalizedLog{Log: inner}
		}
	}

	var parsed normalizedLog
	if err := json.Unmarshal(data, &parsed); err == nil {
		return parsed
	}
	return normalizedLog{Log: string(data)}
}

type jobInfo struct {
	ID   string `json:"id"`
	Job  string `json:"job"`
	Node string `json:"node"`
	Host string `json:"host"`
}

func (c *Client) resolveOwner(deploymentID string) (string, error) {
	b, err := c.request("GET", fmt.Sprintf("/deployments/%s", deploymentID), nil)
	if err != nil {
		return "", err
	}
	var detail struct {
		Owner     string `json:"owner"`
		Authority string `json:"authority"`
	}
	if err := json.Unmarshal(b, &detail); err != nil {
		return "", err
	}
	if detail.Owner != "" {
		return detail.Owner, nil
	}
	if detail.Authority != "" {
		return detail.Authority, nil
	}
	return "", fmt.Errorf("deployment has no owner or authority")
}

func (c *Client) listJobs(deploymentID string) ([]jobInfo, error) {
	b, err := c.request("GET", fmt.Sprintf("/deployments/%s/jobs", deploymentID), nil)
	if err != nil {
		return nil, err
	}

	trimmed := bytes.TrimSpace(b)
	if len(trimmed) > 0 && trimmed[0] == '[' {
		var jobs []jobInfo
		if err := json.Unmarshal(trimmed, &jobs); err != nil {
			return nil, err
		}
		return jobs, nil
	}

	var wrapped struct {
		Jobs []jobInfo `json:"jobs"`
		Data []jobInfo `json:"data"`
	}
	if err := json.Unmarshal(trimmed, &wrapped); err != nil {
		return nil, err
	}
	if len(wrapped.Jobs) > 0 {
		return wrapped.Jobs, nil
	}
	return wrapped.Data, nil
}

func (c *Client) fetchAuthHeader(deploymentID, jobID string) (string, error) {
	path := fmt.Sprintf("/deployments/%s/header?message=%s&includeTime=true", deploymentID, url.QueryEscape(jobID))
	b, err := c.request("GET", path, nil)
	if err != nil {
		return "", err
	}

	raw := strings.TrimSpace(string(b))
	if raw == "" {
		return "", fmt.Errorf("empty auth header")
	}

	var parsed struct {
		Header    string `json:"header"`
		Token     string `json:"token"`
		Signature string `json:"signature"`
	}
	if err := json.Unmarshal(b, &parsed); err == nil {
		if parsed.Header != "" {
			return parsed.Header, nil
		}
		if parsed.Token != "" {
			return parsed.Token, nil
		}
		if parsed.Signature != "" {
			return parsed.Signature, nil
		}
	}
	return raw, nil
}

func shortNodeID(id string) string {
	if len(id) > 8 {
		return id[:8]
	}
	return id
}
