package events

import (
	"strings"
	"sync"
	"time"
)

type Event struct {
	ID          string         `json:"id,omitempty"`
	Timestamp   time.Time      `json:"timestamp"`
	ContainerID string         `json:"container_id,omitempty"`
	Category    string         `json:"category"`
	Type        string         `json:"type"`
	Message     string         `json:"message"`
	Level       string         `json:"level"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

type Sink interface {
	Publish(Event)
}

type NopSink struct{}

func (NopSink) Publish(Event) {}

type Logger interface {
	Debug(string, ...any)
	Info(string, ...any)
	Warn(string, ...any)
	Error(string, ...any)
}

type Recorder struct {
	buffer *Buffer
	logger Logger
}

func NewRecorder(buffer *Buffer, logger Logger) *Recorder {
	return &Recorder{buffer: buffer, logger: logger}
}

func (r *Recorder) Publish(event Event) {
	event = normalize(event)
	if event.Level == "" {
		event.Level = levelForType(event.Type)
	}
	r.buffer.Publish(event)
	if r.logger == nil {
		return
	}
	switch event.Level {
	case "debug":
		r.logger.Debug("%s: %s", event.Type, event.Message)
	case "warn":
		r.logger.Warn("%s: %s", event.Type, event.Message)
	case "error":
		r.logger.Error("%s: %s", event.Type, event.Message)
	default:
		r.logger.Info("%s: %s", event.Type, event.Message)
	}
}

func levelForType(eventType string) string {
	switch eventType {
	case "operation_failed":
		return "error"
	case "configuration_mismatch", "cleanup_warning":
		return "warn"
	case "inspect", "container_reused":
		return "debug"
	default:
		return "info"
	}
}

func normalize(event Event) Event {
	if event.Category == "" {
		event.Category = categoryForType(event.Type)
	}
	switch event.Type {
	case "started":
		event.Type = "container_started"
	case "starting":
		event.Type = "container_starting"
	case "restarted":
		event.Type = "container_restarted"
	case "restarting":
		event.Type = "container_restarting"
	case "stopped":
		event.Type = "container_stopped"
	case "stopping":
		event.Type = "container_stopping"
	case "removing":
		event.Type = "container_removing"
	case "removed":
		event.Type = "container_removed"
	case "image_pulling":
		event.Type = "image_pull_started"
	case "image_pulled":
		event.Type = "image_pull_completed"
	case "progress":
		event.Type = "download_progress"
	case "error":
		event.Type = "operation_failed"
	case "warning":
		event.Type = "cleanup_warning"
	}
	return event
}

func categoryForType(eventType string) string {
	switch eventType {
	case "starting", "started", "restarting", "restarted", "stopping", "stopped", "removing", "removed":
		return "lifecycle"
	case "image_pulling", "image_pulled":
		return "image"
	case "progress", "download_progress", "resource_loader_pulling", "resource_installing", "resource_installed":
		return "resource"
	case "configuration_mismatch":
		return "validation"
	case "error", "operation_failed":
		return "runtime"
	case "warning", "cleanup_warning":
		return "cleanup"
	default:
		return "runtime"
	}
}

type Buffer struct {
	mu     sync.RWMutex
	limit  int
	events []Event
	subs   map[chan Event]struct{}
}

func NewBuffer(limit int) *Buffer {
	if limit <= 0 {
		limit = 500
	}
	return &Buffer{limit: limit, subs: make(map[chan Event]struct{})}
}

func (b *Buffer) Publish(event Event) {
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}
	b.mu.Lock()
	// Progress is transient telemetry. It is delivered to live subscribers,
	// but never retained in the snapshot buffer.
	if !strings.EqualFold(event.Type, "progress") && !strings.EqualFold(event.Type, "download_progress") {
		b.events = append(b.events, event)
		if len(b.events) > b.limit {
			b.events = b.events[len(b.events)-b.limit:]
		}
	}
	for subscriber := range b.subs {
		select {
		case subscriber <- event:
		default:
		}
	}
	b.mu.Unlock()
}

func (b *Buffer) Snapshot() []Event {
	b.mu.RLock()
	defer b.mu.RUnlock()
	if len(b.events) == 0 {
		return []Event{}
	}
	return append([]Event(nil), b.events...)
}

func (b *Buffer) Subscribe() (<-chan Event, func()) {
	channel := make(chan Event, 32)
	b.mu.Lock()
	b.subs[channel] = struct{}{}
	b.mu.Unlock()
	return channel, func() {
		b.mu.Lock()
		delete(b.subs, channel)
		close(channel)
		b.mu.Unlock()
	}
}
