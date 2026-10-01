package main

import (
	"context"
	"os/signal"
	"strings"
	"syscall"

	"orcn/core/logger"
	"orcn/services/node-agent/agent"
	"orcn/services/node-agent/config"
	"orcn/services/node-agent/engines/docker"
	"orcn/services/node-agent/events"
	restinterface "orcn/services/node-agent/interfaces/rest"
	"orcn/services/node-agent/reconcile/telemetry"
)

func main() {
	cfg := config.Load()
	logger.SetLevel(logLevel(cfg.LogLevel))
	log := logger.New("NODE-AGENT")

	// 1. Initialize Event System
	eventBuffer := events.NewBuffer(500)
	recorder := events.NewRecorder(eventBuffer, log)

	// 2. Initialize Container Engine (driver dependency)
	engine, err := docker.NewEngine(cfg, recorder)
	if err != nil {
		log.Fatal("Failed to initialize Docker Engine: %v", err)
	}
	defer engine.Close()

	// 3. Initialize Background Reconcilers
	var telemetryBuffer *telemetry.Buffer
	var telemetryReconciler *telemetry.Reconciler
	if cfg.TelemetryEnabled {
		telemetryReconciler = telemetry.New(cfg.TelemetryInterval, cfg.TelemetryBufferPoints)
		telemetryBuffer = telemetryReconciler.Buffer()
	}

	// 4. Initialize Network Interfaces (Admin Control Plane & Proxy Router)
	adminServer, proxyServer := restinterface.InitServers(cfg, engine, eventBuffer, telemetryBuffer)

	// 5. Register Components into Orchestrator
	nodeAgent := agent.New()
	if telemetryReconciler != nil {
		nodeAgent.Register(telemetryReconciler)
	}
	nodeAgent.Register(adminServer)
	nodeAgent.Register(proxyServer)

	// 6. Boot Node Agent with Signal Handling
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	log.Info("Booting node-agent components...")
	if err := nodeAgent.Start(ctx); err != nil {
		log.Fatal("Agent crashed: %v", err)
	}
}

func logLevel(value string) logger.LogLevel {
	switch strings.ToLower(value) {
	case "debug":
		return logger.LevelDebug
	case "warn", "warning":
		return logger.LevelWarn
	case "error":
		return logger.LevelError
	case "none", "off":
		return logger.LevelNone
	default:
		return logger.LevelInfo
	}
}
