package api

import "testing"

func TestContainerIDs(t *testing.T) {
	tests := []struct {
		name string
		spec string
		want int
	}{
		{
			name: "internal job spec",
			spec: `{"version":"v2","containers":[{"id":"vllm-inference-server","args":{}}]}`,
			want: 1,
		},
		{
			name: "template spec v2",
			spec: `{"containers":[{"id":"a"},{"id":"b"}]}`,
			want: 2,
		},
		{
			name: "empty",
			spec: ``,
			want: 0,
		},
		{
			name: "invalid json",
			spec: `not json`,
			want: 0,
		},
		{
			name: "missing ids",
			spec: `{"containers":[{"args":{}}]}`,
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := containerIDs(tt.spec); len(got) != tt.want {
				t.Fatalf("containerIDs() len = %d, want %d (%v)", len(got), tt.want, got)
			}
		})
	}
}
