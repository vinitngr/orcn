package core

import "time"

// NodeMetrics is the provider-agnostic telemetry payload for a node.
// Providers fill Series with container-scoped samples when available;
// missing fields stay nil/empty so the UI shows placeholders.
type NodeMetrics struct {
	Timestamp  time.Time         `json:"timestamp"`
	Containers []string          `json:"containers,omitempty"`
	Series     []ContainerSample `json:"series,omitempty"`
	// Host holds optional node-level capacity (static); live charts use Series.
	Host *HostMetrics `json:"host,omitempty"`
}

// ContainerSample is one point-in-time sample for a single container/op.
type ContainerSample struct {
	Timestamp time.Time          `json:"timestamp"`
	Container string             `json:"container"`
	CPU       *CPUMetrics        `json:"cpu,omitempty"`
	Memory    *MemoryMetrics     `json:"memory,omitempty"`
	Disk      *DiskIOMetrics     `json:"disk,omitempty"`
	Network   *NetworkIOMetrics  `json:"network,omitempty"`
}

type CPUMetrics struct {
	UsagePercent *float64 `json:"usage_percent,omitempty"`
	ActiveCores  *int     `json:"active_cores,omitempty"`
	LogicalCores *int     `json:"logical_cores,omitempty"`
}

type MemoryMetrics struct {
	TotalMB       *float64 `json:"total_mb,omitempty"`
	UsedMB        *float64 `json:"used_mb,omitempty"`
	AvailableMB   *float64 `json:"available_mb,omitempty"`
	UsagePercent  *float64 `json:"usage_percent,omitempty"`
}

type DiskIOMetrics struct {
	ReadMB  *float64 `json:"read_mb,omitempty"`
	WriteMB *float64 `json:"write_mb,omitempty"`
}

type NetworkIOMetrics struct {
	RxMB *float64 `json:"rx_mb,omitempty"`
	TxMB *float64 `json:"tx_mb,omitempty"`
}

// HostMetrics is optional static host capacity (GPU name, totals, etc.).
type HostMetrics struct {
	CPU     *CPUMetrics     `json:"cpu,omitempty"`
	Memory  *MemoryMetrics  `json:"memory,omitempty"`
	GPU     *GPUMetrics     `json:"gpu,omitempty"`
	Network *HostNetwork    `json:"network,omitempty"`
	Disk    *HostDisk       `json:"disk,omitempty"`
}

type GPUMetrics struct {
	Devices []GPUDeviceMetrics `json:"devices,omitempty"`
}

type GPUDeviceMetrics struct {
	Index              *int     `json:"index,omitempty"`
	Name               string   `json:"name,omitempty"`
	UtilizationPercent *float64 `json:"utilization_percent,omitempty"`
	MemoryTotalMB      *float64 `json:"memory_total_mb,omitempty"`
	MemoryUsedMB       *float64 `json:"memory_used_mb,omitempty"`
	TemperatureC       *float64 `json:"temperature_c,omitempty"`
}

type HostNetwork struct {
	PingMs       *float64 `json:"ping_ms,omitempty"`
	DownloadMbps *float64 `json:"download_mbps,omitempty"`
	UploadMbps   *float64 `json:"upload_mbps,omitempty"`
}

type HostDisk struct {
	TotalGB *float64 `json:"total_gb,omitempty"`
	UsedGB  *float64 `json:"used_gb,omitempty"`
}
