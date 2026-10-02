"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";

export type DetailNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number | string;
};

type DetailSideNavProps = {
  items: DetailNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

const COLLAPSED_W = 48;
const EXPANDED_W = 180;

export function DetailSideNav({ items, activeId, onSelect }: DetailSideNavProps) {
  const [hovered, setHovered] = useState(false);
  const expanded = hovered;

  return (
    // Fixed 60px footprint in layout — never grows, so siblings never shift.
    <div className="sticky top-[calc(56px+1.5rem)] z-30 m-0 w-[48px] shrink-0 self-start p-0">
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Deployment sections"
        style={{
          width: expanded ? EXPANDED_W : COLLAPSED_W,
          boxShadow: expanded ? "0 12px 32px rgba(0,0,0,0.18)" : "none",
        }}
        className="relative z-30 flex max-h-[calc(100vh-56px-3rem)] flex-col gap-0.5 overflow-y-auto overflow-x-hidden rounded-r-lg border border-l-0 border-[var(--border)] bg-[var(--surface)] p-1.5 transition-[width] duration-200 ease-in-out"
      >
        {items.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              title={tab.label}
              onClick={() => onSelect(tab.id)}
              className={[
                "group relative flex w-full items-center gap-2 rounded-md px-0 py-1.5 text-[11px] font-semibold transition-colors duration-150",
                isActive
                  ? "bg-[var(--surface-hover)] text-[var(--text-main)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]",
              ].join(" ")}
              style={{ justifyContent: expanded ? "flex-start" : "center" }}
            >
              {/* active indicator */}
              <span
                aria-hidden
                className={[
                  "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--text-main)] transition-opacity",
                  isActive ? "opacity-100" : "opacity-0",
                ].join(" ")}
              />
            <span className="flex size-7 shrink-0 items-center justify-center">
              <Icon className="size-3.5" />
            </span>
              <span
                className={[
                  "whitespace-nowrap transition-opacity duration-150",
                  expanded
                    ? "opacity-100"
                    : "pointer-events-none absolute opacity-0",
                ].join(" ")}
              >
                {tab.label}
              </span>
              {tab.count !== undefined && expanded && (
                <span className="ml-auto rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                  {tab.count}
                </span>
              )}
              {/* collapsed count dot */}
              {tab.count !== undefined && !expanded && (
                <span className="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--surface-hover)] px-1 text-[9px] font-semibold text-[var(--text-muted)]">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </aside>
    </div>
  );
}
