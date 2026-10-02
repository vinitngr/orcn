"use client";

/**
 * Many newer multimodal / hybrid models (e.g. Qwen3-VL, Qwen3.5) nest the
 * text-model specs under `text_config` (or similar) instead of the config
 * top level. This resolver checks the top level first, then the known
 * nested spots — i.e. `field || text_config.field || ...`.
 */

const NESTED_CONFIG_KEYS = [
  "text_config",
  "language_config",
  "llm_config",
  "decoder_config",
];

function pick(
  obj: Record<string, unknown> | null | undefined,
  keys: string[],
): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

/** First non-null value for `keys`, top level first then nested configs. */
export function resolveConfigValue(
  config: Record<string, unknown> | null | undefined,
  keys: string[],
): unknown {
  if (!config || typeof config !== "object") return undefined;
  const direct = pick(config, keys);
  if (direct !== undefined) return direct;
  for (const nestedKey of NESTED_CONFIG_KEYS) {
    const nested = config[nestedKey];
    if (nested && typeof nested === "object") {
      const value = pick(nested as Record<string, unknown>, keys);
      if (value !== undefined) return value;
    }
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export const CONTEXT_KEYS = [
  "max_position_embeddings",
  "max_seq_length",
  "max_sequence_length",
  "n_positions",
  "seq_length",
];

export const LAYERS_KEYS = [
  "num_hidden_layers",
  "n_layer",
  "num_layers",
  "n_hidden_layers",
];

export const VOCAB_KEYS = ["vocab_size", "padded_vocab_size"];

export const DTYPE_KEYS = ["torch_dtype", "dtype"];

export const HIDDEN_KEYS = ["hidden_size", "n_embd", "d_model"];

export function resolveConfigNumber(
  config: Record<string, unknown> | null | undefined,
  keys: string[],
): number | undefined {
  return toNumber(resolveConfigValue(config, keys));
}

/** String variant for freely-renderable values like dtype. */
export function resolveConfigString(
  config: Record<string, unknown> | null | undefined,
  keys: string[],
): string | undefined {
  const value = resolveConfigValue(config, keys);
  return typeof value === "string" ? value : undefined;
}
