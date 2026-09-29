"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeployConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeploying: boolean;
  onConfirm: () => void;
  workloadName: string;
  templateName?: string;
  instance: { name: string; vram_gb?: number; price?: number } | null;
  containerCount: number;
  replicas: number;
}

export function DeployConfirmDialog({
  open,
  onOpenChange,
  isDeploying,
  onConfirm,
  workloadName,
  templateName,
  instance,
  containerCount,
  replicas,
}: DeployConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!isDeploying) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Launch workload?</DialogTitle>
          <DialogDescription>
            Containers will be provisioned on the provider network. Billing
            starts as soon as the instance is up.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Workload</span>
            <span className="max-w-[220px] truncate font-medium text-[var(--text-main)]">
              {workloadName || "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Template</span>
            <span className="max-w-[220px] truncate font-medium text-[var(--text-main)]">
              {templateName || "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Compute</span>
            <span className="font-medium text-[var(--text-main)]">
              {instance ? instance.name : "-"}
              {instance?.vram_gb ? ` • ${instance.vram_gb} GB` : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Containers</span>
            <span className="font-medium text-[var(--text-main)]">
              {containerCount}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Replicas</span>
            <span className="font-medium text-[var(--text-main)]">
              {replicas || 1}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)]">Est. Cost</span>
            <span className="font-medium text-[var(--text-main)]">
              {instance ? `$${instance.price}/h` : "-"}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeploying}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={isDeploying}>
            {isDeploying ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Launching...
              </>
            ) : (
              "Launch now"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
