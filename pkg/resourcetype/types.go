package resourcetype

type ProviderField struct {
	Name        string `json:"name"`
	Label       string `json:"label"`
	Type        string `json:"type"`
	Placeholder string `json:"placeholder,omitempty"`
	Description string `json:"description,omitempty"`
	Required    bool   `json:"required"`
	SpecKey     string `json:"spec_key"`
}

type Provider struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Fields      []ProviderField `json:"fields"`
}

var Providers = []Provider{
	{
		ID:          "http",
		Name:        "HTTP Direct URL",
		Description: "Download a file or archive from a direct HTTP(S) URL.",
		Fields: []ProviderField{
			{
				Name:        "url",
				Label:       "Resource URL",
				Type:        "text",
				Placeholder: "https://example.com/model.bin",
				Description: "Direct HTTP(S) link to the file or archive.",
				Required:    true,
				SpecKey:     "url",
			},
			{
				Name:        "target",
				Label:       "Target Mount Path",
				Type:        "text",
				Placeholder: "e.g. /workspace/models/checkpoints/",
				Description: "Absolute path inside the container where the resource is placed.",
				Required:    true,
				SpecKey:     "target",
			},
		},
	},
	{
		ID:          "hf",
		Name:        "Hugging Face",
		Description: "Download models, datasets or LoRAs from a Hugging Face repository.",
		Fields: []ProviderField{
			{
				Name:        "url",
				Label:       "Repository",
				Type:        "text",
				Placeholder: "org/repo (e.g. runwayml/stable-diffusion-v1-5)",
				Description: "Hugging Face repository ID in 'org/repo' format.",
				Required:    true,
				SpecKey:     "url",
			},
			{
				Name:        "files",
				Label:       "Files",
				Type:        "string_list",
				Placeholder: "e.g. model.safetensors",
				Description: "Specific files to download. Leave empty to pull the entire repository.",
				Required:    false,
				SpecKey:     "files",
			},
			{
				Name:        "target",
				Label:       "Target Mount Path",
				Type:        "text",
				Placeholder: "e.g. /workspace/models/checkpoints/",
				Description: "Absolute path inside the container where the resources are placed.",
				Required:    true,
				SpecKey:     "target",
			},
		},
	},
}