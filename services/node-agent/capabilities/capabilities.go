package capabilities

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

type DockerInfo struct {
	Installed bool   `json:"installed"`
	Running   bool   `json:"running"`
	Version   string `json:"version,omitempty"`
	Error     string `json:"error,omitempty"`
}

type GPUInfo struct {
	Name     string `json:"name"`
	MemoryGB string `json:"memory_gb,omitempty"`
	Driver   string `json:"driver,omitempty"`
	CUDA     string `json:"cuda,omitempty"`
}

type MachineInfo struct {
	CheckedAt         time.Time  `json:"checked_at"`
	OS                string     `json:"os"`
	Architecture      string     `json:"architecture"`
	CPU               string     `json:"cpu,omitempty"`
	LogicalCPUs       int        `json:"logical_cpus,omitempty"`
	MemoryTotalGB     float64    `json:"memory_total_gb,omitempty"`
	MemoryAvailableGB float64    `json:"memory_available_gb,omitempty"`
	DiskTotalGB       float64    `json:"disk_total_gb,omitempty"`
	DiskAvailableGB   float64    `json:"disk_available_gb,omitempty"`
	Docker            DockerInfo `json:"docker"`
	GPUs              []GPUInfo  `json:"gpus,omitempty"`
}

type Collector struct {
	mu         sync.Mutex
	cached     MachineInfo
	lastCheck  time.Time
	cacheFor   time.Duration
	dockerPing func(context.Context) error
}

func New(dockerPing func(context.Context) error) *Collector {
	return &Collector{cacheFor: 30 * time.Second, dockerPing: dockerPing}
}

func (c *Collector) Get(ctx context.Context, refresh bool) MachineInfo {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !refresh && !c.lastCheck.IsZero() && time.Since(c.lastCheck) < c.cacheFor {
		return c.cached
	}
	c.cached = collect(ctx, c.dockerPing)
	c.lastCheck = time.Now()
	return c.cached
}

func collect(ctx context.Context, dockerPing func(context.Context) error) MachineInfo {
	info := MachineInfo{OS: runtime.GOOS, Architecture: runtime.GOARCH, CheckedAt: time.Now().UTC()}
	info.CPU, info.LogicalCPUs = cpuInfo()
	info.MemoryTotalGB, info.MemoryAvailableGB = memoryInfo()
	info.DiskTotalGB, info.DiskAvailableGB = diskInfo(".")
	info.Docker = dockerInfo(ctx, dockerPing)
	info.GPUs = gpuInfo(ctx)
	return info
}

func cpuInfo() (string, int) {
	data, _ := os.ReadFile("/proc/cpuinfo")
	model := ""
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, "model name") {
			model = strings.TrimSpace(strings.SplitN(line, ":", 2)[1])
			break
		}
	}
	return model, runtime.NumCPU()
}

func memoryInfo() (float64, float64) {
	data, _ := os.ReadFile("/proc/meminfo")
	values := map[string]float64{}
	for _, line := range strings.Split(string(data), "\n") {
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			if value, err := strconv.ParseFloat(parts[1], 64); err == nil {
				values[strings.TrimSuffix(parts[0], ":")] = value / 1024 / 1024
			}
		}
	}
	return values["MemTotal"], values["MemAvailable"]
}

func diskInfo(path string) (float64, float64) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return 0, 0
	}
	blockGB := float64(stat.Bsize) / 1024 / 1024 / 1024
	return float64(stat.Blocks) * blockGB, float64(stat.Bavail) * blockGB
}

func dockerInfo(ctx context.Context, dockerPing func(context.Context) error) DockerInfo {
	result := DockerInfo{}
	if dockerPing != nil {
		if err := dockerPing(ctx); err == nil {
			result.Installed = true
			result.Running = true
			return result
		}
	}
	if _, err := exec.LookPath("docker"); err != nil {
		result.Error = "Docker is unavailable"
		return result
	}
	result.Installed = true
	if _, err := command(ctx, "docker", "info"); err != nil {
		result.Error = "Docker is installed but not running"
		return result
	}
	result.Running = true
	return result
}

func gpuInfo(ctx context.Context) []GPUInfo {
	if _, err := exec.LookPath("nvidia-smi"); err != nil {
		return nil
	}
	output, err := command(ctx, "nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits")
	if err != nil {
		return nil
	}
	var gpus []GPUInfo
	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		parts := strings.Split(line, ",")
		if len(parts) < 3 {
			continue
		}
		gpus = append(gpus, GPUInfo{Name: strings.TrimSpace(parts[0]), MemoryGB: strings.TrimSpace(parts[1]), Driver: strings.TrimSpace(parts[2])})
	}
	return gpus
}

func command(ctx context.Context, name string, args ...string) (string, error) {
	commandCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	output, err := exec.CommandContext(commandCtx, name, args...).Output()
	if err != nil {
		return "", fmt.Errorf("%s: %w", name, err)
	}
	return string(output), nil
}
