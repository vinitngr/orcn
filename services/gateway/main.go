package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"orcn/core"
	"orcn/core/config"
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
	log.Println("Starting orcn Gateway...")

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	log.Printf("Loaded Config: Domain=%s, APIPort=%d, IngressPort=%d", cfg.AppDomain, cfg.APIPort, cfg.IngressPort)

	// 1. Initialize DB
	db, err := models.InitDB(cfg.DatabaseDSN)
	if err != nil {
		log.Fatalf("Failed to init database: %v", err)
	}
	log.Println("Database initialized successfully.")

	// 2. Register Plugins
	apiKey := os.Getenv("NOSANA_API_KEY")

	nosClient := nosana.New(apiKey)
	core.RegisterProvider("nosana", nosClient)

	vllmRT := vllm.New()
	core.RegisterRuntime("vllm", vllmRT)

	ollamaRT := ollama.New()
	core.RegisterRuntime("ollama", ollamaRT)

	log.Println("Plugins registered successfully.")

	// 3. Create shared services
	healthChecker := health.New(db)
	
	// 4. Start Background Controller Loop (Control Plane)
	ctrl := controller.New(db)
	ctrl.StartLoop()

	// 5. Start the Admin API Server (Control Plane)
	apiServer := api.New(db, healthChecker, cfg)
	go func() {
		log.Printf("Admin API listening on :%d\n", cfg.APIPort)
		if err := http.ListenAndServe(fmt.Sprintf(":%d", cfg.APIPort), apiServer.Handler()); err != nil {
			log.Fatalf("API Server failed: %v", err)
		}
	}()

	internalAPI := fmt.Sprintf("http://127.0.0.1:%d/api/v1/internal/routes", cfg.APIPort)
	ingressServer := ingress.New(internalAPI, cfg)

	log.Printf("Public AI Ingress listening on :%d\n", cfg.IngressPort)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", cfg.IngressPort), ingressServer.Handler()); err != nil {
		log.Fatalf("Ingress Server failed (did you forget sudo?): %v", err)
	}
}


