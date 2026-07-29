package ingress

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"strings"

	"orcn/core"
	"orcn/models"
)

func (s *Server) handleListModels(w http.ResponseWriter, _ *http.Request) {
	var deps []models.Deployment
	s.DB.Where("status = ?", "RUNNING").Find(&deps)

	modelsList := []map[string]any{}
	for _, d := range deps {
		modelsList = append(modelsList, map[string]any{
			"id":       d.Name,
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

	// 2. Look up the deployment by friendly name
	dep, err := s.lookupDeployment(modelName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Model '%s' not found or deployment is offline", modelName), http.StatusNotFound)
		return
	}

	// 3. Rewrite the body: replace friendly name with real HuggingFace model ID
	rewriteRequestBody(r, payload, dep.ModelID)

	// 4. Select a healthy node
	node, err := selectReadyNode(dep.Nodes)
	if err != nil {
		http.Error(w, "No ready nodes available for this model.", http.StatusServiceUnavailable)
		return
	}

	// 5. Build the target URL from node endpoints
	targetURL, err := buildTargetURL(node)
	if err != nil {
		http.Error(w, "Internal error: Node endpoints are invalid", http.StatusInternalServerError)
		return
	}

	// 6. Proxy the request
	log.Printf("[Ingress] Routing %s request to %s -> %s\n", modelName, r.URL.Path, targetURL.String())
	proxy := NewReverseProxy(targetURL, r.Host, node.ID)
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

func (s *Server) lookupDeployment(name string) (*models.Deployment, error) {
	var dep models.Deployment
	if err := s.DB.Preload("Nodes").Where("name = ?", name).First(&dep).Error; err != nil {
		return nil, err
	}
	return &dep, nil
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

func selectReadyNode(nodes []models.Node) (*models.Node, error) {
	var readyNodes []models.Node
	for _, node := range nodes {
		if node.Status == "READY" {
			readyNodes = append(readyNodes, node)
		}
	}

	if len(readyNodes) == 0 {
		return nil, fmt.Errorf("no ready nodes")
	}

	selected := readyNodes[rand.Intn(len(readyNodes))]
	return &selected, nil
}

func buildTargetURL(node *models.Node) (*url.URL, error) {
	var endpoints []core.Endpoint
	if err := json.Unmarshal([]byte(node.EndpointsJSON), &endpoints); err != nil || len(endpoints) == 0 {
		return nil, fmt.Errorf("invalid endpoints")
	}

	ep := endpoints[0]
	targetURLStr := ep.BaseURL
	if !strings.HasPrefix(targetURLStr, "http") {
		targetURLStr = fmt.Sprintf("%s://%s", ep.Protocol, ep.BaseURL)
	}

	return url.Parse(targetURLStr)
}
