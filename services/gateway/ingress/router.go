package ingress

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"time"
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
	// 1. Extract the model name from the JSON body
	modelName, payload, err := extractModelFromBody(r)
	if err != nil {
		http.Error(w, "Missing 'model' field in request body", http.StatusBadRequest)
		return
	}

	// 2. Look up the cached route
	route, err := s.lookupRoute(modelName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Model '%s' not found or deployment is offline", modelName), http.StatusNotFound)
		return
	}

	// 3. Rewrite the body: replace friendly name with real HuggingFace model ID
	rewriteRequestBody(r, payload, route.RealModelID)

	// 4. Select a healthy, non-penalized node
	node, err := s.selectReadyNode(route.Nodes)
	if err != nil {
		http.Error(w, "No ready nodes available for this model right now.", http.StatusServiceUnavailable)
		return
	}

	// 5. Proxy the request
	log.Printf("[Ingress] Routing %s request to %s -> %s\n", modelName, r.URL.Path, node.TargetURL.String())
	proxy := NewReverseProxy(node.TargetURL, r.Host, node.ID, s)
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

	route, ok := s.routes[name]
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

func (s *Server) selectReadyNode(nodes []*CachedNode) (*CachedNode, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var readyNodes []*CachedNode
	now := time.Now()
	for _, node := range nodes {
		if penaltyTime, exists := s.penalties[node.ID]; exists && now.Before(penaltyTime) {
			continue
		}
		readyNodes = append(readyNodes, node)
	}

	if len(readyNodes) == 0 {
		return nil, fmt.Errorf("no ready nodes")
	}

	selected := readyNodes[rand.Intn(len(readyNodes))]
	return selected, nil
}
