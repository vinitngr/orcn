package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"orcn/core"
	"orcn/core/providerconn"
	"orcn/models"

	"github.com/gorilla/websocket"
)

var logUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Log streams are read-only from the browser and may be served from a
	// different origin (console dev server). Authorization is enforced by the
	// gateway middleware, not by the Origin header.
	CheckOrigin: func(r *http.Request) bool { return true },
}

// handleNodeLogs streams every normalized log for a node over a WebSocket. The
// connection is torn down (and every provider resource released) when the
// client disconnects.
func (s *Server) handleNodeLogs(w http.ResponseWriter, r *http.Request) {
	s.streamNodeLogs(w, r, false)
}

// handleNodeEvents streams normalized system events for a node over a
// WebSocket. System logs are surfaced as lifecycle/health events.
func (s *Server) handleNodeEvents(w http.ResponseWriter, r *http.Request) {
	s.streamNodeLogs(w, r, true)
}

func (s *Server) streamNodeLogs(w http.ResponseWriter, r *http.Request, eventsOnly bool) {
	deploymentID := r.PathValue("id")
	nodeID := r.PathValue("node_id")

	var dep models.Deployment
	if err := s.DB.Preload("Nodes").Where("id = ? OR name = ?", deploymentID, deploymentID).First(&dep).Error; err != nil {
		respondError(w, http.StatusNotFound, "Deployment not found")
		return
	}

	var node *models.Node
	for i := range dep.Nodes {
		if dep.Nodes[i].ID == nodeID {
			node = &dep.Nodes[i]
			break
		}
	}
	if node == nil {
		respondError(w, http.StatusNotFound, "Node not found in this deployment")
		return
	}

	// Some providers (e.g. Nosana single-op jobs) omit the container id on
	// workload logs. When the deployment has exactly one container we can
	// safely attribute those lines to it so the UI container filter works.
	singleContainer := ""
	if ids := containerIDs(dep.JobSpecJSON); len(ids) == 1 {
		singleContainer = ids[0]
	}

	provider, err := providerconn.Resolve(r.Context(), s.DB, s.Cfg, dep.ProviderID, dep.ProviderConnectionID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Provider unavailable: "+err.Error())
		return
	}

	adapter, err := provider.NewLogAdapter(node.ID)
	if err != nil {
		respondError(w, http.StatusBadGateway, "Failed to open log stream: "+err.Error())
		return
	}
	// Release the provider stream on every exit path, including client
	// disconnect. This is what prevents socket/goroutine leaks.
	defer adapter.Close()

	conn, err := logUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	// Detect client disconnects even while no events are flowing so the
	// adapter can be closed promptly.
	go func() {
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				cancel()
				return
			}
		}
	}()

	events := adapter.Events()
	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-events:
			if !ok {
				_ = conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, "stream ended"))
				return
			}
			if eventsOnly && event.Source != core.LogSourceSystem {
				continue
			}
			if singleContainer != "" && event.Source == core.LogSourceApp && event.Container == "app" {
				event.Container = singleContainer
			}
			_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.WriteJSON(event); err != nil {
				return
			}
		}
	}
}

// containerIDs extracts the declared container ids from a deployment job spec.
// It tolerates both the internal JobSpec and TemplateSpecV2 shapes.
func containerIDs(specJSON string) []string {
	if specJSON == "" {
		return nil
	}
	var spec struct {
		Containers []struct {
			ID string `json:"id"`
		} `json:"containers"`
	}
	if err := json.Unmarshal([]byte(specJSON), &spec); err != nil {
		return nil
	}
	ids := make([]string, 0, len(spec.Containers))
	for _, c := range spec.Containers {
		if c.ID != "" {
			ids = append(ids, c.ID)
		}
	}
	return ids
}
