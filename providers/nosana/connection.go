package nosana

import (
	"fmt"
	"strings"

	"orcn/core"
)

// ConnectionSchema returns the fields required to connect a Nosana account.
func (c *Client) ConnectionSchema() []core.ProviderField {
	return []core.ProviderField{
		{
			Key:         "api_key",
			Name:        "API Key",
			Description: "Nosana API key used to authenticate requests.",
			Type:        "password",
			Required:    true,
			Secret:      true,
			Placeholder: "nos_xxxxxxxxxxxxxxxx",
		},
		{
			Key:         "base_url",
			Name:        "Base URL",
			Description: "Override the Nosana API endpoint (optional).",
			Type:        "text",
			Required:    false,
			Secret:      false,
			Default:     "https://api.nosana.com",
		},
	}
}

// ProcessConnection splits raw user input into raw config and secret material.
func (c *Client) ProcessConnection(raw map[string]any) (*core.ProviderConnectionConfig, error) {
	apiKey := stringValue(raw["api_key"])
	if apiKey == "" {
		return nil, fmt.Errorf("api_key is required")
	}

	config := map[string]any{}
	if base := stringValue(raw["base_url"]); base != "" {
		config["base_url"] = base
	}

	return &core.ProviderConnectionConfig{
		Config: config,
		Secret: map[string]any{"api_key": apiKey},
	}, nil
}

// VerifyConnection pings Nosana with the supplied credentials.
func (c *Client) VerifyConnection(cfg *core.ProviderConnectionConfig) error {
	if cfg == nil || cfg.Secret == nil {
		return fmt.Errorf("missing credentials")
	}
	apiKey := stringValue(cfg.Secret["api_key"])
	if apiKey == "" {
		return fmt.Errorf("api_key is required")
	}

	baseURL := ""
	if cfg.Config != nil {
		baseURL = stringValue(cfg.Config["base_url"])
	}

	client := New(baseURL)
	client.APIKey = apiKey
	if _, err := client.request("GET", "/markets", nil); err != nil {
		return fmt.Errorf("nosana verification failed: %w", err)
	}
	return nil
}

// WithConfig returns a Nosana client bound to the supplied connection credentials.
func (c *Client) WithConfig(cfg *core.ProviderConnectionConfig) (core.Provider, error) {
	if cfg == nil || cfg.Secret == nil {
		return nil, fmt.Errorf("missing credentials")
	}
	apiKey := stringValue(cfg.Secret["api_key"])
	if apiKey == "" {
		return nil, fmt.Errorf("api_key is required")
	}

	baseURL := ""
	if cfg.Config != nil {
		baseURL = stringValue(cfg.Config["base_url"])
	}
	if baseURL == "" {
		baseURL = c.BaseURL
	}

	client := New(baseURL)
	client.APIKey = apiKey
	return client, nil
}

func stringValue(v any) string {
	if s, ok := v.(string); ok {
		return strings.TrimSpace(s)
	}
	return ""
}