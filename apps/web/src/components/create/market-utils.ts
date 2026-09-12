function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = numberValue(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function vramFromMetadata(metadata: unknown): number | undefined {
  if (!Array.isArray(metadata)) return undefined;

  const entry = metadata.find((item) => (
    item && typeof item === "object" &&
    "key" in item && item.key === "vram"
  ));

  if (!entry || typeof entry !== "object" || !("value" in entry)) return undefined;
  const match = String(entry.value).match(/[\d.]+/);
  return match ? numberValue(match[0]) : undefined;
}

export function mapMarket(market: any) {
  const nodes = Array.isArray(market.nodes)
    ? (market.nodes.length > 0 ? market.nodes.length : undefined)
    : market.nodes;

  return {
    id: market.address,
    name: market.name,
    tag: market.tag || market.type,
    price: firstNumber(market.price_per_hour_usd, market.usd_reward_per_hour)?.toFixed(3) || "0.000",
    available: firstNumber(
      market.available_nodes,
      market.availableNodes,
      market.available,
      nodes,
    ),
    vram_gb: firstNumber(
      market.vram_gb,
      market.vram,
      market.gpu_vram,
      vramFromMetadata(market.metadata),
    ),
  };
}
