"use client";

import { Server, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/input";
import { DashedAddButton, EmptyState, inputCls } from "./Common";
import type { ContainerHelpers } from "./types";

export function PortsModalContent({
  container,
  cIndex,
  helpers,
}: {
  container: any;
  cIndex: number;
  helpers: ContainerHelpers;
}) {
  const ports = container.ports || [];
  return (
    <div className="space-y-4">
      {ports.length === 0 ? (
        <EmptyState
          icon={<Server className="size-8 text-[var(--dm-card-border)]" />}
          text="No exposed ports configured."
        />
      ) : (
        <div className="space-y-2">
          {ports.map((p: any, i: number) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-card-2)] p-2.5"
            >
              <div className="min-w-0 flex-1">
                <Input
                  type="number"
                  value={p.port || ""}
                  onChange={(e) =>
                    helpers.updateArrayItem(
                      cIndex,
                      "ports",
                      i,
                      "port",
                      e.target.value,
                    )
                  }
                  placeholder="Port (e.g. 8000)"
                  className={inputCls}
                />
              </div>
              <div className="w-[130px] shrink-0">
                <Select
                  value={(p.is_public ?? true) ? "public" : "internal"}
                  onChange={(val: string) =>
                    helpers.updateArrayItem(
                      cIndex,
                      "ports",
                      i,
                      "is_public",
                      val === "public",
                    )
                  }
                  options={[
                    { value: "public", label: "Public" },
                    { value: "internal", label: "Internal" },
                  ]}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => helpers.removeArrayItem(cIndex, "ports", i)}
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
          helpers.addArrayItem(cIndex, "ports", {
            port: "",
            is_public: true,
          })
        }
        text="Add Port"
      />
    </div>
  );
}
