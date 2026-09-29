"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings2,
} from "lucide-react";

import { Logo } from "@/components/ui/Logos";
import {
  type ProviderConnection,
  providerLabel,
} from "@/components/providers/api";

const PER_PAGE = 2;

interface Props {
  connections: ProviderConnection[];
  isLoading?: boolean;
  error?: string | null;
  selectedConnectionId: string;
  onSelect: (connection: ProviderConnection) => void;
}

const statusTone: Record<string, string> = {
  verified: "bg-emerald-400",
  failed: "bg-red-400",
  pending: "bg-amber-400",
};

export function ProviderConnectionSection({
  connections,
  isLoading = false,
  error = null,
  selectedConnectionId,
  onSelect,
}: Props) {
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(connections.length / PER_PAGE));
  const current = Math.min(page, pageCount - 1);

  useEffect(() => {
    setPage((p) => (p > pageCount - 1 ? pageCount - 1 : p));
  }, [pageCount]);

  const visible = connections.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);

  return (
    <div className="relative">
      {/* Header: title left, error + arrows top-right */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            1. Compute Provider
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-light)]">
            Pick a saved connector. Its credentials are used to launch workloads.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {error && (
            <span
              title={error}
              className="flex max-w-[220px] items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400"
            >
              <AlertCircle className="size-3 shrink-0" />
              <span className="truncate">{error}</span>
            </span>
          )}

          {connections.length > PER_PAGE && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous connectors"
                disabled={current === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="flex size-6 items-center justify-center rounded-md border border-[var(--dm-card-border)] bg-[var(--dm-card)] text-[var(--text-muted)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-main)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Next connectors"
                disabled={current >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                className="flex size-6 items-center justify-center rounded-md border border-[var(--dm-card-border)] bg-[var(--dm-card)] text-[var(--text-muted)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-main)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-[74px] animate-pulse rounded-xl border border-[var(--dm-card-border)] bg-[var(--dm-card)]"
            />
          ))}
        </div>
      ) : connections.length === 0 ? (
        <Link
          href="/providers/new"
          className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border-hover)] bg-[var(--dm-card)]/50 px-4 py-4 transition hover:border-blue-500/70 hover:bg-[var(--dm-card)]"
        >
          <span className="flex size-9 items-center justify-center rounded-lg border border-[var(--dm-divider)] bg-[var(--dm-inset)] text-[var(--text-muted)]">
            <Plus className="size-4" />
          </span>
          <span>
            <span className="block text-xs font-semibold text-[var(--text-main)]">
              No connectors yet
            </span>
            <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
              Add a provider connection to launch workloads.
            </span>
          </span>
        </Link>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {visible.map((c) => {
            const isSelected = selectedConnectionId === c.ID;
            return (
              <button
                key={c.ID}
                type="button"
                onClick={() => onSelect(c)}
                className={[
                  "group relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-150",
                  isSelected
                    ? "border-blue-500/90 bg-[var(--dm-selected)] shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50"
                    : "border-[var(--dm-card-border)] bg-[var(--dm-card)] hover:border-[var(--border-hover)] hover:bg-[var(--dm-card-hover)]",
                ].join(" ")}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--dm-inset)] p-1.5">
                  <Logo name={c.Provider} size={22} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[var(--text-main)]">
                      {c.Name}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <span className="size-1.5 rounded-full bg-[var(--text-light)]" />
                    <Settings2 className="size-3" />
                    <span className="truncate">{providerLabel(c.Provider)}</span>
                  </div>
                </div>

                {isSelected ? (
                  <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-500">
                    <Check className="size-2.5 stroke-[3] text-white" />
                  </span>
                ) : (
                  <span
                    title={c.Status}
                    className={[
                      "size-2 shrink-0 rounded-full",
                      statusTone[c.Status] || "bg-[var(--text-light)]",
                    ].join(" ")}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProviderConnectionSection;
