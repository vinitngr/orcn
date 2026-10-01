"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Cpu, Database, HardDrive } from "lucide-react";
import {
  MetricTile,
  SectionCard,
} from "@/components/deployments/node-detail/shared";

type ContainerSample = {
  timestamp?: string;
  container?: string;
  cpu?: { usage_percent?: number | null } | null;
  memory?: {
    used_mb?: number | null;
    total_mb?: number | null;
    usage_percent?: number | null;
  } | null;
  disk?: { read_mb?: number | null; write_mb?: number | null } | null;
  network?: { rx_mb?: number | null; tx_mb?: number | null } | null;
};

type NodeMetrics = {
  timestamp?: string;
  containers?: string[];
  series?: ContainerSample[];
};

type SeriesPoint = { t: number; v: number };

const POLL_MS = 5000;

function fmtNum(n: number | null | undefined, digits = 1, suffix = "") {
  if (n == null || Number.isNaN(n)) return "--";
  return `${n.toFixed(digits)}${suffix}`;
}

function fmtMB(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "--";
  if (n >= 1024) return `${(n / 1024).toFixed(2)} GB`;
  return `${n.toFixed(1)} MB`;
}

function seriesFrom(
  samples: ContainerSample[],
  pick: (s: ContainerSample) => number | null | undefined,
): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (const s of samples) {
    const v = pick(s);
    if (v == null || Number.isNaN(v)) continue;
    const t = s.timestamp ? Date.parse(s.timestamp) : NaN;
    if (Number.isNaN(t)) continue;
    out.push({ t, v });
  }
  return out;
}

function DualSparkline({
  label,
  icon: Icon,
  a,
  b,
  aLabel,
  bLabel,
  unit = "",
  emptyHint = "Waiting for samples...",
}: {
  label: string;
  icon: typeof Cpu;
  a: SeriesPoint[];
  b?: SeriesPoint[];
  aLabel?: string;
  bLabel?: string;
  unit?: string;
  emptyHint?: string;
}) {
  const values = [...a, ...(b || [])].map((p) => p.v);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const span = max - min || 1;
  const w = 320;
  const h = 100;
  const pad = 8;

  const toPoints = (series: SeriesPoint[]) => {
    if (series.length < 2) return "";
    return series
      .map((p, i) => {
        const x = pad + (i / (series.length - 1)) * (w - pad * 2);
        const y = h - pad - ((p.v - min) / span) * (h - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");
  };

  const latestA = a.length ? a[a.length - 1].v : null;
  const latestB = b?.length ? b[b.length - 1].v : null;
  const ready = a.length >= 2 || (b && b.length >= 2);

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
          <Icon className="size-3" />
          {label}
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--text-muted)]">
          {aLabel ? (
            <span>
              {aLabel}{" "}
              <span className="text-[var(--text-main)]">
                {latestA == null ? "--" : `${latestA.toFixed(latestA >= 100 ? 0 : 2)}${unit}`}
              </span>
            </span>
          ) : null}
          {bLabel ? (
            <span>
              {bLabel}{" "}
              <span className="text-[var(--text-main)]">
                {latestB == null ? "--" : `${latestB.toFixed(latestB >= 100 ? 0 : 2)}${unit}`}
              </span>
            </span>
          ) : null}
        </div>
      </div>
      <div className="h-28 overflow-hidden rounded bg-[var(--surface-hover)]">
        {!ready ? (
          <div className="flex h-full items-center justify-center text-[10px] text-[var(--text-muted)]">
            {emptyHint}
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="h-full w-full"
            preserveAspectRatio="none"
          >
            {a.length >= 2 ? (
              <polyline
                fill="none"
                stroke="var(--text-main)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={toPoints(a)}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {b && b.length >= 2 ? (
              <polyline
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={toPoints(b)}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
        )}
      </div>
    </div>
  );
}

type NodeMetricsTabProps = {
  deploymentId: string;
  nodeId: string;
  enabled?: boolean;
};

export function NodeMetricsTab({
  deploymentId,
  nodeId,
  enabled = true,
}: NodeMetricsTabProps) {
  const [metrics, setMetrics] = useState<NodeMetrics | null>(null);
  const [container, setContainer] = useState<string>("");
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !deploymentId || !nodeId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/v1/deployments/${deploymentId}/nodes/${nodeId}/metrics`,
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Metrics unavailable (${res.status})`);
        }
        const data = (await res.json()) as NodeMetrics;
        if (cancelled || !alive.current) return;

        setMetrics(data);
        setError("");
        setUpdatedAt(
          data.timestamp
            ? new Date(data.timestamp).toLocaleTimeString()
            : new Date().toLocaleTimeString(),
        );

        const ids = data.containers || [];
        setContainer((prev) =>
          prev && ids.includes(prev) ? prev : ids[0] || "",
        );
      } catch (e) {
        if (cancelled || !alive.current) return;
        setError(e instanceof Error ? e.message : "Failed to load metrics");
      }
    };

    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [deploymentId, nodeId, enabled]);

  const samples = useMemo(() => {
    const all = metrics?.series || [];
    if (!container) return all;
    return all.filter((s) => s.container === container);
  }, [metrics, container]);

  const latest = samples.length ? samples[samples.length - 1] : null;
  const cpuSeries = seriesFrom(samples, (s) => s.cpu?.usage_percent);
  const memSeries = seriesFrom(samples, (s) => s.memory?.usage_percent);
  const diskRead = seriesFrom(samples, (s) => s.disk?.read_mb);
  const diskWrite = seriesFrom(samples, (s) => s.disk?.write_mb);
  const netRx = seriesFrom(samples, (s) => s.network?.rx_mb);
  const netTx = seriesFrom(samples, (s) => s.network?.tx_mb);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-[var(--text-muted)]">
          Container metrics · last ~5 minutes
          {updatedAt ? ` · updated ${updatedAt}` : ""}
        </div>
        {(metrics?.containers?.length || 0) > 0 ? (
          <select
            value={container}
            onChange={(e) => setContainer(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--card-bg)] px-2 py-1 text-[11px] text-[var(--text-main)]"
          >
            {(metrics?.containers || []).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {error ? (
        <div className="rounded border border-dashed border-[var(--border)] px-3 py-4 text-center text-[11px] text-[var(--text-muted)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="CPU"
          value={fmtNum(latest?.cpu?.usage_percent, 2, "%")}
          meta={container || "Telemetry pending"}
        />
        <MetricTile
          label="Memory"
          value={fmtNum(latest?.memory?.usage_percent, 1, "%")}
          meta={
            latest?.memory?.used_mb != null
              ? `${fmtMB(latest.memory.used_mb)} / ${fmtMB(latest.memory.total_mb)}`
              : "Telemetry pending"
          }
        />
        <MetricTile
          label="Disk I/O"
          value={fmtMB(latest?.disk?.read_mb)}
          meta={`write ${fmtMB(latest?.disk?.write_mb)}`}
        />
        <MetricTile
          label="Network I/O"
          value={fmtMB(latest?.network?.rx_mb)}
          meta={`sent ${fmtMB(latest?.network?.tx_mb)}`}
        />
      </div>

      <SectionCard
        title="Live Charts"
        subtitle={
          container
            ? `opId · ${container}`
            : "CPU, memory, disk I/O, network I/O"
        }
      >
        <div className="grid gap-2 lg:grid-cols-2">
          <DualSparkline
            label="CPU"
            icon={Cpu}
            a={cpuSeries}
            aLabel="util"
            unit="%"
            emptyHint="Waiting for CPU samples..."
          />
          <DualSparkline
            label="Memory"
            icon={Database}
            a={memSeries}
            aLabel="util"
            unit="%"
            emptyHint="Waiting for memory samples..."
          />
          <DualSparkline
            label="Disk I/O"
            icon={HardDrive}
            a={diskRead}
            b={diskWrite}
            aLabel="read"
            bLabel="write"
            unit=" MB"
            emptyHint="Waiting for disk samples..."
          />
          <DualSparkline
            label="Network I/O"
            icon={Activity}
            a={netRx}
            b={netTx}
            aLabel="rx"
            bLabel="tx"
            unit=" MB"
            emptyHint="Waiting for network samples..."
          />
        </div>
      </SectionCard>
    </div>
  );
}
