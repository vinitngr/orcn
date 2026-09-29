"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";

export function DashedAddButton({
  onClick,
  text,
  disabled,
}: {
  onClick: () => void;
  text: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border-hover)] py-2.5 text-xs font-medium text-[var(--text-muted)] transition hover:border-blue-500/70 hover:bg-[var(--dm-card)] hover:text-[var(--text-main)]"
    >
      <Plus className="size-3.5" />
      {text}
    </button>
  );
}

export function EmptyState({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--border-hover)] bg-[var(--dm-card-2)]/50 px-8 py-12 text-center">
      {icon}
      <span className="text-xs text-[var(--text-muted)]">{text}</span>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-[var(--text-main)]">
      {children}
    </label>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <span className="block text-[11px] text-[var(--text-muted)]">{children}</span>;
}

export const inputCls =
  "h-9 border-[var(--dm-card-border)] bg-[var(--dm-input)] px-3 text-xs text-[var(--text-main)]";
