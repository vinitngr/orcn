package rest

import (
	"context"
	"errors"
	"log"
	"net/http"

	"orcn/services/node-agent/agent"
	"orcn/services/node-agent/capabilities"
	"orcn/services/node-agent/config"
	"orcn/services/node-agent/events"
)

type Plugin struct {
	adminServer *http.Server
	proxyServer *http.Server
}

// NewServer initializes the HTTP Plugin that wraps Admin and Proxy servers.
func NewServer(cfg config.Config, engine agent.Engine, eventBuffer *events.Buffer) *Plugin {
	routes := NewRouteTable()
	state := NewRegistrationState(cfg.AgentMode, cfg.MaxWorkloadCount)

	adminHandler := NewAdminServer(engine, routes, state, eventBuffer, capabilities.New(engine.Ping), cfg.AdminToken, cfg.RegistrationAPIKey).Handler()
	proxyHandler := NewRouter(routes, state, engine, cfg.ProxyTargetHost).Handler()

	return &Plugin{
		adminServer: &http.Server{Addr: cfg.AdminAddress, Handler: adminHandler},
		proxyServer: &http.Server{Addr: cfg.ProxyAddress, Handler: proxyHandler},
	}
}

func (p *Plugin) Name() string {
	return "HTTP_Interface"
}

// Start boots the HTTP servers.
func (p *Plugin) Start(ctx context.Context) error {
	go func() {
		log.Printf("[HTTP] Admin server listening on %s", p.adminServer.Addr)
		if err := p.adminServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("[HTTP] Admin server error: %v", err)
		}
	}()

	go func() {
		log.Printf("[HTTP] Proxy server listening on %s", p.proxyServer.Addr)
		if err := p.proxyServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("[HTTP] Proxy server error: %v", err)
		}
	}()

	return nil
}

func (p *Plugin) Stop(ctx context.Context) error {
	var errs []error
	if err := p.adminServer.Shutdown(ctx); err != nil {
		errs = append(errs, err)
	}
	if err := p.proxyServer.Shutdown(ctx); err != nil {
		errs = append(errs, err)
	}

	if len(errs) > 0 {
		return errors.Join(errs...)
	}
	return nil
}
