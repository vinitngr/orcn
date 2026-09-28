import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Gauge } from "lucide-react";

export function MetricTile({
  label,
  value,
  meta,
  onClick,
}: {
  label: string;
  value: string;
  meta: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3.5 text-left transition-all duration-150 hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        <Gauge className="size-3.5 text-[var(--text-muted)] transition group-hover:text-[var(--text-main)]" />
      </div>
      <div className="font-heading text-xl font-bold tracking-tight text-[var(--text-main)]">{value}</div>
      <div className="mt-1 text-[11px] text-[var(--text-muted)]">{meta}</div>
    </button>
  );
}

export function ChartPlaceholder({
  label,
  icon: Icon = Gauge,
  tall = false,
}: {
  label: string;
  icon?: LucideIcon;
  tall?: boolean;
}) {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
        <Icon className="size-3" />
        {label}
      </div>
      <div
        className={[
          "mt-2 flex items-center justify-center rounded bg-[var(--surface-hover)] text-[10px] text-[var(--text-muted)]",
          tall ? "h-28" : "h-8",
        ].join(" ")}
      >
        {tall ? "Telemetry pending" : null}
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-main)]">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function shortNodeId(id: string) {
  return id.length > 8 ? id.slice(0, 8) : id;
}
