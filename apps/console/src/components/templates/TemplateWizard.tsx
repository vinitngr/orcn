"use client";

import { Code2, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WorkflowStepIndicator } from "@/components/create/WorkflowStepIndicator";
import { BasicConfig } from "./BasicConfig";
import { CompatibilityConfig } from "./CompatibilityConfig";
import { NodeVolumesConfig } from "./NodeVolumesConfig";
import { ContainersConfig } from "./ContainersConfig";
import { ReadmeConfig } from "./ReadmeConfig";

const STEPS = [
  "General setup",
  "Requirements",
  "Storage",
  "Containers",
  "Documentation",
];

interface TemplateWizardProps {
  data: any;
  updateData: (data: any) => void;
  currentStep: number;
  onStepChange: (step: number) => void;
  viewMode: "wizard" | "spec";
  onViewModeChange: (mode: "wizard" | "spec") => void;
  rawSpec: string;
  onRawSpecChange: (value: string) => void;
  generateSpec: (data: any) => any;
}

export function TemplateWizard({
  data,
  updateData,
  currentStep,
  onStepChange,
  viewMode,
  onViewModeChange,
  rawSpec,
  onRawSpecChange,
  generateSpec,
}: TemplateWizardProps) {
  const step = currentStep + 1;
  const next = () => onStepChange(Math.min(STEPS.length, step + 1));
  const back = () => onStepChange(Math.max(1, step - 1));
  const openSpec = () => {
    onRawSpecChange(JSON.stringify(generateSpec(data), null, 2));
    onViewModeChange("spec");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <WorkflowStepIndicator
          steps={STEPS}
          currentStep={step}
          onStepClick={(target) => target <= step && onStepChange(target)}
        />
        <div className="flex shrink-0 rounded-lg border border-zinc-800 bg-[var(--dm-panel)] p-1">
          <button
            type="button"
            onClick={() => onViewModeChange("wizard")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${viewMode === "wizard" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <FileText className="size-3.5" /> Builder
          </button>
          <button
            type="button"
            onClick={openSpec}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${viewMode === "spec" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Code2 className="size-3.5" /> JSON
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-[var(--dm-panel)] p-6 shadow-sm">
        {viewMode === "wizard" ? (
          <>
            <div className="mb-6 border-b border-zinc-800 pb-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-blue-400">
                Step {step} of {STEPS.length}
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-100">
                {STEPS[currentStep]}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Define the template once, then use it to create consistent
                workloads.
              </p>
            </div>
            <div className="min-h-[400px]">
              {currentStep === 0 && (
                <BasicConfig data={data} updateData={updateData} />
              )}
              {currentStep === 1 && (
                <CompatibilityConfig data={data} updateData={updateData} />
              )}
              {currentStep === 2 && (
                <NodeVolumesConfig data={data} updateData={updateData} />
              )}
              {currentStep === 3 && (
                <ContainersConfig data={data} updateData={updateData} />
              )}
              {currentStep === 4 && (
                <ReadmeConfig data={data} updateData={updateData} />
              )}
            </div>
            <div className="mt-7 flex justify-between border-t border-zinc-800 pt-5">
              <Button
                size="sm"
                variant="secondary"
                onClick={back}
                disabled={step === 1}
              >
                Back
              </Button>
              <Button size="sm" onClick={next} disabled={step === STEPS.length}>
                {step === STEPS.length ? "Final step" : "Continue"}
              </Button>
            </div>
          </>
        ) : (
          <div className="min-h-[520px]">
            <div className="mb-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-blue-400">
                Advanced
              </div>
              <h2 className="mt-2 text-xl font-semibold text-zinc-100">
                Template JSON
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Edit the generated spec directly when you need fine-grained
                control.
              </p>
            </div>
            <textarea
              value={rawSpec}
              onChange={(event) => onRawSpecChange(event.target.value)}
              className="min-h-[380px] w-full resize-y rounded-lg border border-zinc-800 bg-[var(--dm-card)] p-4 font-mono text-xs text-zinc-200 outline-none focus:border-zinc-700"
              spellCheck={false}
            />
          </div>
        )}
      </section>
    </div>
  );
}
