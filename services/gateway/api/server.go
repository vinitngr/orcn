package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"orcn/services/gateway/health"
	"orcn/models"

	"gorm.io/gorm"
)

type Server struct {
	DB     *gorm.DB
	Health *health.Checker
	mux    *http.ServeMux
}

func New(db *gorm.DB, hc *health.Checker) *Server {
	s := &Server{
		DB:     db,
		Health: hc,
		mux:    http.NewServeMux(),
	}
	s.registerRoutes()
	return s
}

func (s *Server) Handler() http.Handler {
	return s.withSubdomainProxy(withLogging(withCORS(s.mux)))
}

func (s *Server) withSubdomainProxy(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := r.Host
		if strings.Contains(host, ":") {
			host = strings.Split(host, ":")[0]
		}
		
		if host == "localhost" || host == "127.0.0.1" {
			next.ServeHTTP(w, r)
			return
		}

		// Extract the subdomain (e.g., test-container.localhost)
		subdomain := strings.TrimSuffix(host, ".localhost")

		var dep models.Deployment
		if err := s.DB.Preload("Nodes").Where("name = ? AND status IN ?", subdomain, []string{models.DeploymentReady, models.DeploymentRunning}).First(&dep).Error; err != nil {
			next.ServeHTTP(w, r)
			return
		}

		// Find a healthy node with an endpoint
		var targetURL *url.URL
		for _, node := range dep.Nodes {
			if node.NodeURL != "" {
				parsed, err := url.Parse(node.NodeURL)
				if err == nil {
					targetURL = parsed
					break
				}
			}
			if node.EndpointsJSON != "" {
				var eps []map[string]interface{}
				if err := json.Unmarshal([]byte(node.EndpointsJSON), &eps); err == nil && len(eps) > 0 {
					baseUrl := ""
					if b, ok := eps[0]["base_url"].(string); ok { baseUrl = b }
					
					// Fix: Don't prepend proto:// if baseUrl already has it
					if !strings.HasPrefix(baseUrl, "http") {
						proto := "http"
						if p, ok := eps[0]["protocol"].(string); ok && p != "" { proto = p }
						baseUrl = fmt.Sprintf("%s://%s", proto, baseUrl)
					}
					
					parsed, err := url.Parse(baseUrl)
					if err == nil {
						targetURL = parsed
						break
					}
				}
			}
		}

		if targetURL == nil {
			http.Error(w, "No active endpoints found for this workload", http.StatusBadGateway)
			return
		}

		proxy := httputil.NewSingleHostReverseProxy(targetURL)
		
		// The original Director sets req.URL but leaves req.Host untouched.
		// Cloudflare/Kubernetes Ingress controllers will throw a 502 Bad Gateway 
		// if req.Host is still "webui.localhost:8080". We MUST overwrite it.
		originalDirector := proxy.Director
		proxy.Director = func(req *http.Request) {
			originalDirector(req)
			// Required for Kubernetes Ingress on the rented node to route correctly
			req.Host = targetURL.Host 
			
			// Fix CORS/CSRF issues for strict apps (like n8n)
			// Rewrite the Origin header to match the target host so the app doesn't block it
			if req.Header.Get("Origin") != "" {
				req.Header.Set("Origin", targetURL.Scheme+"://"+targetURL.Host)
			}
			
			// Trick apps into accepting secure cookies over local HTTP
			req.Header.Set("X-Forwarded-Proto", "https")
		}
		
		// Set headers for the backend workload to know where traffic originated
		r.Header.Set("X-Forwarded-Host", host)

		proxy.ServeHTTP(w, r)
	})
}

func (s *Server) registerRoutes() {
	s.mux.HandleFunc("GET /api/v1/models/search", s.handleSearchModels)
	s.mux.HandleFunc("GET /api/v1/models/details", s.handleGetModelDetails)

	s.mux.HandleFunc("GET /api/v1/markets", s.handleGetMarkets)

	s.mux.HandleFunc("GET /api/v1/runtimes/schema", s.handleGetRuntimeSchema)

	s.mux.HandleFunc("POST /api/v1/deployments", s.handleCreateDeployment)
	s.mux.HandleFunc("GET /api/v1/deployments", s.handleListDeployments)
	s.mux.HandleFunc("GET /api/v1/deployments/{id}", s.handleGetDeployment)
	s.mux.HandleFunc("POST /api/v1/deployments/{id}/action", s.handleDeploymentAction)
	
	s.mux.HandleFunc("POST /api/v1/workloads", s.handleCreateWorkload)
	// Secrets
	s.mux.HandleFunc("GET /api/v1/secrets", s.handleListSecrets)
	s.mux.HandleFunc("POST /api/v1/secrets", s.handleCreateSecret)
	s.mux.HandleFunc("DELETE /api/v1/secrets/{name}", s.handleDeleteSecret)

	// Registries
	s.mux.HandleFunc("GET /api/v1/registries", s.handleListRegistries)
	s.mux.HandleFunc("POST /api/v1/registries", s.handleCreateRegistry)

	// Templates
	s.mux.HandleFunc("GET /api/v1/templates", s.handleListTemplates)
	s.mux.HandleFunc("POST /api/v1/templates", s.handleCreateTemplate)
	s.mux.HandleFunc("GET /api/v1/templates/{id}", s.handleGetTemplate)
	s.mux.HandleFunc("PUT /api/v1/templates/{id}", s.handleUpdateTemplate)
	s.mux.HandleFunc("DELETE /api/v1/templates/{id}", s.handleDeleteTemplate)

	s.mux.HandleFunc("GET /api/v1/endpoints", s.handleListEndpoints)
	
	// Internal microservice endpoints
	s.mux.HandleFunc("GET /api/v1/internal/routes", s.handleGetInternalRoutes)
}

func respondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
	// byte , _ := json.Marshal(data)
	// w.Write(byte)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}
