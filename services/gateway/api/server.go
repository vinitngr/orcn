package api

import (
	"encoding/json"
	"net/http"

	"orcn/services/gateway/health"

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
	return withLogging(withCORS(s.mux))
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
