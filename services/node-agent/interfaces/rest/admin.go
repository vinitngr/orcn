package rest

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"orcn/core"
	"orcn/services/node-agent/agent"
	"orcn/services/node-agent/engines/docker"
	"orcn/services/node-agent/events"
)

type AdminServer struct {
	engine          agent.Engine
	routes          *RouteTable
	state           *RegistrationState
	token           string
	registrationKey string
	eventBuffer     *events.Buffer
}

func NewAdminServer(engine agent.Engine, routes *RouteTable, state *RegistrationState, eventBuffer *events.Buffer, token, registrationKey string) *AdminServer {
	return &AdminServer{engine: engine, routes: routes, state: state, eventBuffer: eventBuffer, token: token, registrationKey: registrationKey}
}

func (s *AdminServer) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)
	mux.HandleFunc("POST /register", s.register)
	mux.HandleFunc("GET /events", s.events)
	mux.HandleFunc("POST /containers", s.run)
	mux.HandleFunc("POST /containers/{id}/restart", s.restart)
	mux.HandleFunc("POST /containers/{id}/start", s.start)
	mux.HandleFunc("POST /containers/{id}/stop", s.stop)
	mux.HandleFunc("DELETE /containers/{id}", s.remove)
	mux.HandleFunc("GET /containers/{id}/logs", s.logs)
	return s.auth(mux)
}

func (s *AdminServer) requireRegistered(w http.ResponseWriter) bool {
	if err := s.state.RequireRegistered(); err != nil {
		writeError(w, http.StatusForbidden, err.Error())
		return false
	}
	return true
}

func (s *AdminServer) register(w http.ResponseWriter, r *http.Request) {
	if s.registrationKey == "" || r.Header.Get("X-Registration-Key") != s.registrationKey {
		writeError(w, http.StatusUnauthorized, "valid registration API key required")
		return
	}
	var job core.JobSpec
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<20)).Decode(&job); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if valid, validationErrors := core.ValidateJobSpec(&job); !valid {
		writeError(w, http.StatusBadRequest, strings.Join(validationErrors, "; "))
		return
	}
	if _, registered := s.state.Job(); registered {
		writeError(w, http.StatusConflict, "agent is already registered")
		return
	}
	if err := s.engine.ValidateJob(r.Context(), job); err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	type preparedContainer struct {
		id         string
		created    bool
		wasRunning bool
	}
	prepared := make([]preparedContainer, 0, len(job.Containers))
	cleanup := func() {
		for _, container := range prepared {
			if container.created || !container.wasRunning {
				if inspected, err := s.engine.Inspect(context.Background(), container.id); err == nil {
					if inspected.State != nil && inspected.State.Running {
						_ = s.engine.Stop(context.Background(), container.id)
					}
				}
				_ = s.engine.Remove(context.Background(), container.id)
			}
			s.routes.Delete(container.id)
		}
	}
	for _, container := range job.Containers {
		spec := docker.ContainerConfigFromJobWithVolumes(container, job.Volumes)
		existing, inspectErr := s.engine.Inspect(r.Context(), spec.ID)
		wasRunning := inspectErr == nil && existing.State != nil && existing.State.Running
		id, created, err := s.engine.EnsureStopped(r.Context(), spec, false)
		if err != nil {
			cleanup()
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		prepared = append(prepared, preparedContainer{id: id, created: created, wasRunning: wasRunning})
		s.routes.Set(spec)
	}
	for index := range prepared {
		if err := s.engine.Start(r.Context(), prepared[index].id); err != nil {
			cleanup()
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
	}
	if err := s.state.Register(job); err != nil {
		cleanup()
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "registered", "node_id": job.NodeID, "containers": len(job.Containers)})
}

func (s *AdminServer) events(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("live") != "true" {
		writeJSON(w, http.StatusOK, s.eventBuffer.Snapshot())
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "live events are not supported by this server")
		return
	}
	for _, event := range s.eventBuffer.Snapshot() {
		writeSSE(w, event)
	}
	flusher.Flush()
	stream, unsubscribe := s.eventBuffer.Subscribe()
	defer unsubscribe()
	for {
		select {
		case <-r.Context().Done():
			return
		case event, ok := <-stream:
			if !ok {
				return
			}
			writeSSE(w, event)
			flusher.Flush()
		}
	}
}

func (s *AdminServer) auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.token != "" && r.Header.Get("Authorization") != "Bearer "+s.token {
			writeError(w, http.StatusUnauthorized, "admin authorization required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *AdminServer) health(w http.ResponseWriter, r *http.Request) {
	if !s.requireRegistered(w) {
		return
	}
	if err := s.engine.Ping(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "server": "admin"})
}

func (s *AdminServer) run(w http.ResponseWriter, r *http.Request) {
	if !s.requireRegistered(w) {
		return
	}
	var request struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	spec, allowed := s.state.Spec(request.ID)
	if !allowed {
		writeError(w, http.StatusForbidden, "container is not in the registered job spec")
		return
	}
	force, _ := strconv.ParseBool(r.URL.Query().Get("force"))
	id, created, err := s.engine.Ensure(r.Context(), spec, force)

	if err != nil {
		status := http.StatusBadRequest
		if strings.Contains(err.Error(), "exists but does not match") {
			status = http.StatusConflict
		}
		writeError(w, status, err.Error())
		return
	}
	s.routes.Set(spec)
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "created": created})
}

func (s *AdminServer) restart(w http.ResponseWriter, r *http.Request) {
	s.action(w, r, s.engine.Restart)
}

func (s *AdminServer) start(w http.ResponseWriter, r *http.Request) {
	if !s.requireRegistered(w) {
		return
	}
	id := r.PathValue("id")
	if !s.state.Allows(id) {
		writeError(w, http.StatusForbidden, "container is not in the registered job spec")
		return
	}
	if _, err := s.engine.Inspect(r.Context(), id); err != nil {
		writeError(w, http.StatusNotFound, "container does not exist")
		return
	}
	if err := s.engine.Start(r.Context(), id); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "started", "id": id})
}

func (s *AdminServer) stop(w http.ResponseWriter, r *http.Request) {
	s.action(w, r, s.engine.Stop)
}

func (s *AdminServer) remove(w http.ResponseWriter, r *http.Request) {
	if !s.requireRegistered(w) {
		return
	}
	if !s.state.Allows(r.PathValue("id")) {
		writeError(w, http.StatusForbidden, "container is not in the registered job spec")
		return
	}
	id := r.PathValue("id")
	container, err := s.engine.Inspect(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "container does not exist")
		return
	}
	if container.State != nil && container.State.Running {
		writeError(w, http.StatusConflict, "container is running; stop it before removing")
		return
	}
	if err := s.engine.Remove(r.Context(), id); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	s.routes.Delete(id)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *AdminServer) action(w http.ResponseWriter, r *http.Request, action func(context.Context, string) error) {
	if !s.requireRegistered(w) {
		return
	}
	id := r.PathValue("id")
	if !s.state.Allows(id) {
		writeError(w, http.StatusForbidden, "container is not in the registered job spec")
		return
	}
	container, err := s.engine.Inspect(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "container does not exist")
		return
	}
	if r.URL.Path != "/containers/"+id+"/restart" && container.State != nil && !container.State.Running {
		writeError(w, http.StatusConflict, "container is not running")
		return
	}
	if err := action(r.Context(), id); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *AdminServer) logs(w http.ResponseWriter, r *http.Request) {
	if !s.requireRegistered(w) {
		return
	}
	if !s.state.Allows(r.PathValue("id")) {
		writeError(w, http.StatusForbidden, "container is not in the registered job spec")
		return
	}
	if _, err := s.engine.Inspect(r.Context(), r.PathValue("id")); err != nil {
		writeError(w, http.StatusNotFound, "container does not exist")
		return
	}
	live, _ := strconv.ParseBool(r.URL.Query().Get("live"))
	tail, _ := strconv.Atoi(r.URL.Query().Get("tail"))
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	if live {
		w.Header().Set("Connection", "keep-alive")
	}
	if flusher, ok := w.(http.Flusher); ok {
		flusher.Flush()
	}
	if err := s.engine.Logs(r.Context(), r.PathValue("id"), live, tail, flushWriter{ResponseWriter: w}); err != nil {
		return
	}
}

type flushWriter struct{ http.ResponseWriter }

func (w flushWriter) Write(data []byte) (int, error) {
	n, err := w.ResponseWriter.Write(data)
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
	return n, err
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeSSE(w http.ResponseWriter, event events.Event) {
	payload, err := json.Marshal(event)
	if err != nil {
		return
	}
	_, _ = w.Write([]byte("data: " + string(payload) + "\n\n"))
}
