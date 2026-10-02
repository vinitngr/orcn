/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  ExternalLink,
  Gauge,
  Globe,
  Server,
  Terminal,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InfoRow } from "@/components/deployments/detail/InfoRow";
import { Logo, getLogoCategory } from "@/components/ui/Logos";
import { CopyButton } from "@/components/ui/CopyButton";

type OverviewTabProps = {
  deployment: any;
  nodes: any[];
  onOpenTab: (tab: string) => void;
  statusVariant: (
    status: string,
  ) => "default" | "success" | "warning" | "error";
};

function MetricTile({
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
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
        <ArrowUpRight className="size-3.5 text-[var(--text-muted)] transition group-hover:text-[var(--text-main)]" />
      </div>
      <div className="font-heading text-xl font-bold tracking-tight text-[var(--text-main)]">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-[var(--text-muted)]">{meta}</div>
    </button>
  );
}

function Placeholder({
  label,
  icon: Icon,
}: {
  label: string;
  icon: typeof Gauge;
}) {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--card-bg)] p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-2 h-8 rounded bg-[var(--surface-hover)]" />
    </div>
  );
}

type SpecPort = { port: number; protocol: string; isPublic: boolean };

/** Ports declared by the job spec (expose), deduped across containers */
function buildSpecPorts(deployment: any): SpecPort[] {
  let containers: any[] = [];
  try {
    const spec = deployment.JobSpecJSON
      ? JSON.parse(deployment.JobSpecJSON)
      : null;
    containers = spec?.containers || [];
  } catch {
    return [];
  }

  const seen = new Set<number>();
  const ports: SpecPort[] = [];
  for (const c of containers) {
    for (const p of c?.args?.expose || []) {
      const port = Number(p?.port);
      if (!Number.isFinite(port) || port <= 0 || seen.has(port)) continue;
      seen.add(port);
      ports.push({
        port,
        protocol: (p.protocol || "http").toLowerCase(),
        isPublic: Boolean(p.is_public),
      });
    }
  }
  return ports.sort((a, b) => a.port - b.port);
}

function scheme(): string {
  if (typeof window === "undefined") return "http";
  return window.location.protocol === "https:" ? "https" : "http";
}

export function OverviewTab({
  deployment,
  nodes,
  onOpenTab,
  statusVariant,
}: OverviewTabProps) {
  const createdAt = deployment.CreatedAt
    ? new Date(deployment.CreatedAt).toLocaleString()
    : "-";
  const healthyNodes = nodes.filter((node) =>
    ["READY", "RUNNING", "HEALTHY"].includes(
      String(node.InfraStatus).toUpperCase(),
    ),
  ).length;
  const providerName = deployment.ProviderID || "-";
  const runtimeName = deployment.RuntimeID || "";
  const runtimeHasLogo =
    runtimeName && getLogoCategory(runtimeName) !== "unknown";

  const specPorts = buildSpecPorts(deployment);
  const baseUrl = String(
    deployment.GatewayURL || deployment.Endpoint || deployment.URL || "",
  ).replace(/\/+$/, "");
  const host =
    typeof window !== "undefined" ? window.location.hostname : "localhost";
  const slug = String(deployment.Name || deployment.ID || "deployment")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  /** Reserved gateway URL for a port: subdomain route, or base URL + port */
  const reservedUrl = (port: number) => {
    if (baseUrl) return `${baseUrl.replace(/:\d+$/, "")}:${port}`;
    return `${scheme()}://${slug}-${port}.${host}`;
  };
  const publicCount = specPorts.filter((p) => p.isPublic).length;
  const isRunning = ["RUNNING", "READY"].includes(
    String(deployment.Status || "").toUpperCase(),
  );

  return (
    <div className="space-y-3">
      {/* Stat Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Requests (24h)"
          value="--"
          meta="Telemetry pending"
          onClick={() => onOpenTab("metrics")}
        />
        <MetricTile
          label="Avg Latency"
          value="--"
          meta="Live sampling"
          onClick={() => onOpenTab("metrics")}
        />
        <MetricTile
          label="Healthy Replicas"
          value={nodes.length ? `${healthyNodes} / ${nodes.length}` : "--"}
          meta="Replica health"
          onClick={() => onOpenTab("replicas")}
        />
        <MetricTile
          label="API Access"
          value="Ready"
          meta="OpenAI-compatible"
          onClick={() => onOpenTab("api")}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.3fr]">
        {/* Deployment Info */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">
                Deployment Information
              </h2>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                Identity and specification details
              </p>
            </div>
            <Boxes className="size-4 text-[var(--text-muted)]" />
          </div>
          <InfoRow
            label="Deployment Name"
            value={deployment.Name}
            highlight
            copyable
          />
          <InfoRow
            label="Deployment ID"
            value={deployment.ID}
            monospace
            copyable
          />
          <InfoRow
            label="Status"
            value={
              <Badge variant={statusVariant(deployment.Status)}>
                {deployment.Status}
              </Badge>
            }
          />
          <InfoRow
            label="Workload"
            value={deployment.WorkloadType || "model_inference"}
          />
          {deployment.Task ? (
            <InfoRow label="Task" value={deployment.Task} />
          ) : null}
          <InfoRow
            label="Model ID"
            value={deployment.ModelID || "-"}
            copyable
          />
          <InfoRow
            label="Provider"
            value={
              <div className="flex items-center gap-2">
                {deployment.ProviderID && (
                  <Logo name={providerName} size={15} />
                )}
                <span className="capitalize">{providerName}</span>
              </div>
            }
          />
          <InfoRow
            label="Runtime"
            value={
              <div className="flex items-center gap-2">
                {runtimeHasLogo && <Logo name={runtimeName} size={14} />}
                <span>{runtimeName || "-"}</span>
              </div>
            }
          />
          <InfoRow
            label="Instance Type"
            value={deployment.InstanceName || "-"}
            copyable
          />
          <InfoRow label="Created At" value={createdAt} />
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {/* Resource Telemetry */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
            <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">
                  Resource Telemetry
                </h2>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Live capacity graphs
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenTab("metrics")}
              >
                View metrics
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Placeholder label="GPU Utilization" icon={Gauge} />
              <Placeholder label="GPU Memory" icon={Gauge} />
              <Placeholder label="CPU Utilization" icon={Activity} />
              <Placeholder label="System Memory" icon={Activity} />
            </div>
          </div>

          {/* Active Nodes */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
            <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-main)]">
                  Active Nodes Preview
                </h2>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Assigned replicas
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenTab("replicas")}
              >
                View all
              </Button>
            </div>
            <div className="space-y-1.5">
              {nodes.length === 0 ? (
                <div className="rounded border border-dashed border-[var(--border)] p-3 text-center text-xs text-[var(--text-muted)]">
                  Nodes will appear when registered.
                </div>
              ) : (
                nodes.slice(0, 3).map((node: any) => (
                  <div
                    key={node.ID}
                    className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 font-mono text-[var(--text-main)]">
                      <span
                        className={[
                          "size-1.5 rounded-full",
                          statusVariant(node.InfraStatus || "UNKNOWN") ===
                          "success"
                            ? "bg-emerald-500"
                            : statusVariant(node.InfraStatus || "UNKNOWN") ===
                                "warning"
                              ? "bg-amber-500"
                              : statusVariant(node.InfraStatus || "UNKNOWN") ===
                                  "error"
                                ? "bg-red-500"
                                : "bg-[var(--text-muted)]",
                        ].join(" ")}
                      />
                      <Logo
                        name={
                          node.ProviderID || deployment.ProviderID || "nosana"
                        }
                        size={13}
                      />
                      <span className="text-[var(--text-muted)]">:</span>
                      <span>{node.ID}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CopyButton value={node.ID} size={12} />
                      <Link
                        href={`/deployments/${deployment.ID}/nodes/${node.ID}`}
                        className="rounded p-1 text-[var(--text-muted)] transition hover:bg-[var(--card-bg)] hover:text-[var(--text-main)]"
                        title="Open node details"
                      >
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Endpoints + Quick Actions side by side */}
      <div className="grid items-start gap-3 lg:grid-cols-2">
      {/* Endpoints — reserved gateway URL per declared port */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-[var(--text-muted)]" />
            <h2 className="text-sm font-bold text-[var(--text-main)]">
              Endpoints
            </h2>
            <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              {specPorts.length} port{specPorts.length !== 1 ? "s" : ""}
            </span>
          </div>
          {isRunning ? (
            <span className="text-[11px] text-[var(--text-muted)]">
              {publicCount > 0
                ? `${publicCount} public`
                : "No public ports in spec"}
            </span>
          ) : (
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
              Inactive while {deployment.Status || "stopped"}
            </span>
          )}
        </div>

        {specPorts.length > 0 ? (
          <div
            className={[
              "divide-y divide-[var(--border)] rounded border border-[var(--border)]",
              isRunning ? "" : "opacity-50 grayscale",
            ].join(" ")}
          >
            {specPorts.map((p) => {
              const url = reservedUrl(p.port);
              return (
                <div
                  key={p.port}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={[
                        "size-1.5 rounded-full",
                        isRunning
                          ? "bg-emerald-500"
                          : "bg-[var(--text-muted)]",
                      ].join(" ")}
                    />
                    <span className="font-mono text-[11px] font-semibold text-[var(--text-main)]">
                      :{p.port}
                    </span>
                    <span className="text-[10px] uppercase text-[var(--text-muted)]">
                      {p.protocol}
                    </span>
                    <span
                      className={[
                        "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                        p.isPublic
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-[var(--surface-hover)] text-[var(--text-muted)]",
                      ].join(" ")}
                    >
                      {p.isPublic ? "public" : "internal"}
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="truncate font-mono text-[11px] text-[var(--text-muted)]"
                      title={url}
                    >
                      {url}
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="shrink-0 rounded p-1 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
                      title={`Open :${p.port}`}
                    >
                      <ExternalLink size={12} />
                    </a>
                    <CopyButton value={url} size={12} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded border border-dashed border-[var(--border)] px-3 py-2.5 text-center text-[11px] text-[var(--text-muted)]">
            No ports declared in the job spec yet.
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-[var(--text-muted)]" />
            <h2 className="text-sm font-bold text-[var(--text-main)]">
              Quick Actions
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            Common deployment tasks
          </span>
        </div>
        <div className="grid gap-2">
          {[
            {
              tab: "api",
              icon: Terminal,
              label: "API Integration",
              sub: "Endpoints & code snippets",
            },
            {
              tab: "replicas",
              icon: Server,
              label: "Inspect Replicas",
              sub: "Node hardware & status",
            },
            {
              tab: "configuration",
              icon: Boxes,
              label: "View Spec",
              sub: "Raw payload & configuration",
            },
          ].map(({ tab, icon: Icon, label, sub }) => (
            <button
              key={tab}
              type="button"
              onClick={() => onOpenTab(tab)}
              className="flex items-center gap-2.5 rounded border border-[var(--border)] bg-[var(--surface-hover)] p-2.5 text-left transition hover:border-[var(--border-hover)]"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-muted)]">
                <Icon size={13} />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-[var(--text-main)]">
                  {label}
                </span>
                <span className="block truncate text-[11px] text-[var(--text-muted)]">
                  {sub}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
