"use client";

import { ChevronDown, Settings2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

export interface ConfigOption {
  key: string;
  name: string;
  description: string;
  type: "number" | "boolean" | "text" | "select" | string;
  default: string;
  min?: number;
  max?: number;
  options?: string[];
}

interface AdvancedConfigSectionProps {
  schema: ConfigOption[];
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function AdvancedConfigSection({
  schema,
  data,
  onChange,
  isOpen,
  onToggle,
}: AdvancedConfigSectionProps) {
  if (schema.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--dm-panel-alt)] shadow-sm overflow-hidden">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-5 text-left transition hover:bg-[var(--dm-hover-soft)]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--dm-logo)] text-[var(--text-muted)]">
            <Settings2 className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text-main)]">
              Advanced Configuration{" "}
              <span className="font-normal text-[var(--text-light)]">
                (Optional)
              </span>
            </div>
            <div className="text-xs text-[var(--text-light)]">
              Customize model loading, quantization, and runtime settings.
            </div>
          </div>
        </div>

        <ChevronDown
          className={`size-4 text-[var(--text-muted)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Accordion Body */}
      {isOpen && (
        <div className="border-t border-[var(--dm-divider)] p-6 space-y-6">
          {schema.map((opt) => {
            const currentValue =
              data[opt.key] !== undefined ? data[opt.key] : opt.default;

            return (
              <div key={opt.key} className="space-y-1.5">
                {/* 1. Name */}
                <label className="block text-xs font-semibold text-[var(--dm-text-2)]">
                  {opt.name || opt.key}
                </label>

                {/* 2. Description */}
                {opt.description && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {opt.description}
                  </p>
                )}

                {/* 3. Input */}
                <div className="pt-1">
                  {opt.type === "boolean" ? (
                    <Select
                      value={
                        opt.key === "enforce_eager"
                          ? data[opt.key] === "true"
                            ? "true"
                            : "false"
                          : data[opt.key] || opt.default || "false"
                      }
                      onValueChange={(val: string) => onChange(opt.key, val)}
                    >
                      <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--dm-input)] text-xs text-[var(--text-main)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--border)] bg-[var(--dm-logo-solid)] text-[var(--text-main)]">
                        <SelectItem value="true">Enabled</SelectItem>
                        <SelectItem value="false">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : opt.type === "select" && opt.options ? (
                    <Select
                      value={currentValue || "auto"}
                      onValueChange={(val: string) =>
                        onChange(opt.key, val === "auto" ? "" : val)
                      }
                    >
                      <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--dm-input)] text-xs text-[var(--text-main)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[var(--border)] bg-[var(--dm-logo-solid)] text-[var(--text-main)]">
                        {opt.options.map((o) => (
                          <SelectItem key={o || "auto"} value={o || "auto"}>
                            {o === "" ? "Auto Detect" : o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : opt.type === "number" ? (
                    <input
                      type="number"
                      min={opt.min}
                      max={opt.max}
                      step={
                        opt.min !== undefined &&
                        opt.max !== undefined &&
                        opt.max - opt.min <= 1
                          ? 0.05
                          : 1
                      }
                      value={data[opt.key] ?? opt.default ?? ""}
                      onChange={(e) => onChange(opt.key, e.target.value)}
                      placeholder={opt.default || "0"}
                      className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--dm-input)] px-3 text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:border-[var(--border-hover)] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                    />
                  ) : (
                    <input
                      type="text"
                      value={data[opt.key] ?? opt.default ?? ""}
                      onChange={(e) => onChange(opt.key, e.target.value)}
                      placeholder={opt.default || ""}
                      className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--dm-input)] px-3 text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:border-[var(--border-hover)] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
