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

	// 3. Start HTTP Server
	server := NewServer(db)
	port := "8080"
	
	log.Printf("Gateway listening on :%s\n", port)
	if err := http.ListenAndServe(":"+port, server.Mux); err != nil {
		log.Fatalf("Server failed: %v", err)
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
