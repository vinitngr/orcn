"use client";

import { type ReactNode } from "react";
import { Container, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { WorkflowStepIndicator } from "./WorkflowStepIndicator";
import { ComputePanel } from "@/components/deploy-model/ComputePanel";
import { ContainersConfig } from "@/components/templates/ContainersConfig";

const STEPS = ["Workload", "Compute", "Containers"];

interface WorkloadWorkflowProps {
  data: any;
  templates: any[];
  instances: any[];
  updateData: (data: any) => void;
  onOpenTemplatePicker: () => void;
  step: number;
  onStepChange: (step: number) => void;
}

export function WorkloadWorkflow({
  data,
  templates,
  instances,
  updateData,
  onOpenTemplatePicker,
  step,
  onStepChange,
}: WorkloadWorkflowProps) {
  const selectedTemplate = templates.find(
    (template) => template.id === data.templateId,
  );
  return (
    <div className="space-y-5">
      <WorkflowStepIndicator
        steps={STEPS}
        currentStep={step}
        onStepClick={(target) => target <= step && onStepChange(target)}
      />
      <section className="rounded-xl border border-[var(--dm-card-border)] bg-[var(--dm-panel)] p-6 shadow-sm">
        <div className="mb-6 border-b border-[var(--dm-divider)] pb-5">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
            {STEPS[step - 1]}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {step === 1
              ? "Name this workload and select the reusable template it will run."
              : step === 2
                ? "Choose a provider and instance. Provider-specific requirements appear automatically."
                : "Review and adjust the containers from your chosen template."}
          </p>
        </div>

        {step === 1 && (
          <WorkloadSetupStep
            data={data}
            templates={templates}
            instances={instances}
            updateData={updateData}
            onOpenTemplatePicker={onOpenTemplatePicker}
          />
        )}
        {step === 2 && (
          <ComputePanel
            selectedProvider={data.provider}
            onSelectProvider={(provider) =>
              updateData({ provider, instance: null, providerConfig: {} })
            }
            selectedConnectionId={data.providerConnectionId || ""}
            onSelectConnection={(conn) =>
              updateData({
                provider: conn.Provider,
                providerConnectionId: conn.ID,
                instance: null,
                providerConfig: {},
              })
            }
            instances={instances}
            selectedInstance={data.instance}
            onSelectInstance={(instance) => updateData({ instance })}
            requiredVram={0}
            selectedModel=""
            providerConfig={data.providerConfig || {}}
            onProviderConfigChange={(key, value) =>
              updateData({
                providerConfig: {
                  ...(data.providerConfig || {}),
                  [key]: value,
                },
              })
            }
            volumeSizeGb={data.volumeSizeGb || 50}
            onVolumeSizeGbChange={(volumeSizeGb) =>
              updateData({ volumeSizeGb })
            }
          />
        )}
        {step === 3 && <ContainersConfig data={data} updateData={updateData} />}

      </section>
      {selectedTemplate && (
        <p className="text-xs text-[var(--text-muted)]">
          Using template{" "}
          <span className="text-[var(--text-main)]">
            {selectedTemplate.name}
          </span>
        </p>
      )}
    </div>
  );
}

function WorkloadSetupStep({
  data,
  templates,
  instances,
  updateData,
  onOpenTemplatePicker,
}: Omit<WorkloadWorkflowProps, "step" | "onStepChange">) {
  const selectedTemplate = templates.find(
    (template) => template.id === data.templateId,
  );
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Workload name">
          <Input
            value={data.workloadName || ""}
            onChange={(event) =>
              updateData({
                workloadName: event.target.value.replace(/\//g, "-"),
              })
            }
            placeholder="e.g. prod-backend-api"
            className="h-10 border-[var(--dm-card-border)] bg-[var(--dm-input)] px-3 text-xs text-[var(--text-main)]"
          />
        </Field>
        <Field label="Replicas">
          <Input
            type="number"
            min="1"
            value={data.replicas || 1}
            onChange={(event) =>
              updateData({ replicas: parseInt(event.target.value, 10) || 1 })
            }
            className="h-10 border-[var(--dm-card-border)] bg-[var(--dm-input)] px-3 text-xs text-[var(--text-main)]"
          />
        </Field>
      </div>
      <Field
        label="Template"
      >
        {selectedTemplate ? (
          <button
            type="button"
            onClick={onOpenTemplatePicker}
            className="flex w-full items-center justify-between rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-card)] p-4 text-left transition hover:border-[var(--border-hover)]"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg border border-[var(--dm-divider)] bg-[var(--dm-inset)] text-blue-400">
                <Container className="size-4" />
              </span>
              <span>
                <span className="block text-xs font-semibold text-[var(--text-main)]">
                  {selectedTemplate.name}
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                  {selectedTemplate.computeType ||
                    selectedTemplate.compute_type ||
                    "CPU"}{" "}
                  container template
                </span>
              </span>
            </span>
            <span className="text-xs text-blue-400">Change</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenTemplatePicker}
            className="flex w-full items-center gap-3 rounded-lg border border-dashed border-[var(--border-hover)] bg-[var(--dm-card)]/50 p-5 text-left transition hover:border-blue-500/70 hover:bg-[var(--dm-card)]"
          >
            <span className="flex size-9 items-center justify-center rounded-lg border border-[var(--dm-divider)] bg-[var(--dm-inset)] text-[var(--text-muted)]">
              <Layers className="size-4" />
            </span>
            <span>
              <span className="block text-xs font-semibold text-[var(--text-main)]">
                Choose a template
              </span>
              <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                Select a container configuration to begin.
              </span>
            </span>
          </button>
        )}
      </Field>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-[var(--text-main)]">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-[11px] text-[var(--text-muted)]">
          {hint}
        </span>
      )}
    </label>
  );
}
