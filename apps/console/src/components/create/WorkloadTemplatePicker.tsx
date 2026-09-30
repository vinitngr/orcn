"use client";

import { useRouter } from "next/navigation";
import { Boxes, CalendarDays, Check, Cpu, Plus, Server } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";

interface WorkloadTemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: any[];
  selectedTemplateId: string;
  onSelect: (templateId: string) => void;
}

function parseTemplate(template: any) {
  let parsed: any = {};
  try {
    parsed = typeof template.data === "string" ? JSON.parse(template.data) : template.data || {};
  } catch {
    parsed = {};
  }
  const containers = parsed.containers || [];
  return {
    image: containers?.[0]?.args?.image || "N/A",
    containerCount: containers.length || 1,
    gpu: containers?.[0]?.args?.gpu || false,
    computeType: template.compute_type || template.computeType || "CPU",
    createdAt: template.created_at
      ? new Date(template.created_at).toLocaleDateString()
      : null,
  };
}

export function WorkloadTemplatePicker({
  open,
  onOpenChange,
  templates,
  selectedTemplateId,
  onSelect,
}: WorkloadTemplatePickerProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[90dvh] w-[94vw] max-w-[94vw] translate-x-0 translate-y-0 left-0 top-0 flex-col gap-0 overflow-hidden rounded-2xl border border-[var(--dm-card-border)] bg-[var(--dm-panel)] p-0 text-[var(--text-main)] shadow-2xl ring-0 sm:h-[80vh] sm:w-[80vw] sm:max-w-[80vw] sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--dm-card-border)] px-6 py-5 sm:px-8">
          <div className="min-w-0">
            <DialogTitle className="font-heading text-lg font-semibold text-[var(--text-main)]">
              Choose a template
            </DialogTitle>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Select a container configuration to begin.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              router.push("/templates/create");
            }}
            className="shrink-0"
          >
            <Plus className="size-3.5" />
            Create Template
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => {
              const selected = template.id === selectedTemplateId;
              const { image, containerCount, gpu, computeType, createdAt } =
                parseTemplate(template);
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    onSelect(template.id);
                    onOpenChange(false);
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-blue-500 bg-[var(--dm-selected-2)] ring-1 ring-blue-500/40"
                      : "border-[var(--dm-card-border)] bg-[var(--card-bg)] hover:border-zinc-600 hover:bg-[var(--dm-inset)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-main)]">
                        {template.name || "Untitled template"}
                      </p>
                      <p className="mt-1 truncate font-mono text-[11px] text-[var(--text-muted)]">
                        {image}
                      </p>
                    </div>
                    {selected && <Check className="size-4 shrink-0 text-blue-400" />}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        gpu
                          ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                          : "border-[var(--dm-card-border)] bg-[var(--dm-inset)] text-zinc-400"
                      }`}
                    >
                      {gpu ? <Server className="size-3" /> : <Cpu className="size-3" />}
                      {gpu ? "GPU" : computeType || "CPU"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--dm-card-border)] bg-[var(--dm-inset)] px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                      <Boxes className="size-3" />
                      {containerCount} container{containerCount !== 1 ? "s" : ""}
                    </span>
                    {createdAt && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--dm-card-border)] bg-[var(--dm-inset)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                        <CalendarDays className="size-3" />
                        {createdAt}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {templates.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="text-sm font-medium text-zinc-300">
                No templates available yet.
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Create your first template to get started.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
