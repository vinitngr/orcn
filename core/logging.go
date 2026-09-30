package core

import "time"

type LogSource string

const (
	LogSourceApp LogSource = "app"
	LogSourceSystem LogSource = "system"
)

type LogEvent struct {
	Node      string    `json:"node"`
	Container string    `json:"container"`
	Timestamp time.Time `json:"timestamp"`
	Log       string    `json:"log"`
	Source    LogSource `json:"source"`
}

type LogAdapter interface {
	Events() <-chan LogEvent
	Close() error
}
