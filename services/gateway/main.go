package main

import (
	"fmt"
	"net/http"

	"orcn/core"
	"orcn/core/config"
	"orcn/core/logger"
	"orcn/models"
	"orcn/providers/nosana"
	"orcn/runtimes/ollama"
	"orcn/runtimes/vllm"
	"orcn/services/controller"
	"orcn/services/gateway/api"
	"orcn/services/gateway/health"
	"orcn/services/gateway/ingress"
)

func main() {
	log := logger.New("GATEWAY")
	log.Info("Starting orcn Gateway...")

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load config: %v", err)
	}
	log.Info("Loaded Config: Domain=%s, APIPort=%d, IngressPort=%d", cfg.AppDomain, cfg.APIPort, cfg.IngressPort)

	// 1. Initialize DB
	db, err := models.InitDB(cfg.DatabaseDSN)
	if err != nil {
		log.Fatal("Failed to init database: %v", err)
	}
	log.Info("Database initialized successfully.")

	// 2. Register Plugins
	nosClient := nosana.New(cfg.NosanaAPIKey, cfg.NosanaURL)
	core.RegisterProvider("nosana", nosClient)

	vllmRT := vllm.New()
	core.RegisterRuntime("vllm", vllmRT)

	ollamaRT := ollama.New()
	core.RegisterRuntime("ollama", ollamaRT)

	log.Info("Plugins registered successfully.")

	// 3. Create shared services
	healthChecker := health.New(db)
	
	// 4. Start Background Controller Loop (Control Plane)
	ctrl := controller.New(db)
	ctrl.StartLoop()

	// 5. Start the Admin API Server (Control Plane)
	apiServer := api.New(db, healthChecker, cfg)
	go func() {
		log.Info("Admin API listening on :%d", cfg.APIPort)
		if err := http.ListenAndServe(fmt.Sprintf(":%d", cfg.APIPort), apiServer.Handler()); err != nil {
			log.Fatal("API Server failed: %v", err)
		}
	}()

	internalAPI := fmt.Sprintf("http://127.0.0.1:%d/api/v1/internal/routes", cfg.APIPort)
	ingressServer := ingress.New(internalAPI, cfg)

	log.Info("Public AI Ingress listening on :%d", cfg.IngressPort)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", cfg.IngressPort), ingressServer.Handler()); err != nil {
		log.Fatal("Ingress Server failed (did you forget sudo?): %v", err)
	}
}


