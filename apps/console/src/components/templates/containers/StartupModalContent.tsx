"use client";

import { Input } from "@/components/ui/input";
import { FieldLabel, Hint, inputCls } from "./Common";
import type { ContainerHelpers } from "./types";

export function StartupModalContent({
  container,
  cIndex,
  helpers,
}: {
  container: any;
  cIndex: number;
  helpers: ContainerHelpers;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <FieldLabel>Entrypoint</FieldLabel>
        <Input
          value={container.entrypoint || ""}
          onChange={(e) =>
            helpers.updateContainer(cIndex, "entrypoint", e.target.value)
          }
          placeholder="e.g. /bin/sh -c"
          className={`${inputCls} font-mono`}
        />
        <Hint>Leave blank to use the image&apos;s default entrypoint.</Hint>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Command (Args)</FieldLabel>
        <textarea
          value={container.cmd || ""}
          onChange={(e) =>
            helpers.updateContainer(cIndex, "cmd", e.target.value)
          }
          placeholder="e.g. --listen 0.0.0.0 --port 8188\n--highvram"
          rows={4}
          className="w-full rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-input)] px-3 py-2 font-mono text-xs text-[var(--text-main)] outline-none transition-colors resize-y focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500/30"
        />
        <Hint>
          Passed as arguments to the entrypoint. Newlines and spaces are
          preserved.
        </Hint>
      </div>
    </div>
  );
}
