"use client";

import { useState } from "react";
import { Box, ChevronRight, Container, Info, Loader2 } from "lucide-react";

interface WorkloadSummaryProps {
  formData: any;
  templates: any[];
  isDeploying: boolean;
  handleDeploy: () => void;
  generateFinalSpec: () => unknown;
  currentStep: number;
  onNext: () => void;
  canNext: boolean;
}

export function WorkloadSummary({
  formData,
  templates,
  isDeploying,
  handleDeploy,
  generateFinalSpec,
  currentStep,
  onNext,
  canNext,
}: WorkloadSummaryProps) {
  const [showJSON, setShowJSON] = useState(false);
  const template = templates.find((item) => item.id === formData.templateId);
  const instance = formData.instance;

  return (
    <aside className="workload-summary sticky top-6 rounded-xl border border-zinc-800 bg-[var(--dm-panel)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">
            Workload Summary
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Review your template, compute and runtime settings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowJSON((value) => !value)}
          className="shrink-0 text-[11px] text-zinc-500 transition hover:text-zinc-300"
        >
          {showJSON ? "Summary" : "JSON"}
        </button>
      </div>
      {showJSON ? (
        <pre className="mt-5 max-h-[520px] overflow-auto rounded-lg border border-zinc-800 bg-[var(--dm-card)] p-3 text-[10px] leading-relaxed text-zinc-300">
          {JSON.stringify(generateFinalSpec(), null, 2)}
        </pre>
      ) : (
        <div className="mt-5 space-y-5">
          <section className="border-t border-zinc-800/80 pt-4">
            <div className="mb-2.5 text-xs font-medium text-zinc-400">
              Template
            </div>
            {template ? (
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-[var(--dm-card)] text-blue-400">
                  <Container className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-zinc-100">
                    {template.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-zinc-500">
                    {template.computeType || template.compute_type || "CPU"}{" "}
                    container template
                  </span>
                </span>
              </div>
            ) : (
              <span className="text-xs text-zinc-500">
                No template selected
              </span>
            )}
          </section>
          <section className="border-t border-zinc-800/80 pt-4">
            <div className="mb-2.5 text-xs font-medium text-zinc-400">
              Compute
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[var(--dm-card)] p-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-[var(--dm-inset)]">
                  <Box className="size-4 text-zinc-300" />
                </span>
                <span>
                  <span className="block text-xs font-medium text-zinc-200">
                    {instance?.name || "Not selected"}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-zinc-500">
                    {formData.provider
                      ? `${formData.provider.charAt(0).toUpperCase()}${formData.provider.slice(1)}`
                      : "-"}
                    {instance?.vram_gb ? ` • ${instance.vram_gb} GB VRAM` : ""}
                  </span>
                </span>
              </div>
              <ChevronRight className="size-4 text-zinc-600" />
            </div>
          </section>
          <section className="border-t border-zinc-800/80 pt-4">
            <div className="mb-2.5 text-xs font-medium text-zinc-400">
              Workload
            </div>
            <div className="space-y-2">
              <Row label="Name" value={formData.workloadName || "-"} />
              <Row label="Replicas" value={`${formData.replicas || 1}`} />
              <Row
                label="Provider storage"
                value={
                  formData.provider === "nosana"
                    ? "Network managed"
                    : formData.volumeSizeGb
                      ? `${formData.volumeSizeGb} GB`
                      : "Provider managed"
                }
              />
              <Row
                label="Estimated cost"
                value={instance ? `$${instance.price}/h` : "-"}
              />
            </div>
          </section>
          <section className="border-t border-zinc-800/80 pt-4">
            <div className="mb-2.5 text-xs font-medium text-zinc-400">
              Containers
            </div>
            {(formData.containers || []).length ? (
              <div className="space-y-2">
                {formData.containers.map((container: any, index: number) => (
                  <div
                    key={`${container.id}-${index}`}
                    className="rounded-lg border border-zinc-800 bg-[var(--dm-card)] px-3 py-2"
                  >
                    <div className="truncate text-xs font-medium text-zinc-200">
                      {container.id || `container-${index + 1}`}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">
                      {container.image || "No image"}
                    </div>
                    {(container.mounts || []).length > 0 && (
                      <div className="mt-1 text-[10px] text-zinc-500">
                        {container.mounts.length} volume mount
                        {container.mounts.length === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-zinc-500">
                No containers configured
              </span>
            )}
          </section>
          <section className="border-t border-zinc-800/80 pt-4">
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-400">
              Endpoint <Info className="size-3 text-zinc-600" />
            </div>
            <p className="mb-2.5 text-[11px] text-zinc-500">
              Generated after deployment
            </p>
            <div className="flex h-9 items-center rounded-lg border border-zinc-800 bg-[var(--dm-card)] px-3 font-mono text-xs text-zinc-500">
              {formData.workloadName
                ? `${formData.workloadName}.orcn.network`
                : "-"}
            </div>
          </section>
        </div>
      )}
      <div className="mt-6 border-t border-[var(--dm-divider)] pt-4">
        {currentStep < 3 ? (
          <button type="button" onClick={onNext} disabled={!canNext} className="flex h-10 w-full items-center justify-center rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-btn-2)] text-xs font-semibold text-[var(--text-main)] transition hover:bg-[var(--dm-btn-2-hover)] disabled:cursor-not-allowed disabled:opacity-40">{currentStep === 1 ? "Continue to Compute" : "Continue to Containers"}</button>
        ) : (
          <button type="button" onClick={handleDeploy} disabled={!formData.workloadName || !formData.templateId || !instance || isDeploying} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">{isDeploying && <Loader2 className="size-4 animate-spin" />}{isDeploying ? "Deploying..." : "Deploy Workload"}</button>
        )}
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="truncate text-right font-medium text-zinc-200">
        {value}
      </span>
    </div>
  );
}
