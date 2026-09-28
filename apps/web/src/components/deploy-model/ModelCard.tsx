"use client";

import { Download, Heart, Box, Check } from "lucide-react";
import { Logo } from "@/components/ui/Logos";

export interface ModelItem {
  id: string;
  name: string;
  org: string;
  downloads?: number;
  likes?: number;
  vram?: string;
  tags?: string[];
  pipelineTag?: string;
  parameters?: number;
}

interface ModelCardProps {
  model: ModelItem;
  selected?: boolean;
  onClick?: () => void;
}

function formatCount(n: number) {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function ModelCard({ model, selected, onClick }: ModelCardProps) {
  const { id, name, org, downloads, likes, vram, tags = [], pipelineTag } = model;
  const displayTags = tags.length > 0 ? tags : pipelineTag ? [pipelineTag] : [];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex w-full flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150",
        selected
          ? "border-blue-500/90 bg-[#1c1f2e] shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50"
          : "border-zinc-800/90 bg-[#18181c] hover:border-zinc-700 hover:bg-[#1f1f25]",
      ].join(" ")}
    >
      {/* Top right selected check badge */}
      {selected && (
        <span className="absolute right-3.5 top-3.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 shadow-sm">
          <Check className="size-2.5 stroke-[3] text-white" />
        </span>
      )}

      {/* Top section: logo and model info */}
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-2">
          <Logo name={org} size={22} />
        </div>
        <div className="min-w-0 flex-1 pr-5">
          <div className="truncate text-sm font-semibold text-zinc-100" title={name}>
            {name}
          </div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500" title={id}>
            {id}
          </div>
          
          {/* Tags */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {displayTags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-400 capitalize"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom stats row */}
      <div className="mt-4 flex items-center gap-4 text-[11px] text-zinc-400">
        {downloads !== undefined && (
          <div className="flex items-center gap-1">
            <Download className="size-3 text-zinc-500" />
            <span>{formatCount(downloads)}</span>
          </div>
        )}
        {likes !== undefined && (
          <div className="flex items-center gap-1">
            <Heart className="size-3 text-zinc-500" />
            <span>{formatCount(likes)}</span>
          </div>
        )}
        {vram && (
          <div className="flex items-center gap-1">
            <Box className="size-3 text-zinc-500" />
            <span>{vram}</span>
          </div>
        )}
      </div>
    </button>
  );
}
