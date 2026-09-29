"use client";

import { Check } from "lucide-react";

interface WorkflowStepIndicatorProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function WorkflowStepIndicator({
  steps,
  currentStep,
  onStepClick,
}: WorkflowStepIndicatorProps) {
  return (
    <div className="flex flex-wrap items-center gap-y-3">
      {steps.map((label, index) => {
        const step = index + 1;
        const done = currentStep > step;
        const active = currentStep === step;
        const available = step <= currentStep;

        return (
          <div key={label} className="flex items-center">
            <button
              type="button"
              disabled={!available}
              onClick={() => onStepClick?.(step)}
              className={`flex items-center gap-2.5 text-left ${available ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`flex size-4 items-center justify-center rounded-[4px] border text-[10px] ${done || active ? "border-blue-500 bg-blue-500/10 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]" : "border-zinc-700 bg-zinc-900/60"}`}
              >
                {done ? (
                  <Check className="size-2.5 stroke-[3]" />
                ) : active ? (
                  <span className="size-1.5 rounded-[1px] bg-blue-400" />
                ) : null}
              </span>
              <span
                className={`text-xs font-medium ${active ? "text-zinc-100" : done ? "text-zinc-300" : "text-zinc-500"}`}
              >
                {label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={`mx-4 h-px w-10 shrink-0 ${currentStep > step ? "bg-zinc-600" : "bg-zinc-800"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
