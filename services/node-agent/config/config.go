package config

import (
	"os"
	"strconv"
)

type Config struct {
	AdminAddress          string
	ProxyAddress          string
	ProxyTargetHost       string
	AdminToken            string
	RegistrationAPIKey    string
	DockerHost            string
	LogTailLimit          int
	LogLevel              string
	RegistryUsername      string
	RegistryCredential    string
	RegistryServerAddress string
	ResourceLoaderImage   string
	AgentMode             string // "exclusive" or "shared"
	MaxWorkloadCount      int    // 0 means unlimited (shared mode only)
}

func Load() Config {
	return Config{
		AdminAddress:          env("NODE_AGENT_ADMIN_ADDRESS", "127.0.0.1:9090"),
		ProxyAddress:          env("NODE_AGENT_PROXY_ADDRESS", "0.0.0.0:8080"),
		ProxyTargetHost:       env("NODE_AGENT_PROXY_TARGET_HOST", ""),
		AdminToken:            os.Getenv("NODE_AGENT_ADMIN_TOKEN"),
		RegistrationAPIKey:    os.Getenv("NODE_AGENT_REGISTRATION_API_KEY"),
		DockerHost:            env("DOCKER_HOST", ""),
		LogTailLimit:          envInt("NODE_AGENT_LOG_TAIL_LIMIT", 1000),
		LogLevel:              env("NODE_AGENT_LOG_LEVEL", "info"),
		RegistryUsername:      os.Getenv("DOCKER_REGISTRY_USERNAME"),
		RegistryCredential:    os.Getenv("DOCKER_REGISTRY_CREDENTIAL"),
		RegistryServerAddress: env("DOCKER_REGISTRY_SERVER", "https://index.docker.io/v1/"),
		ResourceLoaderImage:   env("NODE_AGENT_RESOURCE_LOADER_IMAGE", "vinitngr/orcn-resource-loader:dev"),
		AgentMode:             env("AGENT_MODE", "exclusive"),
		MaxWorkloadCount:      envInt("MAX_WORKLOAD_COUNT", 0),
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func envInt(key string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(key))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}
