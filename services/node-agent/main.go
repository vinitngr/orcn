package main

import (
	"context"
	"log"
	"os/signal"
	"strings"
	"syscall"

	corelogger "orcn/core/logger"
	"orcn/services/node-agent/agent"
	"orcn/services/node-agent/config"
	"orcn/services/node-agent/engines/docker"
	"orcn/services/node-agent/events"
	restinterface "orcn/services/node-agent/interfaces/rest"
)

func main() {
	cfg := config.Load()
	corelogger.SetLevel(logLevel(cfg.LogLevel))
	terminalLogger := corelogger.New("NODE-AGENT")

	// initialize Event System
	eventBuffer := events.NewBuffer(500)
	recorder := events.NewRecorder(eventBuffer, terminalLogger)

	// initialized container Engine
	var containerEngine agent.Engine
	var err error
	containerEngine, err = docker.NewEngine(cfg, recorder)
	if err != nil {
		log.Fatalf("Failed to initialize Docker Engine: %v", err)
	}
	defer containerEngine.Close()

	// initialize node agent
	nodeAgent := agent.New()

	// initialized and register interface
	restPlugin := restinterface.NewServer(cfg, containerEngine, eventBuffer)
	nodeAgent.Register(restPlugin)

	// boot node agent
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := nodeAgent.Start(ctx); err != nil {
		log.Fatalf("Agent crashed: %v", err)
	}
}

func logLevel(value string) corelogger.LogLevel {
	switch strings.ToLower(value) {
	case "debug":
		return corelogger.LevelDebug
	case "warn", "warning":
		return corelogger.LevelWarn
	case "error":
		return corelogger.LevelError
	case "none", "off":
		return corelogger.LevelNone
	default:
		return corelogger.LevelInfo
	}
}
