package ingress

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
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
	
	addNodeToRoute := func(routeName string, nodeID string, targetURL *url.URL, modelID string) {
		routeKey := strings.ToLower(routeName)
		if _, exists := newRoutes[routeKey]; !exists {
			newRoutes[routeKey] = &CachedRoute{
				Name:        routeKey, 
				RealModelID: modelID, 
				Nodes:       []*CachedNode{},
			}
		}
		
		// Add node if not already present
		for _, n := range newRoutes[routeKey].Nodes {
			if n.ID == nodeID { return }
		}
		
		newRoutes[routeKey].Nodes = append(newRoutes[routeKey].Nodes, &CachedNode{
			ID:        nodeID,
			TargetURL: targetURL,
		})
	}

	for _, d := range deps {
		for _, node := range d.Nodes {
			if node.AppStatus != models.AppReady {
				continue
			}

			var endpoints []core.Endpoint
			if err := json.Unmarshal([]byte(node.EndpointsJSON), &endpoints); err == nil && len(endpoints) > 0 {
				
				shortNodeID := node.ID
				if len(shortNodeID) > 8 {
					shortNodeID = shortNodeID[:8]
				}

				// 1. Primary Route (using first endpoint)
				ep0 := endpoints[0]
				targetURLStr0 := ep0.BaseURL
				if !strings.HasPrefix(targetURLStr0, "http") {
					proto := "http"
					if ep0.Protocol != "" { proto = ep0.Protocol }
					targetURLStr0 = proto + "://" + ep0.BaseURL
				}
				
				if parsedURL0, err := url.Parse(targetURLStr0); err == nil {
					// Deployment wildcard: e.g. n8n.localhost
					addNodeToRoute(d.Name, node.ID, parsedURL0, d.ModelID)
					// Direct node hash: e.g. a7f9b2c.localhost
					addNodeToRoute(shortNodeID, node.ID, parsedURL0, d.ModelID)
				}

				// 2. Port-Specific Routes (for multi-port containers)
				for _, ep := range endpoints {
					portStr := fmt.Sprintf("%d", ep.Port)
					targetURLStr := ep.BaseURL
					if !strings.HasPrefix(targetURLStr, "http") {
						proto := "http"
						if ep.Protocol != "" { proto = ep.Protocol }
						targetURLStr = proto + "://" + ep.BaseURL
					}
					if parsedURL, err := url.Parse(targetURLStr); err == nil {
						// e.g. n8n-5678.localhost
						addNodeToRoute(d.Name+"-"+portStr, node.ID, parsedURL, d.ModelID)
						// e.g. a7f9b2c-5678.localhost
						addNodeToRoute(shortNodeID+"-"+portStr, node.ID, parsedURL, d.ModelID)
					}
				}
			}
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
			routeKey := strings.ToLower(strings.TrimSuffix(host, ".localhost"))
			
			s.mu.RLock()
			route, exists := s.routes[routeKey]
			s.mu.RUnlock()

			if !exists || len(route.Nodes) == 0 {
				http.Error(w, "Service not found or no healthy nodes available on Ingress Gateway", http.StatusNotFound)
				return
			}
			
			// Find a healthy node (filter out those in the Penalty Box)
			var healthyNodes []*CachedNode
			s.mu.RLock()
			for _, n := range route.Nodes {
				if penalty, penalized := s.penalties[n.ID]; penalized {
					if time.Now().Before(penalty) {
						continue 
					}
				}
				healthyNodes = append(healthyNodes, n)
			}
			s.mu.RUnlock()

			if len(healthyNodes) == 0 {
				http.Error(w, "All nodes for this service are currently unhealthy or penalized", http.StatusBadGateway)
				return
			}

			// Random selection for now (LoadBalancer Strategy pattern to be wired up)
			// var lb LoadBalancerRef = &PrefixLB{}
			// targetNode := lb.SelectNode(healthyNodes, key)
			// lb = &RoundRobinLB{} // Dynamic toggle example
			targetNode := healthyNodes[time.Now().UnixNano()%int64(len(healthyNodes))]

			proxy := httputil.NewSingleHostReverseProxy(targetNode.TargetURL)
			
			originalDirector := proxy.Director
			proxy.Director = func(req *http.Request) {
				originalDirector(req)
				req.Host = targetNode.TargetURL.Host 
				// Fix CORS/CSRF issues for strict apps (like n8n)
				if req.Header.Get("Origin") != "" {
					req.Header.Set("Origin", targetNode.TargetURL.Scheme+"://"+targetNode.TargetURL.Host)
				}
				// Trick apps into accepting secure cookies (LOOKFOR : controversial)
				req.Header.Set("X-Forwarded-Proto", "https")
			}
			
			proxy.ErrorHandler = func(w http.ResponseWriter, req *http.Request, proxyErr error) {
				log.Printf("[Ingress] Proxy error for generic container %s (Node: %s): %v\n", routeKey, targetNode.ID, proxyErr)
				
				if len(route.Nodes) > 1 {
					s.PenalizeNode(targetNode.ID)
				} else {
					log.Printf("[Ingress] ⚠️ Not penalizing Node %s because it is the only available replica for %s", targetNode.ID, routeKey)
				}
				
				http.Error(w, "Bad Gateway: Node failed to respond", http.StatusBadGateway)
			}
			
			proxy.ServeHTTP(w, r)
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
