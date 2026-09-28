"use client";

import { useState } from "react";
import { Box, ChevronRight, Info, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logos";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComputeInstance } from "@/components/create/instance-utils";
import { ModelDetails } from "./model-types";

interface DeploySummaryProps {
  data: {
    name: string;
    model: string;
    modality: string;
    runtime: string;
    replicas: number;
    provider: string;
    instance: ComputeInstance | null;
    timeoutMinutes?: number;
    strategy?: string;
  };
  modelDetails: ModelDetails | null;
  taskLabel?: string;
  requiredVram: number;
  currentStep: number;
  onDeploy: () => void;
  isDeploying: boolean;
  onNext: () => void;
  canNext: boolean;
}

export function DeploySummary({
  data,
  modelDetails,
  taskLabel,
  requiredVram,
  currentStep,
  onDeploy,
  isDeploying,
  onNext,
  canNext,
}: DeploySummaryProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const modelId = data.model;
  const modelName = modelId ? modelId.split("/").pop() : "";
  const modelOrg = modelDetails?.author || (modelId ? modelId.split("/")[0] : "");

  // Parameters
  const paramsCount = modelDetails?.safetensors?.total
    ? `${(modelDetails.safetensors.total / 1e9).toFixed(0)}B`
    : typeof modelDetails?.parameters === "number"
    ? `${modelDetails.parameters}B`
    : modelId.match(/(\d+)b/i)?.[1]
    ? `${modelId.match(/(\d+)b/i)?.[1]}B`
    : "-";

  // Context
  const contextLength = modelDetails?.config?.max_position_embeddings
    ? `${Math.round(modelDetails.config.max_position_embeddings / 1024)}K`
    : "-";

  // Dtype
  const dtype =
    modelDetails?.config?.torch_dtype ||
    (modelDetails?.safetensors?.parameters
      ? Object.keys(modelDetails.safetensors.parameters)[0]
      : modelDetails?.quantization) ||
    "-";

  // VRAM
  const estVram = `~${Math.ceil(requiredVram || 16)} GB`;

  // Button label
  const getButtonText = () => {
    if (currentStep === 1) return "Continue to Compute";
    if (currentStep === 2) return "Continue to Configuration";
    return "Deploy Model";
  };

  const isFinalStep = currentStep === 3;

  return (
    <aside className="sticky top-6 flex flex-col rounded-xl border border-zinc-800 bg-[#0d0d10] p-5 shadow-sm">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">Deployment Summary</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          Configure your model, compute and deployment settings.
        </p>
      </div>

      <div className="mt-5 space-y-5">
        {/* Model Section */}
        <div className="border-t border-zinc-800/80 pt-4">
          <div className="mb-2.5 text-xs font-medium text-zinc-400">Model</div>

          {modelId ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-[#131317] p-1.5">
                  <Logo name={modelOrg} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-zinc-100" title={modelName}>
                    {modelName}
                  </div>
                  <div className="truncate font-mono text-[10px] text-zinc-500" title={modelId}>
                    {modelId}
                  </div>
                </div>
              </div>

              {/* Badges */}
              {(taskLabel || data.runtime) && (
                <div className="flex flex-wrap gap-1.5">
                  {taskLabel && (
                    <span className="rounded bg-[#131317] px-2 py-0.5 text-[10px] font-medium text-zinc-300 border border-zinc-800/80">
                      {taskLabel}
                    </span>
                  )}
                  {data.runtime && (
                    <span className="rounded bg-[#131317] px-2 py-0.5 text-[10px] font-medium text-zinc-300 border border-zinc-800/80">
                      {data.runtime}
                    </span>
                  )}
                </div>
              )}

              {/* Rows */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Parameters</span>
                  <span className="font-medium text-zinc-200">{paramsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Context Length</span>
                  <span className="font-medium text-zinc-200">{contextLength}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Dtype</span>
                  <span className="font-medium capitalize text-zinc-200">{dtype}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Est. VRAM</span>
                  <span className="font-medium text-zinc-200">{estVram}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-500">No model selected</div>
          )}
        </div>

        {/* Compute Section */}
        <div className="border-t border-zinc-800/80 pt-4">
          <div className="mb-2.5 text-xs font-medium text-zinc-400">Compute</div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#131317] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-[#0e0e12] text-zinc-400">
                <Box className="size-4 text-zinc-300" />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-200">
                  {data.instance ? data.instance.name : "Not selected"}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {data.provider ? data.provider.charAt(0).toUpperCase() + data.provider.slice(1) : "-"}
                  {data.instance?.vram_gb && ` • ${data.instance.vram_gb} GB VRAM`}
                </div>
              </div>
            </div>
            <ChevronRight className="size-4 text-zinc-600" />
          </div>
        </div>

        {/* Deployment Section */}
        <div className="border-t border-zinc-800/80 pt-4">
          <div className="mb-2.5 text-xs font-medium text-zinc-400">Deployment</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Name</span>
              <span className="font-medium text-zinc-200">{data.name || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Replicas</span>
              <span className="font-medium text-zinc-200">{data.replicas || 1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Recovery Strategy</span>
              <span className="font-medium text-zinc-200">{data.strategy || "EXTEND"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Estimated Cost</span>
              <span className="font-medium text-zinc-200">
                {data.instance ? `$${data.instance.price}/h` : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Endpoint Section */}
        <div className="border-t border-zinc-800/80 pt-4">
          <div className="mb-1 text-xs font-medium text-zinc-400">Endpoint</div>
          <div className="mb-2.5 flex items-center gap-1 text-[11px] text-zinc-500">
            <span>Generated after deployment</span>
            <Info className="size-3 text-zinc-500" />
          </div>
          <div className="h-9 rounded-lg border border-zinc-800 bg-[#131317] px-3 flex items-center text-xs text-zinc-500 font-mono">
            {data.name ? `${data.name}.orcn.network` : "-"}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6 border-t border-zinc-800/80 pt-4">
        {isFinalStep ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={isDeploying || !canNext}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDeploying ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Deploying...</span>
              </>
            ) : (
              <span>Deploy AI Model</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-800/90 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {getButtonText()}
          </button>
        )}
      </div>

      {/* Launch Confirmation */}
      <Dialog open={confirmOpen} onOpenChange={(open: boolean) => setConfirmOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Launch deployment?</DialogTitle>
            <DialogDescription>
              Nodes will be provisioned on the provider network and your endpoint allocated. Billing starts as soon as
              the instance is up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Model</span>
              <span className="max-w-[220px] truncate font-medium text-zinc-200">{data.model || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Compute</span>
              <span className="font-medium text-zinc-200">
                {data.instance ? data.instance.name : "-"}
                {data.instance?.vram_gb ? ` • ${data.instance.vram_gb} GB` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Replicas</span>
              <span className="font-medium text-zinc-200">{data.replicas || 1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Est. Cost</span>
              <span className="font-medium text-zinc-200">
                {data.instance ? `$${data.instance.price}/h` : "-"}
              </span>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="flex h-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-800/90 px-4 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                onDeploy();
              }}
              disabled={isDeploying || !canNext}
              className="flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Launching...</span>
                </>
              ) : (
                <span>Launch now</span>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
