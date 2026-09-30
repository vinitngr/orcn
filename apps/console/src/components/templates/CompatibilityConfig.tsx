"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/Button";

export function CompatibilityConfig({ data, updateData }: any) {
  const isCpu = data.computeType === "CPU";

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`flex flex-col gap-6 ${isCpu ? "opacity-50 pointer-events-none" : ""}`}
      >
        {isCpu && (
          <div className="p-4 bg-yellow-100/10 text-yellow-500 border border-yellow-500/50 rounded-lg flex items-center gap-3 text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            GPU limits are disabled because this is a CPU‑only template.
          </div>
        )}

        <div>
          <label className="block mb-2 text-sm font-medium text-[var(--text-main)]">
            Minimum VRAM (GB)
          </label>
          <Input
            type="number"
            value={data.minVram || ""}
            onChange={(e) => updateData({ minVram: e.target.value })}
            placeholder="e.g. 16"
            className="w-full rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-input)] px-3 py-2 text-sm text-[var(--text-main)]"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Minimum GPU Memory required to run this template.
          </p>
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-[var(--text-main)]">
            Preferred GPU Models
          </label>
          <Input
            type="text"
            value={data.gpuModel || ""}
            onChange={(e) => updateData({ gpuModel: e.target.value })}
            placeholder="e.g. RTX 4090, A100 (Optional)"
            className="w-full rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-input)] px-3 py-2 text-sm text-[var(--text-main)]"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-[var(--text-main)]">
            Required CUDA Version
          </label>
          <Input
            type="text"
            value={data.cudaVersion || ""}
            onChange={(e) => updateData({ cudaVersion: e.target.value })}
            placeholder="e.g. 12.0"
            className="w-full rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-input)] px-3 py-2 text-sm text-[var(--text-main)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 text-sm font-medium text-[var(--text-main)]">
            Min Cores
          </label>
          <Input
            type="number"
            value={data.minCores || ""}
            onChange={(e) => updateData({ minCores: e.target.value })}
            placeholder="e.g. 4"
            className="w-full rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-input)] px-3 py-2 text-sm text-[var(--text-main)]"
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-[var(--text-main)]">
            Min RAM (GB)
          </label>
          <Input
            type="number"
            value={data.minRam || ""}
            onChange={(e) => updateData({ minRam: e.target.value })}
            placeholder="e.g. 16"
            className="w-full rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-input)] px-3 py-2 text-sm text-[var(--text-main)]"
          />
        </div>
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-[var(--text-main)]">
          Architecture Constraint
        </label>
        <div className="inline-flex border border-[var(--dm-card-border)] rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => updateData({ arch: "any" })}
            className={`px-4 py-2 text-sm font-medium ${!data.arch || data.arch === "any" ? "bg-[var(--text-main)] text-[var(--bg-color)]" : "bg-[var(--surface)] text-[var(--text-main)]"}`}
          >
            Any
          </button>
          <button
            type="button"
            onClick={() => updateData({ arch: "amd64" })}
            className={`px-4 py-2 text-sm font-medium border-l border-[var(--dm-card-border)] ${data.arch === "amd64" ? "bg-[var(--text-main)] text-[var(--bg-color)]" : "bg-[var(--surface)] text-[var(--text-main)]"}`}
          >
            x86 / AMD64
          </button>
          <button
            type="button"
            onClick={() => updateData({ arch: "arm64" })}
            className={`px-4 py-2 text-sm font-medium border-l border-[var(--dm-card-border)] ${data.arch === "arm64" ? "bg-[var(--text-main)] text-[var(--bg-color)]" : "bg-[var(--surface)] text-[var(--text-main)]"}`}
          >
            ARM64
          </button>
        </div>
      </div>
    </div>
  );
}
