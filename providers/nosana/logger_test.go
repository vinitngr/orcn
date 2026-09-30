package nosana

import (
	"encoding/json"
	"testing"
)

func TestNormalizeLogData(t *testing.T) {
	tests := []struct {
		name string
		data string
		opID string
		log  string
	}{
		{
			name: "nested json string",
			data: `"{\"opId\":\"model\",\"log\":\"hello world\"}"`,
			opID: "model",
			log:  "hello world",
		},
		{
			name: "raw object",
			data: `{"opId":"model","log":"direct"}`,
			opID: "model",
			log:  "direct",
		},
		{
			name: "plain string",
			data: `"just a line"`,
			log:  "just a line",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeLogData(json.RawMessage(tt.data))
			if got.OpID != tt.opID {
				t.Fatalf("opID = %q, want %q", got.OpID, tt.opID)
			}
			if got.Log != tt.log {
				t.Fatalf("log = %q, want %q", got.Log, tt.log)
			}
		})
	}
}

func TestShortNodeID(t *testing.T) {
	if got := shortNodeID("78qufmGpkh7aGZkT9mH2Ss2GeaBqKHqmchDdqveXe6h9"); got != "78qufmGp" {
		t.Fatalf("shortNodeID = %q, want %q", got, "78qufmGp")
	}
	if got := shortNodeID("abc"); got != "abc" {
		t.Fatalf("shortNodeID = %q, want %q", got, "abc")
	}
}
