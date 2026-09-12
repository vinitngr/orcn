package main

import (
	"context"
	"log"
	"os/signal"
	"strings"
	"syscall"

	"orcn/core/logger"
	"orcn/services/node-agent/agent"
	"orcn/services/node-agent/config"
	"orcn/services/node-agent/engines/docker"
	"orcn/services/node-agent/events"
	restinterface "orcn/services/node-agent/interfaces/rest"
)

func main() {
	cfg := config.Load()
	logger.SetLevel(logLevel(cfg.LogLevel))
	terminalLogger := logger.New("NODE-AGENT")

	// initialize Event System
	eventBuffer := events.NewBuffer(500)
	recorder := events.NewRecorder(eventBuffer, terminalLogger)

	// initialized container Engine
	var Engine agent.Engine
	var err error
	Engine, err = docker.NewEngine(cfg, recorder)
	if err != nil {
		log.Fatalf("Failed to initialize Docker Engine: %v", err)
	}
	defer Engine.Close()

	// initialize node agent
	nodeAgent := agent.New()

	// initialized and register interface
	restPlugin := restinterface.NewServer(cfg, Engine, eventBuffer)
	nodeAgent.Register(restPlugin)

	// boot node agent
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := nodeAgent.Start(ctx); err != nil {
		log.Fatalf("Agent crashed: %v", err)
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
