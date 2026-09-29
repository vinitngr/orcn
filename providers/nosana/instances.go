package nosana

import (
	"encoding/json"
	"strings"
)

func (c *Client) GetInstanceTypes() (any, error) {
	b, err := c.request("GET", "/markets", nil)
	if err != nil {
		return nil, err
	}

	var markets []map[string]any
	if err := json.Unmarshal(b, &markets); err != nil {
		return nil, err
	}
	filtered := make([]map[string]any, 0, len(markets))
	for _, market := range markets {
		if marketType, ok := market["type"].(string); ok {
			if strings.EqualFold(marketType, "COMMUNITY") || strings.EqualFold(marketType, "OTHER") {
				continue
			}
			market["tag"] = marketType
		}
		filtered = append(filtered, market)
	}
	return filtered, nil
}