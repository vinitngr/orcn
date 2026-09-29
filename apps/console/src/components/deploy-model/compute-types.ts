export interface ProviderConfigField {
  key: string;
  name: string;
  description: string;
  type: "text" | "number" | "select" | "boolean" | string;
  required: boolean;
  is_advanced: boolean;
  default: string;
  options?: string[];
  placeholder?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  type: string;
  has_volume_support?: boolean;
  requires_regions?: boolean;
  requires_vpc?: boolean;
  features?: string[];
  regions?: string[];
  schema?: ProviderConfigField[];
}
