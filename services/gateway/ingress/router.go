package ingress

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
)

func (s *Server) handleListModels(w http.ResponseWriter, _ *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	modelsList := []map[string]any{}
	for _, route := range s.routes {
		modelsList = append(modelsList, map[string]any{
			"id":       route.Name,
			"object":   "model",
			"created":  1686935002,
			"owned_by": "orcn",
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"object": "list",
		"data":   modelsList,
	})
}

func (s *Server) handleChatRequest(w http.ResponseWriter, r *http.Request) {
	modelName, payload, err := extractModelFromBody(r)
	if err != nil {
		http.Error(w, "Missing 'model' field in request body", http.StatusBadRequest)
		return
	}

	route, err := s.lookupRoute(modelName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Model '%s' not found or deployment is offline", modelName), http.StatusNotFound)
		return
	}

	rewriteRequestBody(r, payload, route.RealModelID)

	node, err := s.selectReadyNode(route)
	if err != nil {
		http.Error(w, "Cluster is at maximum capacity. Please try again in a few seconds.", http.StatusTooManyRequests)
		return
	}

	ingressLog.Info("Routing %s request to %s -> %s", modelName, r.URL.Path, node.TargetURL.String())
	
	atomic.AddInt32(&node.Active, 1)
	defer atomic.AddInt32(&node.Active, -1)

	proxy := NewReverseProxy(node.TargetURL, r.Host, node.ID, route, s)
	proxy.ServeHTTP(w, r)
}


func extractModelFromBody(r *http.Request) (string, map[string]any, error) {
	if r.Method != "POST" || r.Body == nil {
		return "", nil, fmt.Errorf("request must be POST with a JSON body")
	}

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil || len(bodyBytes) == 0 {
		return "", nil, fmt.Errorf("empty request body")
	}

	var payload map[string]any
	if err := json.Unmarshal(bodyBytes, &payload); err != nil {
		return "", nil, fmt.Errorf("invalid JSON body")
	}

	modelName, ok := payload["model"].(string)
	if !ok || modelName == "" {
		return "", nil, fmt.Errorf("missing model field")
	}

	return modelName, payload, nil
}

func (s *Server) lookupRoute(name string) (*CachedRoute, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	routeKey := strings.ToLower(name)
	route, ok := s.routes[routeKey]
	if !ok || len(route.Nodes) == 0 {
		return nil, fmt.Errorf("route not found")
	}
	return route, nil
}

func rewriteRequestBody(r *http.Request, payload map[string]any, realModelID string) {
	if payload == nil || realModelID == "" {
		return
	}

	payload["model"] = realModelID
	newBodyBytes, _ := json.Marshal(payload)
	r.Body = io.NopCloser(bytes.NewBuffer(newBodyBytes))
	r.ContentLength = int64(len(newBodyBytes))
	r.Header.Set("Content-Length", fmt.Sprintf("%d", len(newBodyBytes)))
}

func (s *Server) selectReadyNode(route *CachedRoute) (*CachedNode, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	readyNodes := make([]*CachedNode, 0, len(route.Nodes))
	for _, node := range route.Nodes {
		if int(atomic.LoadInt32(&node.Active)) >= s.cfg.MaxActiveRequests {
			continue
		}
		readyNodes = append(readyNodes, node)
	}

	if len(readyNodes) == 0 {
		return nil, fmt.Errorf("no ready nodes")
	}

	return route.Balancer.Pick(readyNodes)
}
