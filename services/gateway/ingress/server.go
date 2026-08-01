package ingress

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"orcn/core"
	"orcn/models"
)

type CachedNode struct {
	ID        string
	TargetURL *url.URL
}

type CachedRoute struct {
	Name        string
	RealModelID string
	Nodes       []*CachedNode
}

type Server struct {
	apiURL string

	mu        sync.RWMutex
	routes    map[string]*CachedRoute
	penalties map[string]time.Time
}

func New(apiURL string) *Server {
	s := &Server{
		apiURL:    apiURL,
		routes:    make(map[string]*CachedRoute),
		penalties: make(map[string]time.Time),
	}
	s.StartCacheSync()
	return s
}

func (s *Server) StartCacheSync() {
	log.Println("[Ingress] Starting highly-optimized memory cache sync...")
	s.syncRoutes()
	go func() {
		for {
			time.Sleep(5 * time.Second)
			s.syncRoutes()
		}
	}()
}

func (s *Server) syncRoutes() {
	resp, err := http.Get(s.apiURL)
	if err != nil {
		log.Println("[Ingress] Error syncing routes from API:", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Println("[Ingress] API returned non-200 status:", resp.StatusCode)
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Println("[Ingress] Error reading API response:", err)
		return
	}

	var deps []models.Deployment
	if err := json.Unmarshal(body, &deps); err != nil {
		log.Println("[Ingress] Error parsing API response:", err)
		return
	}

	newRoutes := make(map[string]*CachedRoute)
	for _, d := range deps {
		route := &CachedRoute{
			Name:        d.Name,
			RealModelID: d.ModelID,
			Nodes:       []*CachedNode{},
		}

		for _, node := range d.Nodes {
			if node.AppStatus != models.AppReady {
				continue
			}

			var endpoints []core.Endpoint
			if err := json.Unmarshal([]byte(node.EndpointsJSON), &endpoints); err == nil && len(endpoints) > 0 {
				ep := endpoints[0]
				targetURLStr := ep.BaseURL
				if !strings.HasPrefix(targetURLStr, "http") {
					targetURLStr = ep.Protocol + "://" + ep.BaseURL
				}
				if parsedURL, err := url.Parse(targetURLStr); err == nil {
					route.Nodes = append(route.Nodes, &CachedNode{
						ID:        node.ID,
						TargetURL: parsedURL,
					})
				}
			}
		}

		if len(route.Nodes) > 0 {
			newRoutes[d.Name] = route
		}
	}

	s.mu.Lock()
	s.routes = newRoutes
	s.mu.Unlock()
}

func (s *Server) PenalizeNode(nodeID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	s.penalties[nodeID] = time.Now().Add(30 * time.Second)
	log.Printf("[Ingress] 🔴 Node %s put in Penalty Box for 30s due to connection failure", nodeID)
}

func (s *Server) Handler() http.Handler {
	handler := func(w http.ResponseWriter, r *http.Request) {

		host := r.Host

		if strings.Contains(host, ":") {
			host = strings.Split(host, ":")[0]
		}

		if host != "llm.localhost" && host != "localhost" {
			http.Error(
				w,
				"Service not found on Ingress Gateway",
				http.StatusNotFound,
			)
			return
		}


		if r.Method == "GET" && strings.HasSuffix(r.URL.Path, "/v1/models") {
			s.handleListModels(w, r)
			return
		}


		if r.Method == "POST" {
			s.handleChatRequest(w, r)
			return
		}

		// w.WriteHeader(404)
		// w.Write([]byte("no found"))
		http.NotFound(w, r)
	}


	return http.HandlerFunc(handler)
}
