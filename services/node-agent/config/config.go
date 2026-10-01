package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
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
	AgentMode             string        // "exclusive" or "shared"
	MaxWorkloadCount      int           // 0 means unlimited (shared mode only)
	TelemetryEnabled            bool          // whether background telemetry sampler is active
	TelemetryInterval           time.Duration // sampling interval (e.g. 5s)
	TelemetryBufferPoints       int           // max sample points retained in ring buffer (e.g. 60 = 5 min at 5s)
	HealthCheckEnabled          bool          // whether background health check reconciler is active
	HealthCheckInterval         time.Duration // sampling interval (e.g. 5s)
	HealthCheckFailureThreshold int           // consecutive failures before unhealthy (e.g. 3)
}

func Load() Config {
	_ = godotenv.Load()

	return Config{
		AdminAddress:                env("NODE_AGENT_ADMIN_ADDRESS", "127.0.0.1:9090"),
		ProxyAddress:                env("NODE_AGENT_PROXY_ADDRESS", "0.0.0.0:8080"),
		ProxyTargetHost:             env("NODE_AGENT_PROXY_TARGET_HOST", ""),
		AdminToken:                  os.Getenv("NODE_AGENT_ADMIN_TOKEN"),
		RegistrationAPIKey:          os.Getenv("NODE_AGENT_REGISTRATION_API_KEY"),
		DockerHost:                  env("DOCKER_HOST", ""),
		LogTailLimit:                envInt("NODE_AGENT_LOG_TAIL_LIMIT", 1000),
		LogLevel:                    env("NODE_AGENT_LOG_LEVEL", "info"),
		RegistryUsername:            os.Getenv("DOCKER_REGISTRY_USERNAME"),
		RegistryCredential:          os.Getenv("DOCKER_REGISTRY_CREDENTIAL"),
		RegistryServerAddress:       env("DOCKER_REGISTRY_SERVER", "https://index.docker.io/v1/"),
		ResourceLoaderImage:         env("NODE_AGENT_RESOURCE_LOADER_IMAGE", "vinitngr/orcn-resource-loader:dev"),
		AgentMode:                   env("AGENT_MODE", "exclusive"),
		MaxWorkloadCount:            envInt("MAX_WORKLOAD_COUNT", 0),
		TelemetryEnabled:            envBool("NODE_AGENT_TELEMETRY_ENABLED", true),
		TelemetryInterval:           envDuration("NODE_AGENT_TELEMETRY_INTERVAL", 5*time.Second),
		TelemetryBufferPoints:       envInt("NODE_AGENT_TELEMETRY_BUFFER_POINTS", 60),
		HealthCheckEnabled:          envBool("NODE_AGENT_HEALTHCHECK_ENABLED", true),
		HealthCheckInterval:         envDuration("NODE_AGENT_HEALTHCHECK_INTERVAL", 5*time.Second),
		HealthCheckFailureThreshold: envInt("NODE_AGENT_HEALTHCHECK_FAILURE_THRESHOLD", 3),
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

func envBool(key string, fallback bool) bool {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(val)
	if err != nil {
		return fallback
	}
	return parsed
}

func envDuration(key string, fallback time.Duration) time.Duration {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(val)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}
