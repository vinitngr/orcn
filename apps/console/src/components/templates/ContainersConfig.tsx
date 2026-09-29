"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { DashedAddButton } from "./containers/Common";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContainerCard } from "./containers/ContainerCard";
import { StartupModalContent } from "./containers/StartupModalContent";
import { MountsModalContent } from "./containers/MountsModalContent";
import { PortsModalContent } from "./containers/PortsModalContent";
import { EnvModalContent } from "./containers/EnvModalContent";
import { ResourcesModalContent } from "./containers/ResourcesModalContent";
import type { ContainerHelpers } from "./containers/types";

const MODAL_CONFIG: Record<
  string,
  { title: string; description: string; className: string }
> = {
  mounts: {
    title: "Volume Mounts",
    description: "Mount persistent storage volumes to specific paths inside the container.",
    className: "sm:max-w-xl",
  },
  ports: {
    title: "Exposed Ports",
    description: "Expose container ports to the node or the public internet.",
    className: "sm:max-w-xl",
  },
  env: {
    title: "Environment Variables",
    description: "Inject configuration directly into the container's environment.",
    className: "sm:max-w-xl",
  },
  startup: {
    title: "Startup Command",
    description: "Override the default entrypoint or command arguments for the Docker container.",
    className: "sm:max-w-xl",
  },
    resources: {
      title: "External Resources",
      description: "Auto-download models, LoRAs, or config files before the container starts.",
      className: "sm:max-w-2xl",
    },
};

export function ContainersConfig({ data, updateData }: any) {
  const containers = data.containers || [];
  const nodeVolumes = data.volumes || [];
  const [activeModal, setActiveModal] = useState<{
    type: string;
    containerIndex: number;
  } | null>(null);

  const addContainer = () => {
    updateData({
      containers: [
        ...containers,
        {
          id: `container-${containers.length + 1}`,
          image: "",
          entrypoint: "",
          cmd: "",
          gpu: true,
          envVars: [],
          ports: [],
          mounts: [],
          resources: [],
        },
      ],
    });
  };

  const updateContainer = (index: number, field: string, val: any) => {
    const newContainers = [...containers];
    newContainers[index] = { ...newContainers[index], [field]: val };
    updateData({ containers: newContainers });
  };

  const removeContainer = (index: number) => {
    updateData({
      containers: containers.filter((_: any, i: number) => i !== index),
    });
  };

  const addArrayItem = (cIndex: number, field: string, defaultItem: any) => {
    const newArr = [...(containers[cIndex][field] || []), defaultItem];
    updateContainer(cIndex, field, newArr);
  };

  const updateArrayItem = (
    cIndex: number,
    field: string,
    iIndex: number,
    itemField: string,
    val: any,
  ) => {
    const newArr = [...containers[cIndex][field]];
    if (itemField) newArr[iIndex] = { ...newArr[iIndex], [itemField]: val };
    else newArr[iIndex] = val;
    updateContainer(cIndex, field, newArr);
  };

  const removeArrayItem = (cIndex: number, field: string, iIndex: number) => {
    updateContainer(
      cIndex,
      field,
      containers[cIndex][field].filter((_: any, i: number) => i !== iIndex),
    );
  };

  const helpers: ContainerHelpers = {
    updateContainer,
    addArrayItem,
    updateArrayItem,
    removeArrayItem,
  };

  let modalBody: ReactNode = null;
  if (activeModal) {
    const cIndex = activeModal.containerIndex;
    const container = containers[cIndex];
    if (activeModal.type === "startup")
      modalBody = (
        <StartupModalContent
          container={container}
          cIndex={cIndex}
          helpers={helpers}
        />
      );
    else if (activeModal.type === "mounts")
      modalBody = (
        <MountsModalContent
          container={container}
          cIndex={cIndex}
          nodeVolumes={nodeVolumes}
          helpers={helpers}
        />
      );
    else if (activeModal.type === "ports")
      modalBody = (
        <PortsModalContent
          container={container}
          cIndex={cIndex}
          helpers={helpers}
        />
      );
    else if (activeModal.type === "env")
      modalBody = (
        <EnvModalContent
          container={container}
          cIndex={cIndex}
          helpers={helpers}
        />
      );
    else
      modalBody = (
        <ResourcesModalContent
          container={container}
          cIndex={cIndex}
          helpers={helpers}
        />
      );
  }

  const config = activeModal ? MODAL_CONFIG[activeModal.type] : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-main)]">
            Containers
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Define one or multiple containers to run inside this deployment.
          </p>
        </div>
        <DashedAddButton onClick={addContainer} text="Add container" />
      </div>

      {containers.length === 0 ? (
        <button
          type="button"
          onClick={addContainer}
          className="flex w-full flex-col items-center rounded-xl border border-dashed border-[var(--border-hover)] bg-[var(--dm-card)]/50 p-10 text-center transition hover:border-blue-500/70 hover:bg-[var(--dm-card)]"
        >
          <Plus className="mb-2 size-5 text-[var(--text-muted)]" />
          <span className="text-xs font-medium text-[var(--text-main)]">
            Add your first container
          </span>
          <span className="mt-1 text-[11px] text-[var(--text-muted)]">
            Start with an image, then add only the settings it needs.
          </span>
        </button>
      ) : (
        <div className="space-y-4">
          {containers.map((container: any, cIndex: number) => (
            <ContainerCard
              key={cIndex}
              container={container}
              cIndex={cIndex}
              updateContainer={updateContainer}
              removeContainer={removeContainer}
              onOpenModal={(type, containerIndex) =>
                setActiveModal({ type, containerIndex })
              }
            />
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(activeModal)}
        onOpenChange={(open: boolean) => {
          if (!open) setActiveModal(null);
        }}
      >
        {config && (
          <DialogContent
            className={`${config.className} bg-[var(--dm-card)] border border-[var(--dm-card-border)]`}
          >
            <DialogHeader>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription>{config.description}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">{modalBody}</div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Done</Button>} />
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
