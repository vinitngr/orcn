package ingress

import (
	"net/http"
	"strings"

	"gorm.io/gorm"
)

type Server struct {
	DB *gorm.DB
}

func New(db *gorm.DB) *Server {
	return &Server{DB: db}
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
