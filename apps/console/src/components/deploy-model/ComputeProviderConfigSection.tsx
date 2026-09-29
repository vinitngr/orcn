import React from "react";
import { ChevronDown, Database, Settings2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import type { ProviderConfigField, ProviderInfo } from "./compute-types";

interface Props {
  activeProvider: ProviderInfo;
  providerConfig: Record<string, string>;
  onProviderConfigChange?: (key: string, value: string) => void;
  volumeSizeGb?: number;
  onVolumeSizeGbChange?: (size: number) => void;
  showProviderAdvanced: boolean;
  setShowProviderAdvanced: (v: boolean) => void;
}

interface FieldInputProps {
  field: ProviderConfigField;
  value?: string;
  onChange?: (key: string, value: string) => void;
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  const currentValue = value ?? field.default ?? "";

  if (field.type === "select" && field.options) {
    return (
      <Select
        value={currentValue || ""}
        onValueChange={(val: string) => val && onChange?.(field.key, val)}
      >
        <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--dm-inset)] text-xs text-[var(--dm-text-2)]">
          <SelectValue placeholder={field.placeholder || "Select an option"} />
        </SelectTrigger>
        <SelectContent className="border-[var(--border)] bg-[var(--dm-select-content)] text-[var(--dm-text-2)]">
          {field.options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <input
      type={field.type === "number" ? "number" : "text"}
      placeholder={field.placeholder || field.default || ""}
      value={currentValue}
      onChange={(e) => onChange?.(field.key, e.target.value)}
      className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--dm-inset)] px-3 text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:border-[var(--border-hover)] focus:outline-none"
    />
  );
}

export const ComputeProviderConfigSection: React.FC<Props> = ({
  activeProvider,
  providerConfig,
  onProviderConfigChange,
  volumeSizeGb = 50,
  onVolumeSizeGbChange,
  showProviderAdvanced,
  setShowProviderAdvanced,
}) => {
  const schema = activeProvider.schema || [];
  const requiredFields = schema.filter((f) => f.required && !f.is_advanced);
  const advancedFields = schema.filter((f) => !f.required || f.is_advanced);

  if (
    !activeProvider.has_volume_support &&
    requiredFields.length === 0 &&
    advancedFields.length === 0
  ) {
    return null;
  }

  return (
    <>
      {/* Volume Section (shown only if provider supports persistent volumes) */}
      {activeProvider.has_volume_support && (
        <div className="rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--dm-text-2)]">
              <Database className="size-3.5 text-blue-400" />
              <span>Persistent Volume Storage</span>
            </div>
            <span className="text-[10px] text-[var(--text-light)] font-mono">
              EBS / Persistent Disk
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Attach high-throughput persistent storage for model weight caching
            and fast cold-starts.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={10}
              max={1000}
              value={volumeSizeGb}
              onChange={(e) =>
                onVolumeSizeGbChange?.(parseInt(e.target.value, 10) || 50)
              }
              className="h-9 w-36 rounded-lg border border-[var(--border)] bg-[var(--dm-inset)] px-3 text-xs text-[var(--text-main)] focus:border-[var(--border-hover)] focus:outline-none"
            />
            <span className="text-xs text-[var(--text-muted)]">
              GB Mounted Storage
            </span>
          </div>
        </div>
      )}

      {/* Required Provider Inputs */}
      {requiredFields.length > 0 && (
        <div className="rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card)] p-4 space-y-4">
          <div className="text-xs font-semibold text-[var(--dm-text-2)]">
            Required Provider Parameters <span className="text-red-400">*</span>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {requiredFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="block text-xs font-medium text-[var(--dm-text-3)]">
                  {field.name} <span className="text-red-400">*</span>
                </label>
                <FieldInput
                  field={field}
                  value={providerConfig[field.key]}
                  onChange={onProviderConfigChange}
                />
                {field.description && (
                  <p className="text-[10px] text-[var(--text-light)]">
                    {field.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional / Advanced Provider Configuration Accordion */}
      {advancedFields.length > 0 && (
        <div className="rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowProviderAdvanced(!showProviderAdvanced)}
            className="flex w-full items-center justify-between p-4 text-left transition hover:bg-[var(--dm-hover-soft)]"
          >
            <div className="flex items-center gap-2.5">
              <Settings2 className="size-4 text-[var(--text-muted)]" />
              <div>
                <div className="text-xs font-semibold text-[var(--dm-text-2)]">
                  Provider Advanced Options{" "}
                  <span className="text-[var(--text-light)] font-normal">
                    (Optional)
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-light)]">
                  Configure network peering, subnets, and provider-specific
                  runtime flags.
                </div>
              </div>
            </div>
            <ChevronDown
              className={`size-4 text-[var(--text-muted)] transition-transform duration-200 ${
                showProviderAdvanced ? "rotate-180" : ""
              }`}
            />
          </button>

          {showProviderAdvanced && (
            <div className="border-t border-[var(--dm-divider)] p-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {advancedFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--dm-text-3)]">
                    {field.name}
                  </label>
                  <FieldInput
                    field={field}
                    value={providerConfig[field.key]}
                    onChange={onProviderConfigChange}
                  />
                  {field.description && (
                    <p className="text-[10px] text-[var(--text-light)]">
                      {field.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ComputeProviderConfigSection;
