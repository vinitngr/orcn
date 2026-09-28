"use client";

import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Select Model" },
  { id: 2, label: "Select Compute" },
  { id: 3, label: "Deployment Config" },
];

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const done = currentStep > step.id;
        const active = currentStep === step.id;

        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => onStepClick?.(step.id)}
              disabled={step.id > currentStep}
              className={[
                "flex items-center gap-2.5 transition-colors duration-150",
                step.id > currentStep ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              {/* Rounded square checkbox */}
              <span
                className={[
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border text-[10px] font-semibold transition-all duration-150",
                  done || active
                    ? "border-blue-500 bg-blue-500/10 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                    : "border-zinc-700 bg-zinc-900/60 text-zinc-500",
                ].join(" ")}
              >
                {done ? (
                  <Check className="size-2.5 stroke-[3] text-blue-400" />
                ) : active ? (
                  <span className="size-1.5 rounded-[1px] bg-blue-400" />
                ) : null}
              </span>

              {/* Label */}
              <span
                className={[
                  "text-xs font-medium whitespace-nowrap",
                  active
                    ? "text-zinc-100"
                    : done
                    ? "text-zinc-300"
                    : "text-zinc-500",
                ].join(" ")}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={[
                  "mx-4 h-px w-12 shrink-0 transition-colors duration-150",
                  currentStep > idx + 1 ? "bg-zinc-600" : "bg-zinc-800",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
