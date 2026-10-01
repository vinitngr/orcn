package rest

import (
	"orcn/services/node-agent/agent"
	"orcn/services/node-agent/capabilities"
	"orcn/services/node-agent/config"
	"orcn/services/node-agent/events"
	"orcn/services/node-agent/reconcile/telemetry"
)

func InitServers(cfg config.Config, engine agent.Engine, eventBuffer *events.Buffer, telemetryBuffer *telemetry.Buffer) (*AdminServer, *ProxyServer) {
	routes := NewRouteTable()
	state := NewRegistrationState(cfg.AgentMode, cfg.MaxWorkloadCount)

	adminServer := NewAdminServer(
		cfg.AdminAddress,
		engine,
		routes,
		state,
		eventBuffer,
		capabilities.New(engine.Ping),
		telemetryBuffer,
		cfg.AdminToken,
		cfg.RegistrationAPIKey,
	)

	proxyServer := NewProxyServer(
		cfg.ProxyAddress,
		routes,
		state,
		engine,
		cfg.ProxyTargetHost,
	)

	return adminServer, proxyServer
}
