"use client";

import { Logo } from "@/components/ui/Logos";
import { Info } from "lucide-react";
import { ComputeInstance } from "@/components/create/instance-utils";
import { ModelDetails } from "./model-types";

interface ReviewPanelProps {
  data: {
    name: string;
    model: string;
    modality: string;
    runtime: string;
    replicas: number;
    provider: string;
    instance: ComputeInstance | null;
  };
  modelDetails: ModelDetails | null;
  requiredVram: number;
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-zinc-800/80 last:border-0">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="text-xs font-medium text-zinc-200 text-right">{value ?? "—"}</span>
    </div>
  );
}

export function ReviewPanel({ data, modelDetails, requiredVram }: ReviewPanelProps) {
  const modelName = data.model ? data.model.split("/").pop() : "—";
  const modelOrg = modelDetails?.author || (data.model ? data.model.split("/")[0] : "");

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#121215] p-6 shadow-sm space-y-6">
      <p className="text-xs text-zinc-400">
        Review your configuration before deploying. Once launched, an endpoint will be allocated on the Nosana Network.
      </p>

      {/* Model section */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#18181c] p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Model
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 p-1.5">
            <Logo name={modelOrg || "model"} size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-200">{modelName}</div>
            <div className="text-[11px] font-mono text-zinc-500">{data.model || "—"}</div>
          </div>
        </div>
        <div className="divide-y divide-zinc-800/80">
          <ReviewRow label="Modality" value={data.modality} />
          <ReviewRow label="Runtime" value={data.runtime} />
          <ReviewRow
            label="Est. VRAM"
            value={requiredVram > 0 ? `~${Math.ceil(requiredVram)} GB` : "—"}
          />
        </div>
      </div>

      {/* Compute section */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#18181c] p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Compute
        </div>
        {data.instance ? (
          <div className="divide-y divide-zinc-800/80">
            <ReviewRow label="Instance" value={data.instance.name} />
            <ReviewRow
              label="VRAM"
              value={data.instance.vram_gb ? `${data.instance.vram_gb} GB` : "—"}
            />
            <ReviewRow label="Price" value={`$${data.instance.price}/h`} />
            <ReviewRow label="Network" value="Nosana" />
          </div>
        ) : (
          <p className="text-xs text-zinc-500">No compute selected.</p>
        )}
      </div>

      {/* Deployment section */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#18181c] p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Deployment
        </div>
        <div className="divide-y divide-zinc-800/80">
          <ReviewRow label="Name" value={data.name || "—"} />
          <ReviewRow label="Replicas" value={data.replicas} />
          <ReviewRow label="Auto Scaling" value="Disabled" />
          <ReviewRow label="Distribution" value="On-demand" />
        </div>
      </div>

      {/* Endpoint Notice */}
      <div className="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400">
        <Info className="size-4 shrink-0 text-zinc-500 mt-0.5" />
        <p className="leading-relaxed">
          Your live endpoint URL and credentials will be generated after deployment and displayed on the deployment details page.
        </p>
      </div>
    </div>
  );
}
