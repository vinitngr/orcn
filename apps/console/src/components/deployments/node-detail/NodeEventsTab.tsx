import { Activity, CircleDot } from "lucide-react";
import { SectionCard } from "@/components/deployments/node-detail/shared";

const PLACEHOLDER_EVENTS = [
  { level: "INFO", title: "Node registered with deployment", time: "--" },
  { level: "INFO", title: "Waiting for infra provisioning", time: "--" },
  { level: "WARN", title: "Telemetry stream not connected", time: "--" },
];

function levelClass(level: string) {
  if (level === "WARN") return "bg-amber-500/10 text-amber-500";
  if (level === "ERROR") return "bg-red-500/10 text-red-500";
  return "bg-blue-500/10 text-blue-400";
}

export function NodeEventsTab() {
  return (
    <div className="space-y-3">
      <SectionCard
        title="Node Events"
        subtitle="Lifecycle and health events"
        action={
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <CircleDot className="size-3 text-emerald-500" />
            Live
          </span>
        }
      >
        <div className="space-y-1.5">
          {PLACEHOLDER_EVENTS.map((event, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={[
                    "rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider",
                    levelClass(event.level),
                  ].join(" ")}
                >
                  {event.level}
                </span>
                <span className="truncate text-xs text-[var(--text-main)]">
                  {event.title}
                </span>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                {event.time}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded border border-dashed border-[var(--border)] px-3 py-4 text-center">
          <Activity className="mx-auto size-4 text-[var(--text-muted)] opacity-50" />
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Event history will stream here when the backend event feed is
            connected.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
