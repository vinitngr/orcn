package nosana

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"orcn/core"
)

type Client struct {
	APIKey     string
	HTTPClient *http.Client
}

func New(apiKey string) *Client {
	return &Client{
		APIKey:     apiKey,
		HTTPClient: &http.Client{},
	}
}

func (c *Client) request(method, path string, body any) ([]byte, error) {
	url := fmt.Sprintf("https://dashboard.k8s.prd.nos.ci/api%s", path)
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("nosana api error: %s - %s", resp.Status, string(b))
	}

	return io.ReadAll(resp.Body)
}

func (c *Client) GetMarkets() (any, error) {
	b, err := c.request("GET", "/markets", nil)
	if err != nil {
		return nil, err
	}
	var res any
	err = json.Unmarshal(b, &res)
	return res, err
}

func (c *Client) CreateDeployment(name, marketID string, spec *core.ContainerSpec) (string, error) {
	expose := make([]map[string]any, 0)
	for _, p := range spec.Ports {
		hc := map[string]any{
			"type":            p.HealthCheck.Type,
			"path":            p.HealthCheck.Path,
			"method":          p.HealthCheck.Method,
			"expected_status": p.HealthCheck.ExpectedStatus,
			"continuous":      false,
		}
		if len(p.HealthCheck.Headers) > 0 {
			hc["headers"] = p.HealthCheck.Headers
		}
		if p.HealthCheck.Body != "" {
			hc["body"] = p.HealthCheck.Body
		}

		expose = append(expose, map[string]any{
			"port":          p.Port,
			"health_checks": []map[string]any{hc},
		})
	}

	resources := make([]map[string]any, 0)
	for _, r := range spec.Resources {
		res := map[string]any{"type": r.Type}
		if r.URL != "" {
			res["url"] = r.URL
		}
		if r.Target != "" {
			res["target"] = r.Target
		}
		if r.Model != "" {
			res["model"] = r.Model
		}
		resources = append(resources, res)
	}

	args := map[string]any{
		"image": spec.Image,
		"gpu":   spec.GPU,
	}
	if len(spec.Cmd) > 0 {
		args["cmd"] = spec.Cmd
	}
	if len(spec.Entrypoint) > 0 {
		args["entrypoint"] = spec.Entrypoint
	}
	if len(expose) > 0 {
		args["expose"] = expose
	}
	if len(spec.Env) > 0 {
		args["env"] = spec.Env
	}
	if len(resources) > 0 {
		args["resources"] = resources
	}

	ops := []map[string]any{
		{
			"type": "container/run",
			"id":   name,
			"args": args,
		},
	}

	meta := map[string]any{
		"trigger": "orcn-gateway",
	}
	sysReq := map[string]any{}
	if spec.SystemRequirements.MinVRAMGB > 0 {
		sysReq["required_vram"] = spec.SystemRequirements.MinVRAMGB
	}
	
	if spec.SystemRequirements.CUDAVersion != "" {
		sysReq["required_cuda"] = []string{
			"12.0", "12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "12.8", "12.9", "13.0", "13.1", "13.2",
		}
	}

	if len(sysReq) > 0 {
		meta["system_requirements"] = sysReq
	}

	jobDef := map[string]any{
		"version": "0.1",
		"type":    "container",
		"ops":     ops,
		"meta":    meta,
	}

	payload := map[string]any{
		"name":           name,
		"market":         marketID,
		"job_definition": jobDef,
		"replicas":       1,
		"timeout":        60,
		"strategy":       "SIMPLE-EXTEND",
		"confidential":   true,
	}

	b, err := c.request("POST", "/deployments/create", payload)
	if err != nil {
		return "", err
	}

	var res map[string]interface{}
	if err := json.Unmarshal(b, &res); err != nil {
		return "", fmt.Errorf("failed to unmarshal nosana response: %v, body: %s", err, string(b))
	}

	if id, ok := res["id"].(string); ok && id != "" {
		return id, nil
	}
	if id, ok := res["deployment"].(string); ok && id != "" {
		return id, nil
	}
	if id, ok := res["deployment_id"].(string); ok && id != "" {
		return id, nil
	}

	return "", fmt.Errorf("no id found in nosana response, body: %s", string(b))
}

func (c *Client) StartDeployment(deploymentID string) error {
	_, err := c.request("POST", fmt.Sprintf("/deployments/%s/start", deploymentID), map[string]any{})
	return err
}

func (c *Client) StopDeployment(deploymentID string) error {
	_, err := c.request("POST", fmt.Sprintf("/deployments/%s/stop", deploymentID), map[string]any{})
	return err
}

func (c *Client) UpdateTimeout(deploymentID string, timeoutMinutes int) error {
	payload := map[string]any{"timeout": timeoutMinutes}
	_, err := c.request("PATCH", fmt.Sprintf("/deployments/%s/update-timeout", deploymentID), payload)
	return err
}

func (c *Client) GetNodeInfo(providerJobID string) (*core.NodeInfo, error) {
	b, err := c.request("GET", fmt.Sprintf("/deployments/%s", providerJobID), nil)
	if err != nil {
		return nil, err
	}

	var res map[string]interface{}
	if err := json.Unmarshal(b, &res); err != nil {
		return nil, fmt.Errorf("failed to parse nosana deployment response: %v", err)
	}

	info := &core.NodeInfo{
		Status: "UNKNOWN",
	}

	if status, ok := res["status"].(string); ok {
		info.Status = status
	}

	if endpoints, ok := res["endpoints"].([]interface{}); ok {
		for _, ep := range endpoints {
			if epMap, ok := ep.(map[string]interface{}); ok {
				endpoint := core.Endpoint{
					Protocol: "https",
				}
				if url, ok := epMap["url"].(string); ok {
					endpoint.BaseURL = url
				}
				if port, ok := epMap["port"].(float64); ok {
					endpoint.Port = int(port)
				}
				if endpoint.BaseURL != "" {
					info.Endpoints = append(info.Endpoints, endpoint)
				}
			}
		}
	}

	if url, ok := res["url"].(string); ok && url != "" {
		info.Endpoints = append(info.Endpoints, core.Endpoint{
			BaseURL:  url,
			Protocol: "https",
		})
	}

	return info, nil
}