package nosana

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"orcn/core"
)

const defaultStatsWindow = 5 * time.Minute
const defaultStatsIntervalSec = 5

// GetNodeMetrics fetches container-scoped live stats for the job running on
// this deployment and normalizes them into core.NodeMetrics.Series.
func (c *Client) GetNodeMetrics(deploymentID string) (*core.NodeMetrics, error) {
	if deploymentID == "" {
		return nil, fmt.Errorf("deployment id is required")
	}
	if c == nil || c.APIKey == "" {
		return nil, fmt.Errorf("nosana client is not bound to a provider connection")
	}

	jobs, err := c.listJobs(deploymentID)
	if err != nil {
		return nil, fmt.Errorf("failed to list deployment jobs: %w", err)
	}

	var nodeID, jobID string
	for _, job := range jobs {
		nodeID = strings.TrimSpace(job.Node)
		if nodeID == "" {
			nodeID = strings.TrimSpace(job.Host)
		}
		jobID = strings.TrimSpace(job.ID)
		if jobID == "" {
			jobID = strings.TrimSpace(job.Job)
		}
		if nodeID != "" && jobID != "" {
			break
		}
	}
	if nodeID == "" || jobID == "" {
		return nil, fmt.Errorf("no running job/host assigned to this deployment yet")
	}

	end := time.Now().UTC()
	start := end.Add(-defaultStatsWindow)

	authHeader, err := c.fetchAuthHeader(deploymentID, jobID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch stats auth header: %w", err)
	}

	raw, err := c.fetchJobStats(nodeID, jobID, start, end, defaultStatsIntervalSec, authHeader)
	if err != nil {
		return nil, err
	}

	return normalizeNosanaJobStats(raw, time.Now().UTC())
}

// fetchJobStats calls:
//
//	GET https://{node}.node.k8s.prd.nos.ci/job/{job}/stats?interval=&start=&end=
func (c *Client) fetchJobStats(nodeID, jobID string, start, end time.Time, intervalSec int, authHeader string) ([]byte, error) {
	u := url.URL{
		Scheme: "https",
		Host:   fmt.Sprintf("%s.node.k8s.prd.nos.ci", strings.ToLower(nodeID)),
		Path:   fmt.Sprintf("/job/%s/stats", jobID),
	}
	q := u.Query()
	q.Set("interval", fmt.Sprintf("%d", intervalSec))
	q.Set("start", fmt.Sprintf("%d", start.UnixMilli()))
	q.Set("end", fmt.Sprintf("%d", end.UnixMilli()))
	u.RawQuery = q.Encode()

	req, err := http.NewRequest(http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	// Node job APIs authenticate with the deployment-signed header (same
	// material used for the /log WebSocket), not the org API key alone.
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	} else {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch nosana job stats: %w", err)
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("nosana job stats error: %s - %s", resp.Status, string(b))
	}
	return b, nil
}

type nosanaJobStat struct {
	Timestamp int64 `json:"timestamp"`
	OpID      string `json:"opId"`
	CPU       *struct {
		CPUPercent *float64 `json:"cpu_percent"`
	} `json:"cpu"`
	Memory *struct {
		MemoryUsage   *float64 `json:"memory_usage"`   // MB
		MemoryLimit   *float64 `json:"memory_limit"`   // GB
		MemoryPercent *float64 `json:"memory_percent"`
	} `json:"memory"`
	Disk *struct {
		Read  *float64 `json:"read"`  // MB
		Write *float64 `json:"write"` // MB
	} `json:"disk"`
	Network *struct {
		Received *float64 `json:"received"` // MB
		Sent     *float64 `json:"sent"`     // MB
	} `json:"network"`
}

func normalizeNosanaJobStats(raw []byte, now time.Time) (*core.NodeMetrics, error) {
	var rows []nosanaJobStat
	if err := json.Unmarshal(raw, &rows); err != nil {
		return nil, fmt.Errorf("failed to parse nosana job stats: %w", err)
	}

	out := &core.NodeMetrics{
		Timestamp: now,
		Series:    make([]core.ContainerSample, 0, len(rows)),
	}
	seen := map[string]struct{}{}

	for _, row := range rows {
		sample := core.ContainerSample{
			Container: row.OpID,
			Timestamp: time.UnixMilli(row.Timestamp).UTC(),
		}
		if sample.Timestamp.IsZero() || row.Timestamp == 0 {
			sample.Timestamp = now
		}
		if row.OpID != "" {
			seen[row.OpID] = struct{}{}
		}

		if row.CPU != nil && row.CPU.CPUPercent != nil {
			v := *row.CPU.CPUPercent
			sample.CPU = &core.CPUMetrics{UsagePercent: &v}
		}
		if row.Memory != nil {
			mem := &core.MemoryMetrics{}
			if row.Memory.MemoryUsage != nil {
				v := *row.Memory.MemoryUsage
				mem.UsedMB = &v
			}
			if row.Memory.MemoryLimit != nil {
				// Nosana sends limit in GB and usage in MB.
				v := *row.Memory.MemoryLimit * 1024
				mem.TotalMB = &v
			}
			if row.Memory.MemoryPercent != nil {
				v := *row.Memory.MemoryPercent
				mem.UsagePercent = &v
			}
			sample.Memory = mem
		}
		if row.Disk != nil {
			sample.Disk = &core.DiskIOMetrics{
				ReadMB:  row.Disk.Read,
				WriteMB: row.Disk.Write,
			}
		}
		if row.Network != nil {
			sample.Network = &core.NetworkIOMetrics{
				RxMB: row.Network.Received,
				TxMB: row.Network.Sent,
			}
		}
		out.Series = append(out.Series, sample)
	}

	containers := make([]string, 0, len(seen))
	for id := range seen {
		containers = append(containers, id)
	}
	sort.Strings(containers)
	out.Containers = containers

	if len(out.Series) > 0 {
		out.Timestamp = out.Series[len(out.Series)-1].Timestamp
	}
	return out, nil
}
