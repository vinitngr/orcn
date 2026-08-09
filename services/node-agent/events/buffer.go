package events

import (
	"sync"
	"time"
)

type Event struct {
	Timestamp   time.Time `json:"timestamp"`
	ContainerID string    `json:"container_id,omitempty"`
	Type        string    `json:"type"`
	Message     string    `json:"message"`
	Level       string    `json:"level"`
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
	case "error":
		return "error"
	case "configuration_mismatch":
		return "warn"
	case "inspect", "container_reused":
		return "debug"
	default:
		return "info"
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
	b.events = append(b.events, event)
	if len(b.events) > b.limit {
		b.events = b.events[len(b.events)-b.limit:]
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
