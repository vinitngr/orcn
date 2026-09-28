import React from "react";
import { Check } from "lucide-react";
import { Logo } from "@/components/ui/Logos";
import type { ProviderInfo } from "./compute-types";

interface Props {
  providers: ProviderInfo[];
  selectedProvider: string;
  onSelectProvider: (id: string) => void;
}

export const ComputeProviderSection: React.FC<Props> = ({ providers, selectedProvider, onSelectProvider }) => (
  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
    {providers.map((p) => {
      const isSelected = selectedProvider === p.id;
      return (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelectProvider(p.id)}
          className={[
            "group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150",
            isSelected
              ? "border-blue-500/90 bg-[#161a29] shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50"
              : "border-zinc-800/90 bg-[#131317] hover:border-zinc-700 hover:bg-[#18181f]",
          ].join(" ")}
        >
          {isSelected && (
            <span className="absolute right-3.5 top-3.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 shadow-sm">
              <Check className="size-2.5 stroke-[3] text-white" />
            </span>
          )}
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#0e0e12] p-2">
              <Logo name={p.id} size={24} />
            </div>
            <div className="min-w-0 flex-1 pr-5">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-zinc-100">{p.name}</span>
                <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 uppercase">{p.type}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed line-clamp-2">{p.description}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-2.5">
            <div className="flex flex-wrap gap-1">
              {(p.features || []).slice(0, 2).map((feat) => (
                <span key={feat} className="rounded bg-[#0e0e12] px-2 py-0.5 text-[10px] text-zinc-400 border border-zinc-800/60">
                  {feat}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ready</span>
            </div>
          </div>
        </button>
      );
    })}
  </div>
);

export default ComputeProviderSection;
