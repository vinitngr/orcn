package nosana

import "net/http"

type Client struct {
	APIKey     string
	BaseURL    string
	HTTPClient *http.Client
}

func New(baseURL ...string) *Client {
	url := "https://api.nosana.com"
	if len(baseURL) > 0 && baseURL[0] != "" {
		url = baseURL[0]
	}
	return &Client{
		APIKey:     "",
		BaseURL:    url,
		HTTPClient: &http.Client{},
	}
}