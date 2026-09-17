package rest

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"sync"

	"orcn/services/node-agent/agent"
	"orcn/services/node-agent/engines/docker"
)

type route struct{ ports map[int]int }

type RouteTable struct {
	mu     sync.RWMutex
	routes map[string]route
}

func NewRouteTable() *RouteTable {
	return &RouteTable{routes: make(map[string]route)}
}

func (t *RouteTable) Set(spec docker.ContainerConfig) {
	if len(spec.Ports) == 0 {
		return
	}
	ports := make(map[int]int, len(spec.Ports))
	for _, port := range spec.Ports {
		if port.Public {
			ports[port.Container] = port.Host
		}
	}
	if len(ports) == 0 {
		return
	}
	t.mu.Lock()
	t.routes[spec.ID] = route{ports: ports}
	t.mu.Unlock()
}

func (t *RouteTable) Delete(id string) {
	t.mu.Lock()
	delete(t.routes, id)
	t.mu.Unlock()
}

func (t *RouteTable) Get(id string) (route, bool) {
	t.mu.RLock()
	value, ok := t.routes[id]
	t.mu.RUnlock()
	return value, ok
}

type Router struct {
	routes     *RouteTable
	state      *RegistrationState
	engine     agent.Engine
	targetHost string
}

func NewRouter(routes *RouteTable, state *RegistrationState, engine agent.Engine, targetHost string) *Router {
	return &Router{routes: routes, state: state, engine: engine, targetHost: targetHost}
}

func (p *Router) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		if err := p.state.RequireRegistered(); err != nil {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "server": "proxy"})
	})
	mux.HandleFunc("/", p.forward)
	return mux
}

func (p *Router) forward(w http.ResponseWriter, r *http.Request) {
	if err := p.state.RequireRegistered(); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	id := r.Header.Get("X-Orcn-Container")
	if id == "" {
		http.Error(w, "X-Orcn-Container header is required", http.StatusBadRequest)
		return
	}
	if !p.state.Allows(id) {
		http.Error(w, "container is not in the registered job spec", http.StatusForbidden)
		return
	}
	configured, ok := p.routes.Get(id)
	if !ok {
		http.Error(w, "container route not configured", http.StatusNotFound)
		return
	}

	requestedPort := 0
	if value := r.Header.Get("X-Orcn-Port"); value != "" {
		requestedPort, _ = strconv.Atoi(value)
	}
	containerPort, ok := configured.ports[requestedPort]
	if requestedPort == 0 && len(configured.ports) == 1 {
		for port := range configured.ports {
			containerPort = port
		}
		ok = true
	}
	if !ok {
		http.Error(w, "requested container port is not configured", http.StatusNotFound)
		return
	}

	targetHost := p.targetHost
	if targetHost == "" {
		inspection, inspectErr := p.engine.Inspect(r.Context(), id)
		if inspectErr != nil || inspection.NetworkSettings == nil {
			http.Error(w, "container network is unavailable", http.StatusBadGateway)
			return
		}
		for _, network := range inspection.NetworkSettings.Networks {
			if network.IPAddress != "" {
				targetHost = network.IPAddress
				break
			}
		}
		if targetHost == "" {
			http.Error(w, "container has no reachable network address", http.StatusBadGateway)
			return
		}
	}
	target, err := url.Parse("http://" + targetHost + ":" + strconv.Itoa(containerPort))
	if err != nil {
		http.Error(w, "invalid route", http.StatusInternalServerError)
		return
	}
	reverseProxy := httputil.NewSingleHostReverseProxy(target)
	reverseProxy.ErrorHandler = func(writer http.ResponseWriter, _ *http.Request, proxyErr error) {
		http.Error(writer, fmt.Sprintf("proxy request failed: %v", proxyErr), http.StatusBadGateway)
	}
	reverseProxy.Director = func(req *http.Request) {
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		req.Host = target.Host
		req.Header.Del("X-Orcn-Container")
		req.Header.Del("X-Orcn-Port")
	}
	reverseProxy.ServeHTTP(w, r)
}
