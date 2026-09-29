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

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--dm-divider)] last:border-0">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="text-xs font-medium text-[var(--dm-text-2)] text-right">
        {value ?? "—"}
      </span>
    </div>
  );
}

export function ReviewPanel({
  data,
  modelDetails,
  requiredVram,
}: ReviewPanelProps) {
  const modelName = data.model ? data.model.split("/").pop() : "—";
  const modelOrg =
    modelDetails?.author || (data.model ? data.model.split("/")[0] : "");

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--dm-panel-alt)] p-6 shadow-sm space-y-6">
      <p className="text-xs text-[var(--text-muted)]">
        Review your configuration before deploying. Once launched, an endpoint
        will be allocated on the Nosana Network.
      </p>

      {/* Model section */}
      <div className="rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card-2)] p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-light)]">
          Model
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--dm-logo-solid)] p-1.5">
            <Logo name={modelOrg || "model"} size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--dm-text-2)]">
              {modelName}
            </div>
            <div className="text-[11px] font-mono text-[var(--text-light)]">
              {data.model || "—"}
            </div>
          </div>
        </div>
        <div className="divide-y divide-[var(--dm-divider)]">
          <ReviewRow label="Modality" value={data.modality} />
          <ReviewRow label="Runtime" value={data.runtime} />
          <ReviewRow
            label="Est. VRAM"
            value={requiredVram > 0 ? `~${Math.ceil(requiredVram)} GB` : "—"}
          />
        </div>
      </div>

      {/* Compute section */}
      <div className="rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card-2)] p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-light)]">
          Compute
        </div>
        {data.instance ? (
          <div className="divide-y divide-[var(--dm-divider)]">
            <ReviewRow label="Instance" value={data.instance.name} />
            <ReviewRow
              label="VRAM"
              value={
                data.instance.vram_gb ? `${data.instance.vram_gb} GB` : "—"
              }
            />
            <ReviewRow label="Price" value={`$${data.instance.price}/h`} />
            <ReviewRow label="Network" value="Nosana" />
          </div>
        ) : (
          <p className="text-xs text-[var(--text-light)]">
            No compute selected.
          </p>
        )}
      </div>

      {/* Deployment section */}
      <div className="rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card-2)] p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-light)]">
          Deployment
        </div>
        <div className="divide-y divide-[var(--dm-divider)]">
          <ReviewRow label="Name" value={data.name || "—"} />
          <ReviewRow label="Replicas" value={data.replicas} />
          <ReviewRow label="Auto Scaling" value="Disabled" />
          <ReviewRow label="Distribution" value="On-demand" />
        </div>
      </div>

      {/* Endpoint Notice */}
      <div className="flex items-start gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--dm-tag)] p-3 text-xs text-[var(--text-muted)]">
        <Info className="size-4 shrink-0 text-[var(--text-light)] mt-0.5" />
        <p className="leading-relaxed">
          Your live endpoint URL and credentials will be generated after
          deployment and displayed on the deployment details page.
        </p>
      </div>
    </div>
  );
}
