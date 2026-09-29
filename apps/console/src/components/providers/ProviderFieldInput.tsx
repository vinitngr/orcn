"use client";

import { useState } from "react";
import { Eye, EyeOff, Upload } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import type { ProviderField } from "./api";

interface Props {
  field: ProviderField;
  value: unknown;
  file: File | null;
  onChange: (key: string, value: unknown) => void;
  onFileChange: (key: string, file: File | null) => void;
}

const inputClass =
  "h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--dm-inset)] px-3 text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] transition-colors focus:border-blue-500 focus:outline-none";

export function ProviderFieldInput({
  field,
  value,
  file,
  onChange,
  onFileChange,
}: Props) {
  const [showSecret, setShowSecret] = useState(false);

  if (field.type === "boolean") {
    const checked = value === true || value === "true";
    return (
      <button
        type="button"
        onClick={() => onChange(field.key, !checked)}
        className="flex items-center gap-2.5"
      >
        <span
          className={`relative h-5 w-9 rounded-full border transition-colors ${
            checked
              ? "border-blue-500 bg-blue-500/80"
              : "border-[var(--dm-chip-border)] bg-[var(--dm-inset)]"
          }`}
        >
          <span
            className={`absolute top-0.5 size-3.5 rounded-full bg-white transition-all ${
              checked ? "left-4.5" : "left-0.5"
            }`}
          />
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {checked ? "Enabled" : "Disabled"}
        </span>
      </button>
    );
  }

  if (field.type === "select" && field.options && field.options.length > 0) {
    return (
      <Select
        value={value ?? field.default ?? ""}
        onValueChange={(val: string) => val && onChange(field.key, val)}
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

  if (field.type === "file") {
    return (
      <label className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--dm-chip-border)] bg-[var(--dm-inset)] px-3 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--border-hover)]">
        <Upload className="size-3.5 shrink-0" />
        <span className="truncate">{file ? file.name : "Choose file"}</span>
        <input
          type="file"
          className="hidden"
          onChange={(e) => onFileChange(field.key, e.target.files?.[0] || null)}
        />
      </label>
    );
  }

  const isPassword = field.type === "password";

  return (
    <div className="relative">
      <input
        type={
          isPassword && !showSecret
            ? "password"
            : field.type === "number"
              ? "number"
              : "text"
        }
        placeholder={field.placeholder || field.default || ""}
        value={String(value ?? field.default ?? "")}
        onChange={(e) => onChange(field.key, e.target.value)}
        className={`${inputClass} ${isPassword ? "pr-9" : ""}`}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowSecret((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-light)] transition-colors hover:text-[var(--text-main)]"
        >
          {showSecret ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Eye className="size-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
