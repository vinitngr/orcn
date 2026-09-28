import React from "react";
import { AlertTriangle, Check, Cpu, Globe, HardDrive, Server } from "lucide-react";
import type { ComputeInstance } from "@/components/create/instance-utils";

interface Props {
  instances: ComputeInstance[];
  totalInstances: number;
  requiredVram: number;
  selectedInstance?: ComputeInstance | null;
  onSelectInstance: (instance: ComputeInstance) => void;
}

export const ComputeInstancesList: React.FC<Props> = ({
  instances,
  totalInstances,
  requiredVram,
  selectedInstance,
  onSelectInstance,
}) => (
  <div className="max-h-[380px] overflow-y-auto pr-1.5 space-y-3">
    {instances.length === 0 ? (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-[#131317]/50 p-8 text-center text-xs text-zinc-500">
        {totalInstances === 0
          ? "No instances available on this provider yet."
          : "No matching compute instances found. Try relaxing your filters or search query."}
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {instances.map((i) => {
          const hasEnoughVram = i.vram_gb === undefined || i.vram_gb >= requiredVram;
          const isSelected = selectedInstance?.id === i.id;
          const isAvailable = hasEnoughVram;
          const deviceType = (i.device_type || "").toUpperCase();

          const vendorColor =
            i.vendor === "NVIDIA"
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              : i.vendor === "AMD"
              ? "text-red-400 bg-red-500/10 border-red-500/20"
              : "text-zinc-300 bg-zinc-800/80 border-zinc-700";

          return (
            <button
              key={i.id}
              type="button"
              onClick={isAvailable ? () => onSelectInstance(i) : undefined}
              disabled={!isAvailable}
              className={[
                "group relative flex flex-col justify-between rounded-xl border text-left transition-all duration-150",
                !isAvailable ? "cursor-not-allowed opacity-45" : "cursor-pointer",
                isSelected
                  ? "border-blue-500/90 bg-[#161a29] shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50"
                  : "border-zinc-800/90 bg-[#131317] hover:border-zinc-700 hover:bg-[#18181f]",
              ].join(" ")}
            >
              {/* Selected badge */}
              {isSelected && (
                <span className="absolute right-3.5 top-3.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 shadow-sm">
                  <Check className="size-2.5 stroke-[3] text-white" />
                </span>
              )}

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 pr-5">
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">{i.name}</div>
                    <div className="font-mono text-[10px] text-zinc-500 mt-0.5 truncate max-w-[200px]" title={i.id}>
                      {i.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Device Type Tag — attached by the backend */}
                    {deviceType && (
                      <span className="rounded bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 flex items-center gap-1">
                        <Cpu className="size-2.5" />
                        {deviceType}
                      </span>
                    )}
                    {/* Vendor Tag — attached by the backend */}
                    {i.vendor && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${vendorColor}`}>
                        {i.vendor}
                      </span>
                    )}
                  </div>
                </div>

                {/* Extensive Specs — only fields the backend provides */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {i.vram_gb !== undefined && (
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <HardDrive className="size-3.5 text-zinc-500 shrink-0" />
                      <span className="font-medium">{i.vram_gb} GB VRAM</span>
                    </div>
                  )}
                  {i.cpu_cores !== undefined && (
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Cpu className="size-3.5 text-zinc-500 shrink-0" />
                      <span>{i.cpu_cores} vCPUs</span>
                    </div>
                  )}
                  {i.ram_gb !== undefined && (
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Server className="size-3.5 text-zinc-500 shrink-0" />
                      <span>{i.ram_gb} GB RAM</span>
                    </div>
                  )}
                  {i.available !== undefined && (
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      <span>{i.available} node{i.available !== 1 ? "s" : ""} free</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Low VRAM Warning */}
              {!hasEnoughVram && (
                <div className="flex items-center gap-2 border-t border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-400">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>VRAM too low (~{Math.ceil(requiredVram)} GB needed)</span>
                </div>
              )}

              {/* Price Footer */}
              <div className="flex items-center justify-between border-t border-zinc-800/80 px-4 py-2.5 bg-[#0e0e12]/60 rounded-b-xl">
                <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                  <Globe className="size-3" />
                  <span>{i.location || "On-Demand"}</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-sm font-semibold text-zinc-100">
                    {i.price !== undefined ? `$${i.price}` : "—"}
                  </span>
                  <span className="text-[10px] text-zinc-500">/hr</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    )}
  </div>
);

export default ComputeInstancesList;
