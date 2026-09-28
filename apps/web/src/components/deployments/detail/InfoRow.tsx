import type { ReactNode } from "react";
import { CopyButton } from "@/components/ui/CopyButton";

type InfoRowProps = {
  label: string;
  value: ReactNode;
  monospace?: boolean;
  highlight?: boolean;
  copyable?: boolean;
  copyValue?: string;
};

export function InfoRow({ label, value, monospace = false, highlight = false, copyable = false, copyValue }: InfoRowProps) {
  const textToCopy = copyValue ?? (typeof value === "string" ? value : undefined);

  return (
    <div className="flex items-center gap-4 border-b border-[var(--border)] py-2.5 last:border-b-0">
      <div className="w-40 shrink-0 text-xs font-medium text-[var(--text-muted)]">{label}</div>
      <div
        className={[
          "flex-1 text-xs flex items-center justify-between gap-2 min-w-0",
          highlight ? "font-semibold text-[var(--text-main)]" : "text-[var(--text-main)]",
          monospace ? "font-mono" : "",
        ].join(" ")}
      >
        <span className="truncate">{value}</span>
        {(copyable || textToCopy) && textToCopy && (
          <CopyButton value={textToCopy} size={13} />
        )}
      </div>
    </div>
  );
}
