function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

// Clean, normalized instance interface. All hardware classification
// (vendor, device type) is resolved by the backend — the frontend
// only consumes these ready-to-render fields.
export interface ComputeInstance {
  id: string;
  name: string;
  vendor?: string;
  device_type?: string;
  gpu_model?: string;
  tag?: string;
  price?: number;
  vram_gb?: number;
  cpu_cores?: number;
  ram_gb?: number;
  available?: number;
  location?: string;
  architecture?: string;
}

export function mapInstance(instance: any): ComputeInstance {
  const id = instance.id ?? instance.address ?? "";
  return {
    id,
    name: instance.name ?? id,
    vendor: instance.vendor || undefined,
    device_type: instance.device_type || undefined,
    gpu_model: instance.gpu_model || undefined,
    tag: instance.tag || undefined,
    price: numberValue(instance.price_per_hour ?? instance.price),
    vram_gb: numberValue(instance.vram_gb),
    cpu_cores: numberValue(instance.cpu_cores),
    ram_gb: numberValue(instance.ram_gb),
    available: numberValue(instance.available),
    location: instance.location || undefined,
    architecture: instance.architecture || undefined,
  };
}
