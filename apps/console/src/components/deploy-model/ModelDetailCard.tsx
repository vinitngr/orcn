"use client";

import { ExternalLink, KeyRound, Tag } from "lucide-react";
import { Logo } from "@/components/ui/Logos";
import { ModelDetails } from "./model-types";

interface ModelDetailCardProps {
  modelId: string;
  modelDetails: ModelDetails | null;
  taskLabel?: string;
  requiredVram: number;
  hfToken: string;
  onHfTokenChange: (token: string) => void;
}

export function ModelDetailCard({
  modelId,
  modelDetails,
  taskLabel,
  requiredVram,
  hfToken,
  onHfTokenChange,
}: ModelDetailCardProps) {
  if (!modelId) return null;

  const modelName = modelId.split("/").pop() || "";
  const org = modelDetails?.author || modelId.split("/")[0] || "";

  // Derive parameters
  const paramsCount = modelDetails?.safetensors?.total
    ? `${(modelDetails.safetensors.total / 1e9).toFixed(0)}B`
    : typeof modelDetails?.parameters === "number"
      ? `${modelDetails.parameters}B`
      : modelId.match(/(\d+)b/i)?.[1]
        ? `${modelId.match(/(\d+)b/i)?.[1]}B`
        : "-";

  // Derive context length
  const contextLength = modelDetails?.config?.max_position_embeddings
    ? `${Math.round(modelDetails.config.max_position_embeddings / 1024)}K`
    : "-";

  // Derive layers
  const layers =
    modelDetails?.config?.num_hidden_layers ||
    modelDetails?.config?.n_layer ||
    "-";

  // Derive dtype
  const dtype =
    modelDetails?.config?.torch_dtype ||
    (modelDetails?.safetensors?.parameters
      ? Object.keys(modelDetails.safetensors.parameters)[0]
      : modelDetails?.quantization) ||
    "-";

  // Derive architecture
  const architecture =
    modelDetails?.config?.architectures?.[0] || modelDetails?.family || "-";

  // Derive model type
  const modelType =
    modelDetails?.config?.model_type ||
    (modelId.toLowerCase().includes("instruct") ? "instruct" : "base");

  // Derive license
  const license = modelDetails?.cardData?.license || "-";

  // Derive last updated
  const lastUpdated = modelDetails?.lastModified
    ? new Date(modelDetails.lastModified).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

  // Derive vocabulary size
  const vocabSize = modelDetails?.config?.vocab_size?.toLocaleString() || "-";

  const description =
    modelDetails?.description || `${modelName} is a model from ${org}.`;

  // Model tags list
  const tags: string[] = Array.isArray(modelDetails?.tags)
    ? modelDetails.tags
    : [];

  // Header badges come from the selected task / model card, never hardcoded.
  const badges = [
    taskLabel,
    modelType !== "base" ? modelType : undefined,
  ].filter((b): b is string => !!b);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--dm-panel-alt)] p-6 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--dm-logo)] p-2">
            <Logo name={org} size={26} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--text-main)]">
                {modelName}
              </h3>
              <div className="flex items-center gap-1.5">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded bg-[var(--dm-chip)] px-2 py-0.5 text-[11px] font-medium text-[var(--dm-text-3)] capitalize"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-xs text-[var(--text-light)] font-mono mt-0.5">
              {modelId}
            </div>
          </div>
        </div>

        {/* Action Links */}
        <div className="flex items-center gap-4 text-xs">
          <a
            href={`https://huggingface.co/${modelId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>View on Hugging Face</span>
            <ExternalLink className="size-3" />
          </a>
          <a
            href={`https://huggingface.co/${modelId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>Model Card</span>
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3.5 text-xs leading-relaxed text-[var(--text-muted)]">
        {description}
      </p>

      {/* Quick Specs Row */}
      <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-[var(--dm-divider)] bg-[var(--dm-strip)] p-4 sm:grid-cols-5">
        <div>
          <div className="text-sm font-semibold text-[var(--text-main)]">
            {paramsCount}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-light)]">
            Parameters
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text-main)]">
            {contextLength}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-light)]">
            Context Length
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text-main)]">
            {layers}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-light)]">
            Layers
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text-main)] capitalize">
            {dtype}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-light)]">
            Dtype
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-[var(--text-main)]">
            ~{Math.ceil(requiredVram || 16)} GB
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-light)]">
            Est. VRAM
          </div>
        </div>
      </div>

      {/* Metadata Key-Values Grid */}
      <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2.5 text-xs sm:grid-cols-2 lg:grid-cols-3 border-t border-[var(--dm-divider)] pt-5">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-light)]">Architecture</span>
          <span className="font-mono text-[var(--dm-text-3)]">
            {architecture}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-light)]">Model Type</span>
          <span className="text-[var(--dm-text-3)]">{modelType}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-light)]">License</span>
          <span className="text-[var(--dm-text-3)]">{license}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-light)]">Last Updated</span>
          <span className="text-[var(--dm-text-3)]">{lastUpdated}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-light)]">Vocabulary Size</span>
          <span className="text-[var(--dm-text-3)]">{vocabSize}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-light)]">Framework</span>
          <span className="text-[var(--dm-text-3)]">
            {modelDetails?.library_name || "-"}
          </span>
        </div>
      </div>

      {/* Model Tags Section */}
      {tags.length > 0 && (
        <div className="mt-5 border-t border-[var(--dm-divider)] pt-4">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Tag className="size-3 text-[var(--text-light)]" />
            <span>Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 16).map((t) => (
              <span
                key={t}
                className="rounded-md border border-[var(--border)] bg-[var(--dm-tag)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gated Token input if gated */}
      {modelDetails?.gated && (
        <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-400">
            <KeyRound className="size-3.5" />
            <span>Gated Model — Hugging Face Token Required</span>
          </div>
          <input
            type="password"
            placeholder="hf_..."
            value={hfToken}
            onChange={(e) => onHfTokenChange(e.target.value)}
            className="h-9 w-full rounded-md border border-amber-500/30 bg-[var(--dm-logo-solid)] px-3 text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:border-amber-400 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
