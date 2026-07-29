package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"orcn/core"
	"orcn/models"
	"orcn/providers/nosana"
	"orcn/runtimes/vllm"
	"orcn/services/gateway/api"
	"orcn/services/gateway/health"
	"orcn/services/gateway/ingress"
)

func main() {
	log.Println("Starting orcn Gateway...")

	// 1. Initialize DB
	db, err := models.InitDB("orcn.db")
	if err != nil {
		log.Fatalf("Failed to init database: %v", err)
	}
	log.Println("Database initialized successfully.")

	// 2. Register Plugins
	apiKey := getNosanaAPIKey()

	nosClient := nosana.New(apiKey)
	core.RegisterProvider("nosana", nosClient)

	vllmRT := vllm.New()
	core.RegisterRuntime("vllm", vllmRT)

	log.Println("Plugins registered successfully.")

	// 3. Create shared services
	healthChecker := health.New(db)

	// 4. Start the Admin API Server (Control Plane) — Port 8080
	apiServer := api.New(db, healthChecker)
	go func() {
		log.Println("Admin API listening on :8080")
		if err := http.ListenAndServe(":8080", apiServer.Handler()); err != nil {
			log.Fatalf("API Server failed: %v", err)
		}
	}()

	// 5. Start the Public AI Ingress (Data Plane) — Port 80
	ingressServer := ingress.New(db)
	log.Println("Public AI Ingress listening on :80")
	if err := http.ListenAndServe(":80", ingressServer.Handler()); err != nil {
		log.Fatalf("Ingress Server failed (did you forget sudo?): %v", err)
	}
}

func getNosanaAPIKey() string {
	b, err := os.ReadFile(".env")
	if err != nil {
		return ""
	}
	for _, line := range strings.Split(string(b), "\n") {
		if strings.HasPrefix(line, "NOSANA_API_KEY=") {
			return strings.TrimSpace(strings.TrimPrefix(line, "NOSANA_API_KEY="))
		}
	}
	return ""
}
