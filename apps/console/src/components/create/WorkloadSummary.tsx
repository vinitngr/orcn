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
    <aside className="workload-summary sticky top-6 rounded-xl border border-[var(--dm-card-border)] bg-[var(--dm-panel)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-main)]">
            Workload Summary
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Review your template, compute and runtime settings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowJSON((value) => !value)}
          className="shrink-0 text-[11px] text-[var(--text-muted)] transition hover:text-[var(--text-muted)]"
        >
          {showJSON ? "Summary" : "JSON"}
        </button>
      </div>
      {showJSON ? (
        <pre className="mt-5 max-h-[520px] overflow-auto rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-card)] p-3 text-[10px] leading-relaxed text-[var(--text-muted)]">
          {JSON.stringify(generateFinalSpec(), null, 2)}
        </pre>
      ) : (
        <div className="mt-5 space-y-5">
          <section className="border-t border-[var(--dm-card-border)]/80 pt-4">
            <div className="mb-2.5 text-xs font-medium text-[var(--text-muted)]">
              Template
            </div>
            {template ? (
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-card)] text-blue-400">
                  <Container className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-[var(--text-main)]">
                    {template.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                    {template.computeType || template.compute_type || "CPU"}{" "}
                    container template
                  </span>
                </span>
              </div>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">
                No template selected
              </span>
            )}
          </section>
          <section className="border-t border-[var(--dm-card-border)]/80 pt-4">
            <div className="mb-2.5 text-xs font-medium text-[var(--text-muted)]">
              Compute
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-card)] p-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-inset)]">
                  <Box className="size-4 text-[var(--text-muted)]" />
                </span>
                <span>
                  <span className="block text-xs font-medium text-[var(--text-main)]">
                    {instance?.name || "Not selected"}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                    {formData.provider
                      ? `${formData.provider.charAt(0).toUpperCase()}${formData.provider.slice(1)}`
                      : "-"}
                    {instance?.vram_gb ? ` • ${instance.vram_gb} GB VRAM` : ""}
                  </span>
                </span>
              </div>
              <ChevronRight className="size-4 text-[var(--text-muted)]" />
            </div>
          </section>
          <section className="border-t border-[var(--dm-card-border)]/80 pt-4">
            <div className="mb-2.5 text-xs font-medium text-[var(--text-muted)]">
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
          <section className="border-t border-[var(--dm-card-border)]/80 pt-4">
            <div className="mb-2.5 text-xs font-medium text-[var(--text-muted)]">
              Containers
            </div>
            {(formData.containers || []).length ? (
              <div className="space-y-2">
                {formData.containers.map((container: any, index: number) => (
                  <div
                    key={`${container.id}-${index}`}
                    className="rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-card)] px-3 py-2"
                  >
                    <div className="truncate text-xs font-medium text-[var(--text-main)]">
                      {container.id || `container-${index + 1}`}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-muted)]">
                      {container.image || "No image"}
                    </div>
                    {(container.mounts || []).length > 0 && (
                      <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                        {container.mounts.length} volume mount
                        {container.mounts.length === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">
                No containers configured
              </span>
            )}
          </section>
          <section className="border-t border-[var(--dm-card-border)]/80 pt-4">
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
              Endpoint <Info className="size-3 text-[var(--text-muted)]" />
            </div>
            <p className="mb-2.5 text-[11px] text-[var(--text-muted)]">
              Generated after deployment
            </p>
            <div className="flex h-9 items-center rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-card)] px-3 font-mono text-xs text-[var(--text-muted)]">
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
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="truncate text-right font-medium text-[var(--text-main)]">
        {value}
      </span>
    </div>
  );
}
