package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os/signal"
	"strings"
	"syscall"

	corelogger "orcn/core/logger"
	"orcn/services/node-agent/config"
	"orcn/services/node-agent/docker"
	"orcn/services/node-agent/events"
	"orcn/services/node-agent/proxy"
)

func main() {
	cfg := config.Load()
	corelogger.SetLevel(logLevel(cfg.LogLevel))

	terminalLogger := corelogger.New("NODE-AGENT")
	eventBuffer := events.NewBuffer(500)

	recorder := events.NewRecorder(eventBuffer, terminalLogger)
	engine, err := docker.NewEngine(cfg, recorder)
	if err != nil {
		log.Fatal(err)
	}
	defer engine.Close()

	routes := proxy.NewRouteTable()
	state := proxy.NewRegistrationState()

	adminServer := &http.Server{Addr: cfg.AdminAddress, Handler: proxy.NewAdminServer(engine, routes, state, eventBuffer, cfg.AdminToken, cfg.RegistrationAPIKey).Handler()}
	proxyServer := &http.Server{Addr: cfg.ProxyAddress, Handler: proxy.NewRouter(routes, state, cfg.ProxyTargetHost).Handler()}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		if err := adminServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("node-agent admin server: %v", err)
		}
	}()
	go func() {
		if err := proxyServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("node-agent proxy server: %v", err)
		}
	}()
	<-ctx.Done()
	_ = adminServer.Shutdown(context.Background())
	_ = proxyServer.Shutdown(context.Background())
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
