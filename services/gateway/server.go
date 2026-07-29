package main

import (
	"encoding/json"
	"net/http"

	"gorm.io/gorm"
)

type Server struct {
	DB       *gorm.DB
	Mux      *http.ServeMux
}

func NewServer(db *gorm.DB) *Server {
	s := &Server{
		DB:       db,
		Mux:      http.NewServeMux(),
	}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.Mux.HandleFunc("GET /api/v1/models/search", s.handleSearchModels)
	s.Mux.HandleFunc("GET /api/v1/models/details", s.handleGetModelDetails)
	s.Mux.HandleFunc("GET /api/v1/markets", s.handleGetMarkets)
	s.Mux.HandleFunc("POST /api/v1/deployments", s.handleCreateDeployment)
	s.Mux.HandleFunc("GET /api/v1/deployments", s.handleListDeployments)
	s.Mux.HandleFunc("GET /api/v1/deployments/{id}", s.handleGetDeployment)
	s.Mux.HandleFunc("POST /api/v1/deployments/{id}/action", s.handleDeploymentAction)
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}
