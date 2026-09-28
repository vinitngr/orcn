import { ArrowRightLeft, Activity, Gauge } from "lucide-react";

function StatTile({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        <Gauge className="size-3.5 text-[var(--text-muted)]" />
      </div>
      <div className="font-heading text-lg font-bold tracking-tight text-[var(--text-main)]">--</div>
      <div className="mt-2 h-7 rounded bg-[var(--surface-hover)]" />
    </div>
  );
}

export function MetricsTab() {
  return (
    <div className="space-y-3">
      {/* Top stat row */}
      <div className="grid gap-2 sm:grid-cols-3">
        <StatTile label="Requests / Sec" />
        <StatTile label="Latency (TTFT)" />
        <StatTile label="Token Throughput" />
      </div>

      {/* Charts */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-[var(--text-muted)]" />
            <h2 className="text-sm font-bold text-[var(--text-main)]">Live Traffic &amp; Performance</h2>
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">Telemetry stream connecting...</span>
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          <div className="flex h-32 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-hover)] text-[11px] text-[var(--text-muted)]">
            Latency Distribution (ms)
          </div>
          <div className="flex h-32 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-hover)] text-[11px] text-[var(--text-muted)]">
            Requests &amp; Throughput (req/s)
          </div>
        </div>
      </div>

      {/* Request stream log */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <div className="mb-3 flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
          <ArrowRightLeft size={14} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-bold text-[var(--text-main)]">Recent Request Stream</h2>
        </div>
        <div className="space-y-1.5">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-[11px] text-[var(--text-muted)]"
            >
              <span>Awaiting telemetry stream event #{item}</span>
              <span className="font-mono">-- ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
