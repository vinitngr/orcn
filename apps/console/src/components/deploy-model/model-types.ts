export interface ModelDetails {
  author?: string;
  parameters?: number;
  quantization?: string;
  gated?: boolean;
  library_name?: string;
  description?: string;
  family?: string;
  lastModified?: string;
  tags?: string[];
  recommended_tool_parser?: string;
  recommended_reasoning_parser?: string;
  metadata?: {
    tool_parser?: string;
    reasoning_parser?: string;
    [key: string]: unknown;
  };
  safetensors?: {
    total?: number;
    parameters?: Record<string, number>;
  };
  config?: {
    torch_dtype?: string;
    max_position_embeddings?: number;
    num_hidden_layers?: number;
    n_layer?: number;
    architectures?: string[];
    model_type?: string;
    vocab_size?: number;
    quantization_config?: {
      bits?: number;
      weight_bits?: number;
      quant_method?: string;
      config_groups?: {
        group_0?: {
          weights?: { num_bits?: number };
        };
      };
    };
  };
  cardData?: {
    license?: string;
  };
}

export interface ModelSearchApiResult {
  ID: string;
  Author?: string;
  Downloads?: number;
  Likes?: number;
  Parameters?: number;
  Tags?: string[];
  PipelineTag?: string;
}
