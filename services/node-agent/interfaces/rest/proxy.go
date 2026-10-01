package rest

import (
	"context"
	"errors"
	"net/http"

	"orcn/core/logger"
	"orcn/services/node-agent/agent"
)

// ProxyServer handles public traffic routing to containers.
// It implements agent.Component.
type ProxyServer struct {
	addr   string
	router *Router
	server *http.Server
	logger *logger.Logger
}

func NewProxyServer(addr string, routes *RouteTable, state *RegistrationState, engine agent.Engine, targetHost string) *ProxyServer {
	return &ProxyServer{
		addr:   addr,
		router: NewRouter(routes, state, engine, targetHost),
		logger: logger.New("PROXY"),
	}
}

func (p *ProxyServer) Name() string {
	return "Proxy_Server"
}

func (p *ProxyServer) Handler() http.Handler {
	return p.router.Handler()
}

func (p *ProxyServer) Start(ctx context.Context) error {
	p.server = &http.Server{
		Addr:    p.addr,
		Handler: p.router.Handler(),
	}

	go func() {
		p.logger.Info("Listening on %s", p.addr)
		if err := p.server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			p.logger.Error("Server error: %v", err)
		}
	}()

	return nil
}

func (p *ProxyServer) Stop(ctx context.Context) error {
	p.logger.Info("Shutting down proxy server...")
	if p.server != nil {
		return p.server.Shutdown(ctx)
	}
	return nil
}
