package telemetry

import (
	"context"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"orcn/core"
)

type Sampler struct {
	mu           sync.Mutex
	prevCPUTotal uint64
	prevCPUIdle  uint64
	prevDiskRead uint64
	prevDiskWrite uint64
	prevNetRx    uint64
	prevNetTx    uint64
	lastSampled  time.Time
}

func NewSampler() *Sampler {
	return &Sampler{}
}

// Sample collects a point-in-time metrics sample.
func (s *Sampler) Sample(ctx context.Context) core.ContainerSample {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	deltaSec := 1.0
	if !s.lastSampled.IsZero() {
		if diff := now.Sub(s.lastSampled).Seconds(); diff > 0 {
			deltaSec = diff
		}
	}
	s.lastSampled = now

	cpu := s.sampleCPU()
	mem := s.sampleMemory()
	disk := s.sampleDisk(deltaSec)
	net := s.sampleNetwork(deltaSec)

	return core.ContainerSample{
		Timestamp: now,
		Container: "host",
		CPU:       cpu,
		Memory:    mem,
		Disk:      disk,
		Network:   net,
	}
}

// SampleHost returns optional static & dynamic host metrics including GPUs if present.
func (s *Sampler) SampleHost(ctx context.Context, sample core.ContainerSample) *core.HostMetrics {
	host := &core.HostMetrics{
		CPU:    sample.CPU,
		Memory: sample.Memory,
	}

	// GPU is sampled gracefully (returns nil if node has no GPU or nvidia-smi is missing)
	if gpu := sampleGPU(ctx); gpu != nil && len(gpu.Devices) > 0 {
		host.GPU = gpu
	}

	return host
}

func (s *Sampler) sampleCPU() *core.CPUMetrics {
	data, err := os.ReadFile("/proc/stat")
	if err != nil {
		return nil
	}

	lines := strings.Split(string(data), "\n")
	if len(lines) == 0 {
		return nil
	}

	fields := strings.Fields(lines[0])
	if len(fields) < 5 || fields[0] != "cpu" {
		return nil
	}

	var user, nice, system, idle, iowait, irq, softirq, steal uint64
	user, _ = strconv.ParseUint(fields[1], 10, 64)
	nice, _ = strconv.ParseUint(fields[2], 10, 64)
	system, _ = strconv.ParseUint(fields[3], 10, 64)
	idle, _ = strconv.ParseUint(fields[4], 10, 64)
	if len(fields) > 5 {
		iowait, _ = strconv.ParseUint(fields[5], 10, 64)
	}
	if len(fields) > 6 {
		irq, _ = strconv.ParseUint(fields[6], 10, 64)
	}
	if len(fields) > 7 {
		softirq, _ = strconv.ParseUint(fields[7], 10, 64)
	}
	if len(fields) > 8 {
		steal, _ = strconv.ParseUint(fields[8], 10, 64)
	}

	total := user + nice + system + idle + iowait + irq + softirq + steal
	idleTotal := idle + iowait

	var usagePercent float64
	if s.prevCPUTotal > 0 && total > s.prevCPUTotal {
		deltaTotal := float64(total - s.prevCPUTotal)
		deltaIdle := float64(idleTotal - s.prevCPUIdle)
		if deltaTotal > 0 {
			usagePercent = ((deltaTotal - deltaIdle) / deltaTotal) * 100.0
			if usagePercent < 0 {
				usagePercent = 0
			} else if usagePercent > 100 {
				usagePercent = 100
			}
		}
	}

	s.prevCPUTotal = total
	s.prevCPUIdle = idleTotal

	numCPU := runtime.NumCPU()
	return &core.CPUMetrics{
		UsagePercent: &usagePercent,
		LogicalCores: &numCPU,
		ActiveCores:  &numCPU,
	}
}

func (s *Sampler) sampleMemory() *core.MemoryMetrics {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return nil
	}

	var totalKB, availKB float64
	for _, line := range strings.Split(string(data), "\n") {
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}
		switch parts[0] {
		case "MemTotal:":
			totalKB, _ = strconv.ParseFloat(parts[1], 64)
		case "MemAvailable:":
			availKB, _ = strconv.ParseFloat(parts[1], 64)
		}
	}

	if totalKB <= 0 {
		return nil
	}

	totalMB := totalKB / 1024.0
	availMB := availKB / 1024.0
	usedMB := totalMB - availMB
	usagePercent := (usedMB / totalMB) * 100.0

	return &core.MemoryMetrics{
		TotalMB:      &totalMB,
		UsedMB:       &usedMB,
		AvailableMB:  &availMB,
		UsagePercent: &usagePercent,
	}
}

func (s *Sampler) sampleDisk(deltaSec float64) *core.DiskIOMetrics {
	data, err := os.ReadFile("/proc/diskstats")
	if err != nil {
		return nil
	}

	var totalReadSectors, totalWriteSectors uint64
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 10 {
			continue
		}
		dev := fields[2]
		// Filter to primary block devices (sda, nvme0n1, vda, xvda, etc.)
		if strings.HasPrefix(dev, "loop") || strings.HasPrefix(dev, "ram") || strings.Contains(dev, "p") {
			continue
		}

		readSec, _ := strconv.ParseUint(fields[5], 10, 64)
		writeSec, _ := strconv.ParseUint(fields[9], 10, 64)
		totalReadSectors += readSec
		totalWriteSectors += writeSec
	}

	// 1 sector = 512 bytes
	readBytes := totalReadSectors * 512
	writeBytes := totalWriteSectors * 512

	var readMB, writeMB float64
	if s.prevDiskRead > 0 && readBytes >= s.prevDiskRead && deltaSec > 0 {
		readMB = float64(readBytes-s.prevDiskRead) / (1024.0 * 1024.0 * deltaSec)
	}
	if s.prevDiskWrite > 0 && writeBytes >= s.prevDiskWrite && deltaSec > 0 {
		writeMB = float64(writeBytes-s.prevDiskWrite) / (1024.0 * 1024.0 * deltaSec)
	}

	s.prevDiskRead = readBytes
	s.prevDiskWrite = writeBytes

	return &core.DiskIOMetrics{
		ReadMB:  &readMB,
		WriteMB: &writeMB,
	}
}

func (s *Sampler) sampleNetwork(deltaSec float64) *core.NetworkIOMetrics {
	data, err := os.ReadFile("/proc/net/dev")
	if err != nil {
		return nil
	}

	var totalRx, totalTx uint64
	for _, line := range strings.Split(string(data), "\n") {
		parts := strings.Split(line, ":")
		if len(parts) != 2 {
			continue
		}
		iface := strings.TrimSpace(parts[0])
		// Ignore local loopback, docker virtual interfaces, and veth pairs
		if iface == "lo" || strings.HasPrefix(iface, "docker") || strings.HasPrefix(iface, "br-") || strings.HasPrefix(iface, "veth") {
			continue
		}

		fields := strings.Fields(parts[1])
		if len(fields) >= 9 {
			rx, _ := strconv.ParseUint(fields[0], 10, 64)
			tx, _ := strconv.ParseUint(fields[8], 10, 64)
			totalRx += rx
			totalTx += tx
		}
	}

	var rxMB, txMB float64
	if s.prevNetRx > 0 && totalRx >= s.prevNetRx && deltaSec > 0 {
		rxMB = float64(totalRx-s.prevNetRx) / (1024.0 * 1024.0 * deltaSec)
	}
	if s.prevNetTx > 0 && totalTx >= s.prevNetTx && deltaSec > 0 {
		txMB = float64(totalTx-s.prevNetTx) / (1024.0 * 1024.0 * deltaSec)
	}

	s.prevNetRx = totalRx
	s.prevNetTx = totalTx

	return &core.NetworkIOMetrics{
		RxMB: &rxMB,
		TxMB: &txMB,
	}
}

// sampleGPU collects GPU utilization & memory via nvidia-smi if available.
// If nvidia-smi does not exist or fails, it silently returns nil (GPU agnostic).
func sampleGPU(ctx context.Context) *core.GPUMetrics {
	if _, err := exec.LookPath("nvidia-smi"); err != nil {
		return nil
	}

	cmdCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	out, err := exec.CommandContext(cmdCtx, "nvidia-smi",
		"--query-gpu=index,name,utilization.gpu,memory.total,memory.used,temperature.gpu",
		"--format=csv,noheader,nounits").Output()
	if err != nil {
		return nil
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	var devices []core.GPUDeviceMetrics

	for _, line := range lines {
		parts := strings.Split(line, ",")
		if len(parts) < 6 {
			continue
		}

		idx, _ := strconv.Atoi(strings.TrimSpace(parts[0]))
		name := strings.TrimSpace(parts[1])
		util, _ := strconv.ParseFloat(strings.TrimSpace(parts[2]), 64)
		memTotal, _ := strconv.ParseFloat(strings.TrimSpace(parts[3]), 64)
		memUsed, _ := strconv.ParseFloat(strings.TrimSpace(parts[4]), 64)
		temp, _ := strconv.ParseFloat(strings.TrimSpace(parts[5]), 64)

		devices = append(devices, core.GPUDeviceMetrics{
			Index:              &idx,
			Name:               name,
			UtilizationPercent: &util,
			MemoryTotalMB:      &memTotal,
			MemoryUsedMB:       &memUsed,
			TemperatureC:       &temp,
		})
	}

	if len(devices) == 0 {
		return nil
	}
	return &core.GPUMetrics{Devices: devices}
}
