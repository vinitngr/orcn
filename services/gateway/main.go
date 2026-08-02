package main

import (
	"log"
	"net/http"
	"os"
	"strings"

	"orcn/core"
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

	ollamaRT := ollama.New()
	core.RegisterRuntime("ollama", ollamaRT)

	log.Println("Plugins registered successfully.")

	// 3. Create shared services
	healthChecker := health.New(db)
	
	// 4. Start Background Controller Loop (Control Plane)
	ctrl := controller.New(db)
	ctrl.StartLoop()

	// 5. Start the Admin API Server (Control Plane) — Port 8080
	apiServer := api.New(db, healthChecker)
	go func() {
		log.Println("Admin API listening on :8080")
		if err := http.ListenAndServe(":8080", apiServer.Handler()); err != nil {
			log.Fatalf("API Server failed: %v", err)
		}
	}()

	ingressServer := ingress.New("http://127.0.0.1:8080/api/v1/internal/routes")

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
