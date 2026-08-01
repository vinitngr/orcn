package health

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"orcn/models"

	"gorm.io/gorm"
)

type Checker struct {
	DB     *gorm.DB
	client *http.Client
}

func New(db *gorm.DB) *Checker {
	return &Checker{
		DB:     db,
		client: &http.Client{Timeout: 2 * time.Second},
	}
}

func (c *Checker) RunCheck(nodeID, baseURL, protocol, path string, expectedStatus int) {
	urlStr := baseURL
	if !strings.HasPrefix(urlStr, "http") {
		urlStr = fmt.Sprintf("%s://%s", protocol, baseURL)
	}
	fullURL := urlStr + path

	resp, err := c.client.Get(fullURL)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == expectedStatus {
		c.DB.Model(&models.Node{}).Where("id = ?", nodeID).Update("app_status", models.AppReady)
	}
}
