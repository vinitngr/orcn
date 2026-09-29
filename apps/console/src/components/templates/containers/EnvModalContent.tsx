"use client";

import { Braces, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { DashedAddButton, EmptyState, inputCls } from "./Common";
import type { ContainerHelpers } from "./types";

export function EnvModalContent({
  container,
  cIndex,
  helpers,
}: {
  container: any;
  cIndex: number;
  helpers: ContainerHelpers;
}) {
  const envVars = container.envVars || [];
  return (
    <div className="space-y-4">
      {envVars.length === 0 ? (
        <EmptyState
          icon={<Braces className="size-8 text-[var(--dm-card-border)]" />}
          text="No environment variables configured."
        />
      ) : (
        <div className="space-y-2">
          {envVars.map((env: any, i: number) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-card-2)] p-2.5"
            >
              <div className="min-w-0 flex-1">
                <Input
                  value={env.key}
                  onChange={(e) =>
                    helpers.updateArrayItem(
                      cIndex,
                      "envVars",
                      i,
                      "key",
                      e.target.value,
                    )
                  }
                  placeholder="KEY (e.g. TOKEN)"
                  className={`${inputCls} font-mono`}
                />
              </div>
              <span className="shrink-0 font-medium text-[var(--text-muted)]">
                =
              </span>
              <div className="min-w-0 flex-[1.5]">
                <Input
                  value={env.value}
                  onChange={(e) =>
                    helpers.updateArrayItem(
                      cIndex,
                      "envVars",
                      i,
                      "value",
                      e.target.value,
                    )
                  }
                  placeholder="VALUE"
                  className={`${inputCls} font-mono`}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => helpers.removeArrayItem(cIndex, "envVars", i)}
                className="border-[var(--dm-card-border)] text-[var(--text-muted)] hover:border-red-500/50 hover:text-red-400"
              >
                <Trash2 className="size, p-1" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <DashedAddButton
        onClick={() =>
          helpers.addArrayItem(cIndex, "envVars", { key: "", value: "" })
        }
        text="Add Environment Variable"
      />
    </div>
  );
}
