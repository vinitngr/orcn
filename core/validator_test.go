package core

import (
	"testing"
)

func TestValidateJobSpecStruct(t *testing.T) {
	tests := []struct {
		name        string
		setup       func() *TemplateSpecV2
		wantValid   bool
		wantErrsLen int
	}{
		{
			name: "Valid Spec with defaults",
			setup: func() *TemplateSpecV2 {
				return &TemplateSpecV2{
					Version: "v2",
					Name:    "my-valid-job",
					Containers: []struct {
						ID   string `json:"id"`
						Args struct {
							Image        string            `json:"image"`
							GPU          bool              `json:"gpu"`
							Cmd          []string          `json:"cmd"`
							Entrypoint   []string          `json:"entrypoint"`
							Env          map[string]string `json:"env"`
							VolumeMounts []struct {
								VolumeName string `json:"volume_name"`
								MountPath  string `json:"mount_path"`
							} `json:"volume_mounts"`
							Expose []struct {
								Port     int    `json:"port"`
								Protocol string `json:"protocol"`
								IsPublic bool   `json:"is_public"`
							} `json:"expose"`
							Resources []struct {
								Type   string   `json:"type"`
								URL    string   `json:"url"`
								Target string   `json:"target"`
								Files  []string `json:"files,omitempty"`
							} `json:"resources"`
						} `json:"args"`
					}{
						{
							ID: "master",
							Args: struct {
								Image        string            `json:"image"`
								GPU          bool              `json:"gpu"`
								Cmd          []string          `json:"cmd"`
								Entrypoint   []string          `json:"entrypoint"`
								Env          map[string]string `json:"env"`
								VolumeMounts []struct {
									VolumeName string `json:"volume_name"`
									MountPath  string `json:"mount_path"`
								} `json:"volume_mounts"`
								Expose []struct {
									Port     int    `json:"port"`
									Protocol string `json:"protocol"`
									IsPublic bool   `json:"is_public"`
								} `json:"expose"`
								Resources []struct {
									Type   string   `json:"type"`
									URL    string   `json:"url"`
									Target string   `json:"target"`
									Files  []string `json:"files,omitempty"`
								} `json:"resources"`
							}{
								Image: "ubuntu:latest",
							},
						},
					},
				}
			},
			wantValid:   true,
			wantErrsLen: 0,
		},
		{
			name: "Missing required root fields",
			setup: func() *TemplateSpecV2 {
				return &TemplateSpecV2{
					// Missing Version, Name, Containers
				}
			},
			wantValid:   false,
			wantErrsLen: 3, // Version, Name, Containers empty
		},
		{
			name: "Invalid volume mounts and ports",
			setup: func() *TemplateSpecV2 {
				return &TemplateSpecV2{
					Version: "v2",
					Name:    "broken-job",
					Volumes: []struct {
						Name     string `json:"name"`
						Type     string `json:"type"`
						SizeGB   int    `json:"size_gb"`
						HostPath string `json:"host_path"`
					}{
						{Name: "data"}, // Valid
						{Name: ""},     // Invalid: missing name
					},
					Containers: []struct {
						ID   string `json:"id"`
						Args struct {
							Image        string            `json:"image"`
							GPU          bool              `json:"gpu"`
							Cmd          []string          `json:"cmd"`
							Entrypoint   []string          `json:"entrypoint"`
							Env          map[string]string `json:"env"`
							VolumeMounts []struct {
								VolumeName string `json:"volume_name"`
								MountPath  string `json:"mount_path"`
							} `json:"volume_mounts"`
							Expose []struct {
								Port     int    `json:"port"`
								Protocol string `json:"protocol"`
								IsPublic bool   `json:"is_public"`
							} `json:"expose"`
							Resources []struct {
								Type   string   `json:"type"`
								URL    string   `json:"url"`
								Target string   `json:"target"`
								Files  []string `json:"files,omitempty"`
							} `json:"resources"`
						} `json:"args"`
					}{
						{
							ID: "worker",
							Args: struct {
								Image        string            `json:"image"`
								GPU          bool              `json:"gpu"`
								Cmd          []string          `json:"cmd"`
								Entrypoint   []string          `json:"entrypoint"`
								Env          map[string]string `json:"env"`
								VolumeMounts []struct {
									VolumeName string `json:"volume_name"`
									MountPath  string `json:"mount_path"`
								} `json:"volume_mounts"`
								Expose []struct {
									Port     int    `json:"port"`
									Protocol string `json:"protocol"`
									IsPublic bool   `json:"is_public"`
								} `json:"expose"`
								Resources []struct {
									Type   string   `json:"type"`
									URL    string   `json:"url"`
									Target string   `json:"target"`
									Files  []string `json:"files,omitempty"`
								} `json:"resources"`
							}{
								Image: "", // Missing image
								VolumeMounts: []struct {
									VolumeName string `json:"volume_name"`
									MountPath  string `json:"mount_path"`
								}{
									{VolumeName: "data", MountPath: ""},     // Missing path
									{VolumeName: "fake", MountPath: "/app"}, // Undefined volume
								},
								Expose: []struct {
									Port     int    `json:"port"`
									Protocol string `json:"protocol"`
									IsPublic bool   `json:"is_public"`
								}{
									{Port: -1, Protocol: "tcp"},       // Invalid port
									{Port: 8080, Protocol: "invalid"}, // Invalid protocol
								},
							},
						},
					},
				}
			},
			wantValid:   false,
			wantErrsLen: 6, // 1 vol name, 1 missing image, 1 missing mount path, 1 undefined vol, 1 invalid port, 1 invalid proto
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			spec := tt.setup()
			valid, errs := ValidateJobSpecStruct(spec)
			if valid != tt.wantValid {
				t.Errorf("expected valid=%v, got %v", tt.wantValid, valid)
			}
			if len(errs) != tt.wantErrsLen {
				t.Errorf("expected %d errors, got %d: %v", tt.wantErrsLen, len(errs), errs)
			}
		})
	}
}

func TestValidateJobSpecVolumes(t *testing.T) {
	base := func(volumes []VolumeSpec, mounts []VolumeMount) *JobSpec {
		return &JobSpec{
			Version: "v2", Type: "container", Volumes: volumes,
			Containers: []ContainerSpec{{ID: "worker", Args: ContainerArgs{
				Image: "alpine:latest", VolumeMounts: mounts,
			}}},
		}
	}
	tests := []struct {
		name  string
		spec  *JobSpec
		valid bool
	}{
		{"valid docker volume", base([]VolumeSpec{{Name: "cache", Type: "docker"}}, []VolumeMount{{VolumeName: "cache", MountPath: "/data"}}), true},
		{"duplicate names", base([]VolumeSpec{{Name: "cache", Type: "docker"}, {Name: "cache", Type: "bind", Source: "/tmp/cache"}}, []VolumeMount{{VolumeName: "cache", MountPath: "/data"}}), false},
		{"undefined mount", base(nil, []VolumeMount{{VolumeName: "missing", MountPath: "/data"}}), false},
		{"unused volume", base([]VolumeSpec{{Name: "unused", Type: "docker"}}, nil), false},
		{"bind requires source", base([]VolumeSpec{{Name: "data", Type: "bind"}}, []VolumeMount{{VolumeName: "data", MountPath: "/data"}}), false},
		{"persisted default source", base([]VolumeSpec{{Name: "models", Type: "persisted"}}, []VolumeMount{{VolumeName: "models", MountPath: "/models"}}), true},
		{"resource volume must be mounted", &JobSpec{
			Version: "v2", Type: "container",
			Volumes: []VolumeSpec{{Name: "models", Type: "docker"}},
			Containers: []ContainerSpec{{ID: "worker", Args: ContainerArgs{
				Image:     "alpine:latest",
				Resources: []ResourceSpec{{Type: "http", URL: "https://example.com/model", VolumeName: "models", Path: "model.bin"}},
			}}},
		}, false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			valid, errors := ValidateJobSpec(test.spec)
			if valid != test.valid {
				t.Fatalf("valid = %v, want %v; errors: %v", valid, test.valid, errors)
			}
		})
	}
}
