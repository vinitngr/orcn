"use client";

import {
  Box,
  Braces,
  ChevronRight,
  Download,
  Server,
  Plus,
  Terminal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { inputCls } from "./Common";

export function ContainerCard({
  container,
  cIndex,
  updateContainer,
  removeContainer,
  onOpenModal,
}: {
  container: any;
  cIndex: number;
  updateContainer: (index: number, field: string, val: any) => void;
  removeContainer: (index: number) => void;
  onOpenModal: (type: string, containerIndex: number) => void;
}) {
  const tiles = [
    {
      type: "startup",
      title: "Startup Command",
      icon: <Terminal className="size-4 text-[var(--text-muted)]" />,
      count: container.cmd || container.entrypoint ? "Configured" : "Default",
    },
    {
      type: "mounts",
      title: "Volume Mounts",
      icon: <Box className="size-4 text-[var(--text-muted)]" />,
      count: (container.mounts || []).length,
    },
    {
      type: "ports",
      title: "Exposed Ports",
      icon: <Server className="size-4 text-[var(--text-muted)]" />,
      count: (container.ports || []).length,
    },
    {
      type: "env",
      title: "Environment Variables",
      icon: <Braces className="size-4 text-[var(--text-muted)]" />,
      count: (container.envVars || []).length,
    },
    {
      type: "resources",
      title: "External Resources",
      icon: <Download className="size-4 text-[var(--text-muted)]" />,
      count: (container.resources || []).length,
    },
  ];

  return (
    <article className="rounded-xl border border-[var(--dm-card-border)] bg-[var(--card-bg)] p-5">
      <div className="mb-5 flex items-end justify-between gap-3 border-b border-[var(--dm-divider)] pb-4">
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Container name
          </span>
          <Input
            value={container.id || ""}
            onChange={(e) => updateContainer(cIndex, "id", e.target.value)}
            placeholder="e.g. ai-master"
            className={inputCls}
          />
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => removeContainer(cIndex)}
          className="border-[var(--dm-card-border)] text-[var(--text-muted)] hover:border-red-500/50 hover:text-red-400"
        >
          <Trash2 className="size, p-1" />
        </Button>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Image
        </span>
        <Input
          value={container.image || ""}
          onChange={(e) => updateContainer(cIndex, "image", e.target.value)}
          placeholder="e.g. ubuntu:latest"
          className={`${inputCls} font-mono`}
        />
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {tiles.map((tile) => (
          <button
            key={tile.type}
            type="button"
            onClick={() => onOpenModal(tile.type, cIndex)}
            className="flex items-center justify-between rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-card-2)] px-3.5 py-3 text-left transition hover:border-[var(--border-hover)]"
          >
            <span className="flex items-center gap-2.5">
              {tile.icon}
              <span className="text-xs font-medium text-[var(--text-main)]">
                {tile.title}
              </span>
              <span className="rounded-full border border-[var(--dm-card-border)] bg-[var(--dm-inset)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                {tile.count}
              </span>
            </span>
            <ChevronRight className="size-3.5 text-[var(--text-muted)]" />
          </button>
        ))}
      </div>
    </article>
  );
}
