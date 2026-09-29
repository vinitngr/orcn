"use client";

import { type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
interface WorkloadContainersStepProps {
  data: any;
  updateData: (data: any) => void;
}

export function WorkloadContainersStep({
  data,
  updateData,
}: WorkloadContainersStepProps) {
  const containers = data.containers || [];
  const updateContainer = (index: number, patch: Record<string, unknown>) =>
    updateData({
      containers: containers.map((container: any, itemIndex: number) =>
        itemIndex === index ? { ...container, ...patch } : container,
      ),
    });
  const removeContainer = (index: number) =>
    updateData({
      containers: containers.filter(
        (_: unknown, itemIndex: number) => itemIndex !== index,
      ),
    });
  const addContainer = () =>
    updateData({
      containers: [
        ...containers,
        {
          id: `container-${containers.length + 1}`,
          image: "",
          entrypoint: "",
          cmd: "",
          gpu: false,
          envVars: [],
          ports: [],
          mounts: [],
          resources: [],
        },
      ],
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">
            Container configuration
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Define the images, commands and runtime settings for this workload.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={addContainer}>
          <Plus className="mr-1 size-3.5" /> Add container
        </Button>
      </div>
      {containers.length === 0 ? (
        <button
          type="button"
          onClick={addContainer}
          className="flex w-full flex-col items-center rounded-xl border border-dashed border-zinc-700 bg-[var(--dm-card)] p-10 text-center transition hover:border-blue-500/70 hover:bg-[var(--dm-card)]"
        >
          <Plus className="mb-2 size-5 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-200">
            Add your first container
          </span>
          <span className="mt-1 text-[11px] text-zinc-500">
            Start with an image, then add only the settings it needs.
          </span>
        </button>
      ) : (
        <div className="space-y-4">
          {containers.map((container: any, index: number) => (
            <ContainerCard
              key={`${container.id}-${index}`}
              container={container}
              index={index}
              volumes={data.volumes || []}
              onUpdate={updateContainer}
              onRemove={removeContainer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContainerCard({
  container,
  index,
  volumes,
  onUpdate,
  onRemove,
}: {
  container: any;
  index: number;
  volumes: any[];
  onUpdate: (index: number, patch: Record<string, unknown>) => void;
  onRemove: (index: number) => void;
}) {
  const envVars = container.envVars || [];
  const ports = container.ports || [];
  const mounts = container.mounts || [];
  const updateEnv = (
    itemIndex: number,
    field: "key" | "value",
    value: string,
  ) =>
    onUpdate(index, {
      envVars: envVars.map((item: any, currentIndex: number) =>
        currentIndex === itemIndex ? { ...item, [field]: value } : item,
      ),
    });

  return (
    <article className="rounded-xl border border-zinc-800 bg-[var(--dm-card)] p-5">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Container name
          </label>
          <Input
            value={container.id || ""}
            onChange={(event) => onUpdate(index, { id: event.target.value })}
            placeholder="e.g. api"
            className="h-9 border-zinc-800 bg-[var(--dm-input)] text-xs text-zinc-100"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRemove(index)}
          className="mt-5 border-zinc-800 text-zinc-400 hover:border-red-500/50 hover:text-red-400"
        >
          <Trash2 className="size, p-1" />
        </Button>
      </div>
      <div className="space-y-5">
        <Field label="Container image">
          <Input
            value={container.image || ""}
            onChange={(event) => onUpdate(index, { image: event.target.value })}
            placeholder="e.g. ghcr.io/org/api:latest"
            className="h-9 border-zinc-800 bg-[var(--dm-input)] font-mono text-xs text-zinc-100"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Entrypoint">
            <Input
              value={container.entrypoint || ""}
              onChange={(event) =>
                onUpdate(index, { entrypoint: event.target.value })
              }
              placeholder="Optional"
              className="h-9 border-zinc-800 bg-[var(--dm-input)] font-mono text-xs text-zinc-100"
            />
          </Field>
          <Field label="Command">
            <Input
              value={container.cmd || ""}
              onChange={(event) => onUpdate(index, { cmd: event.target.value })}
              placeholder="Optional arguments"
              className="h-9 border-zinc-800 bg-[var(--dm-input)] font-mono text-xs text-zinc-100"
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Settings
            label="Environment"
            value={`${envVars.length} variable${envVars.length === 1 ? "" : "s"}`}
          />
          <Settings label="Ports" value={`${ports.length} exposed`} />
          <Settings label="Mounts" value={`${mounts.length} attached`} />
        </div>
        {envVars.length > 0 && (
          <div className="space-y-2 rounded-lg border border-zinc-800 bg-[var(--dm-input)] p-3">
            {envVars.map((item: any, itemIndex: number) => (
              <div
                key={itemIndex}
                className="grid grid-cols-[1fr_1fr_auto] gap-2"
              >
                <Input
                  value={item.key || ""}
                  onChange={(event) =>
                    updateEnv(itemIndex, "key", event.target.value)
                  }
                  placeholder="KEY"
                  className="h-8 border-zinc-800 bg-[var(--dm-card)] font-mono text-xs"
                />
                <Input
                  value={item.value || ""}
                  onChange={(event) =>
                    updateEnv(itemIndex, "value", event.target.value)
                  }
                  placeholder="value"
                  className="h-8 border-zinc-800 bg-[var(--dm-card)] font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onUpdate(index, {
                      envVars: envVars.filter(
                        (_: unknown, currentIndex: number) =>
                          currentIndex !== itemIndex,
                      ),
                    })
                  }
                  className="h-8 border-zinc-800 px-2"
                >
                    <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onUpdate(index, {
                  envVars: [...envVars, { key: "", value: "" }],
                })
              }
              className="h-8 border-zinc-800 text-xs"
            >
              <Plus className="mr-1 size-3" /> Add variable
            </Button>
          </div>
        )}
        {mounts.length > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-[var(--dm-input)] p-3 text-[11px] text-zinc-500">
            {mounts.map((mount: any, mountIndex: number) => (
              <div key={mountIndex} className="flex justify-between py-1">
                <span>{mount.volumeName || "Volume"}</span>
                <span className="font-mono text-zinc-400">
                  {mount.mountPath || "No path"}
                </span>
              </div>
            ))}
            {volumes.length === 0 && (
              <span>No node volumes are defined by this template.</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
function Settings({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[var(--dm-input)] p-3">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-1 text-xs font-medium text-zinc-200">{value}</div>
    </div>
  );
}
