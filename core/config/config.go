package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	AppDomain    string
	APIPort      int
	IngressPort  int
	DatabaseDSN  string
	AgentBaseURL string

	// Gateway Tuning
	MaxConnsPerHost   int
	MaxActiveRequests int
}

func LoadConfig() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		AppDomain:    getEnv("APP_DOMAIN", "localhost"),
		APIPort:      getEnvAsInt("API_PORT", 8080),
		IngressPort:  getEnvAsInt("INGRESS_PORT", 80),
		DatabaseDSN:  getEnv("DATABASE_DSN", "orcn.db"),
		AgentBaseURL: getEnv("AGENT_BASE_URL", "http://127.0.0.1:4000"),
		
		MaxConnsPerHost:   getEnvAsInt("GATEWAY_MAX_CONNS_PER_HOST", 20),
		MaxActiveRequests: getEnvAsInt("GATEWAY_MAX_ACTIVE_REQUESTS", 100),
	}

	return cfg, nil
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return strings.TrimSpace(value)
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intVal, err := strconv.Atoi(strings.TrimSpace(value)); err == nil {
			return intVal
		}
		fmt.Printf("Warning: Invalid integer for %s, falling back to default %d\n", key, defaultVal)
	}
	return defaultVal
}
