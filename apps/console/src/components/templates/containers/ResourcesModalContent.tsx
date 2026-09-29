"use client";

import { useState } from "react";
import { Download, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/input";
import { DashedAddButton, EmptyState, FieldLabel, Hint, inputCls } from "./Common";
import { useResourceProviders } from "./useResourceProviders";
import type { ContainerHelpers, ProviderField } from "./types";

export function ResourcesModalContent({
  container,
  cIndex,
  helpers,
}: {
  container: any;
  cIndex: number;
  helpers: ContainerHelpers;
}) {
  const { providers, loading } = useResourceProviders();
  const resources = container.resources || [];
  const [drafts, setDrafts] = useState<Record<number, string>>({});

    const updateResource = (i: number, key: string, val: any) =>
      helpers.updateArrayItem(cIndex, "resources", i, key, val);


  const addFilesItem = (
    i: number,
    key: string,
    items: string[],
    draft: string,
  ) => {
    const value = draft.trim();
    if (!value) return;
    updateResource(i, key, [...items, value]);
    setDrafts({ ...drafts, [i]: "" });
  };

  return (
    <div className="space-y-4">
      {loading && providers.length === 0 && (
        <Hint>Loading available resource providers…</Hint>
      )}
      {resources.length === 0 ? (
        <EmptyState
          icon={<Download className="size-8 text-[var(--dm-card-border)]" />}
          text="No external resources configured."
        />
      ) : (
        <div className="space-y-3">
          {resources.map((res: any, i: number) => {
            const provider = providers.find((p) => p.id === res.type);
            return (
              <div
                key={i}
                className="space-y-4 rounded-xl border border-[var(--dm-card-border)] bg-[var(--dm-card-2)] p-4"
              >
                <div className="flex items-center justify-between gap-3 border-b border-[var(--dm-divider)] pb-3">
                  <div className="w-44">
                    <Select
                      value={res.type}
                      onChange={(val: string) => updateResource(i, "type", val)}
                      options={providers.map((p) => ({
                        value: p.id,
                        label: p.name,
                      }))}
                      placeholder="Select provider..."
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      helpers.removeArrayItem(cIndex, "resources", i)
                    }
                    className="border-[var(--dm-card-border)] text-[var(--text-muted)] hover:border-red-500/50 hover:text-red-400"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>

                {provider ? (
                  <div className="space-y-4">
                    {provider.description && (
                      <Hint>{provider.description}</Hint>
                    )}
                    {provider.fields.map((field) => {
                      const key = field.spec_key || field.name;
                      const value = res[key];

if (field.type === "string_list") {
                          const storedItems: string[] = Array.isArray(value)
                            ? value.filter(Boolean)
                            : value
                              ? String(value)
                                  .split(",")
                                  .map((f: string) => f.trim())
                                  .filter(Boolean)
                              : [];
                          const draft = drafts[i] ?? "";
                          const addItem = () => {
                            const trimmed = draft.trim();
                            if (!trimmed) return;
                            addFilesItem(i, key, storedItems, trimmed);
                          };
                          const removeItem = (idx: number) => {
                            const newItems = storedItems.filter((_, j) => j !== idx);
                            updateResource(i, key, newItems);
                          };
                          return (
                            <div key={field.name} className="space-y-1.5">
                              <FieldLabel>
                                {field.label}
                                {!field.required && (
                                  <span className="text-[var(--text-muted)]"> (Optional)</span>
                                )}
                              </FieldLabel>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {storedItems.map((item, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="default"
                                    className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono"
                                  >
                                    {item}
                                    <X
                                      className="size-3 cursor-pointer"
                                      onClick={() => removeItem(idx)}
                                    />
                                  </Badge>
                                ))}
                              </div>
                              <Input
                                value={draft}
                                onChange={(e) => setDrafts({ ...drafts, [i]: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addItem();
                                  }
                                }}
                                placeholder={field.placeholder}
                                className={`${inputCls} font-mono`}
                              />
                              {field.description && <Hint>{field.description}</Hint>}
                            </div>
                          );
                        }

                      return (
                        <div key={field.name} className="space-y-1.5">
                          <FieldLabel>
                            {field.label}
                            {!field.required && (
                              <span className="text-[var(--text-muted)]">
                                {" "}
                                (Optional)
                              </span>
                            )}
                          </FieldLabel>
                          {field.type === "textarea" ? (
                            <textarea
                              value={value ?? ""}
                              onChange={(e) =>
                                updateResource(i, key, e.target.value)
                              }
                              placeholder={field.placeholder}
                              rows={3}
                              className="w-full rounded-lg border border-[var(--dm-card-border)] bg-[var(--dm-input)] px-3 py-2 text-xs text-[var(--text-main)] outline-none transition-colors resize-y focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500/30"
                            />
                          ) : (
                            <Input
                              type={field.type === "number" ? "number" : "text"}
                              value={value ?? ""}
                              onChange={(e) =>
                                updateResource(i, key, e.target.value)
                              }
                              placeholder={field.placeholder}
                              className={inputCls}
                            />
                          )}
                          {field.description && (
                            <Hint>{field.description}</Hint>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Hint>
                    {loading
                      ? "Loading provider fields…"
                      : `Unknown provider type "${res.type}".`}
                  </Hint>
                )}
              </div>
            );
          })}
        </div>
      )}
        <DashedAddButton
          disabled={loading}
          onClick={() => {
            const first = providers[0]?.id || "http";
            helpers.addArrayItem(cIndex, "resources", { type: first });
          }}
          text="Add Resource"
        />
    </div>
  );
}
