package main

import (
	"context"
	"encoding/json"
	"log"
	"os"

	"orcn/services/node-agent/resources"
)

func main() {
	planPath := os.Getenv("ORCN_RESOURCE_PLAN")
	if planPath == "" {
		planPath = "/run/resource-plan.json"
	}
	data, err := os.ReadFile(planPath)
	if err != nil {
		log.Fatalf("read resource plan: %v", err)
	}
	var plan resources.Plan
	if err := json.Unmarshal(data, &plan); err != nil {
		log.Fatalf("parse resource plan: %v", err)
	}
	if plan.Version == 0 {
		plan.Version = 1
	}
	registry := newInstallerRegistry()
	if err := registry.Register("http", installHTTP); err != nil {
		log.Fatalf("register HTTP resource installer: %v", err)
	}
	if err := registry.Register("https", installHTTP); err != nil {
		log.Fatalf("register HTTPS resource installer: %v", err)
	}

	//TODO : parallelize resource installation
	for _, resource := range plan.Resources {
		id := resource.ID
		if id == "" {
			id = resource.Type
		}
		log.Printf("resource installing id=%s type=%s destination=%s", id, resource.Type, resource.Destination)
		progress := func(done, total int64) {
			if total > 0 {
				log.Printf("resource progress id=%s downloaded_bytes=%d total_bytes=%d percentage=%.2f", id, done, total, float64(done)*100/float64(total))
				return
			}
			log.Printf("resource progress id=%s downloaded_bytes=%d", id, done)
		}
		err = registry.Install(context.Background(), resource, progress)
		if err != nil {
			log.Printf("resource failed id=%s error=%v", id, err)
			os.Exit(1)
		}
		log.Printf("resource installed id=%s", id)
	}
}
