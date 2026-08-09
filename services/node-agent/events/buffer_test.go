package events

import "testing"

func TestBufferDoesNotPersistProgress(t *testing.T) {
	buffer := NewBuffer(10)
	stream, unsubscribe := buffer.Subscribe()
	defer unsubscribe()

	buffer.Publish(Event{Type: "started", Message: "container started"})
	buffer.Publish(Event{Type: "progress", Message: "download progress"})

	snapshot := buffer.Snapshot()
	if len(snapshot) != 1 || snapshot[0].Type != "started" {
		t.Fatalf("snapshot = %#v, want only lifecycle event", snapshot)
	}
	for _, want := range []string{"started", "progress"} {
		select {
		case event := <-stream:
			if event.Type != want {
				t.Fatalf("live event type = %q, want %q", event.Type, want)
			}
		default:
			t.Fatalf("missing live event %q", want)
		}
	}
}
