package api

import (
	"net/http"

	"orcn/pkg/resourcetype"
)

func (s *Server) handleListResourceProviders(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, resourcetype.Providers)
}
