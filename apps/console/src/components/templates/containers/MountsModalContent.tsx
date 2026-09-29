"use client";

import { ArrowRight, Box, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/input";
import { DashedAddButton, EmptyState, inputCls } from "./Common";
import type { ContainerHelpers } from "./types";

export function MountsModalContent({
  container,
  cIndex,
  nodeVolumes,
  helpers,
}: {
  container: any;
  cIndex: number;
  nodeVolumes: any[];
  helpers: ContainerHelpers;
}) {
  const mounts = container.mounts || [];
  return (
    <div className="space-y-4">
      {mounts.length === 0 ? (
        <EmptyState
          icon={<Box className="size-8 text-[var(--dm-card-border)]" />}
          text="No volume mounts configured."
        />
      ) : (
        <div className="space-y-2">
          {mounts.map((m: any, i: number) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-card-2)] p-2.5"
            >
              <div className="min-w-0 flex-1">
                <Select
                  value={m.volumeName}
                  onChange={(val: string) =>
                    helpers.updateArrayItem(
                      cIndex,
                      "mounts",
                      i,
                      "volumeName",
                      val,
                    )
                  }
                  options={nodeVolumes.map((v: any) => ({
                    value: v.name,
                    label: `${v.name} (${v.size}GB)`,
                  }))}
                  placeholder="Select disk..."
                />
              </div>
              <ArrowRight className="size-4 shrink-0 text-[var(--text-muted)]" />
              <div className="min-w-0 flex-1">
                <Input
                  value={m.mountPath}
                  onChange={(e) =>
                    helpers.updateArrayItem(
                      cIndex,
                      "mounts",
                      i,
                      "mountPath",
                      e.target.value,
                    )
                  }
                  placeholder="Container path (e.g. /data)"
                  className={inputCls}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => helpers.removeArrayItem(cIndex, "mounts", i)}
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
          helpers.addArrayItem(cIndex, "mounts", {
            volumeName: "",
            mountPath: "",
          })
        }
        text="Add Volume Mount"
      />
    </div>
  );
}
