/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Activity,
  Boxes,
  ExternalLink,
  Gauge,
  HardDrive,
  Link2,
  Server,
  Terminal,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Logo } from "@/components/ui/Logos";
import { InfoRow } from "@/components/deployments/detail/InfoRow";
import {
  ChartPlaceholder,
  MetricTile,
  SectionCard,
  shortNodeId,
} from "@/components/deployments/node-detail/shared";

type StatusVariant = (status: string) => "default" | "success" | "warning" | "error";

type NodeOverviewTabProps = {
  deployment: any;
  node: any;
  onOpenTab: (tab: string) => void;
  statusVariant: StatusVariant;
};

type NodeEndpoint = { port: number | string; protocol: string; url: string; subdomain?: string };

function buildEndpoints(deployment: any, node: any): NodeEndpoint[] {
  const out: NodeEndpoint[] = [];

  const fromDeployment = (deployment.Endpoints || []).filter(
    (e: any) => e.type === "node" && e.node_id === node.ID
  );
  for (const ep of fromDeployment) {
    const subdomain = ep.subdomain || shortNodeId(node.ID);
    out.push({
      port: ep.target_port ?? ep.port ?? "-",
      protocol: ep.protocol || "http",
      subdomain,
      url: `http://${subdomain}.localhost`,
    });
  }

  if (node.EndpointsJSON) {
    try {
      const parsed = JSON.parse(node.EndpointsJSON);
      if (Array.isArray(parsed)) {
        for (const e of parsed) {
          const protocol = e?.protocol || "http";
          const raw = String(e?.base_url || "");
          const url = !raw ? "" : /^https?:\/\//i.test(raw) ? raw : `${protocol}://${raw}`;
          out.push({
            port: e?.port ?? "-",
            protocol,
            url: url || `http://${shortNodeId(node.ID)}.localhost`,
          });
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (node.NodeURL && !out.some((e) => e.url === node.NodeURL)) {
    out.push({ port: "-", protocol: "http", url: node.NodeURL });
  }

  return out;
}

export function NodeOverviewTab({
  deployment,
  node,
  onOpenTab,
  statusVariant,
}: NodeOverviewTabProps) {
  const createdAt = node.CreatedAt ? new Date(node.CreatedAt).toLocaleString() : "-";
  const updatedAt = node.UpdatedAt ? new Date(node.UpdatedAt).toLocaleString() : "-";
  const provider = node.ProviderID || deployment.ProviderID || "-";
  const endpoints = buildEndpoints(deployment, node);
  const shortId = shortNodeId(node.ID);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="GPU" value="--" meta="Capacity pending" onClick={() => onOpenTab("metrics")} />
        <MetricTile label="CPU" value="--" meta="Utilization pending" onClick={() => onOpenTab("metrics")} />
        <MetricTile label="Memory" value="--" meta="Allocation pending" onClick={() => onOpenTab("metrics")} />
        <MetricTile label="Disk" value="--" meta="Usage pending" onClick={() => onOpenTab("metrics")} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.3fr]">
        <SectionCard
          title="Node Information"
          subtitle="Identity and runtime details"
          action={<Server className="size-4 text-[var(--text-muted)]" />}
        >
          <InfoRow label="Node Name" value={shortId} highlight copyable copyValue={shortId} />
          <InfoRow label="Node ID" value={node.ID} monospace copyable />
          <InfoRow
            label="Infra Status"
            value={<Badge variant={statusVariant(node.InfraStatus)}>{node.InfraStatus || "UNKNOWN"}</Badge>}
          />
          <InfoRow
            label="App Status"
            value={<Badge variant={statusVariant(node.AppStatus)}>{node.AppStatus || "UNKNOWN"}</Badge>}
          />
          <InfoRow
            label="Provider"
            value={
              <div className="flex items-center gap-2">
                {provider !== "-" && <Logo name={provider} size={15} />}
                <span className="capitalize">{provider}</span>
              </div>
            }
          />
          <InfoRow label="Parent Deployment" value={deployment.Name} copyable />
          <InfoRow label="Deployment ID" value={deployment.ID} monospace copyable />
          <InfoRow label="Instance Type" value={deployment.InstanceName || deployment.InstanceTypeID || "-"} />
          <InfoRow label="Model ID" value={deployment.ModelID || "-"} copyable />
          <InfoRow label="Created At" value={createdAt} />
          <InfoRow label="Last Updated" value={updatedAt} />
        </SectionCard>

        <div className="space-y-3">
          <SectionCard
            title="Resource Utilization"
            subtitle="Live capacity graphs"
            action={
              <Button variant="ghost" size="sm" onClick={() => onOpenTab("metrics")}>
                View metrics
              </Button>
            }
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <ChartPlaceholder label="GPU Utilization" icon={Gauge} tall />
              <ChartPlaceholder label="GPU Memory" icon={HardDrive} tall />
              <ChartPlaceholder label="CPU Utilization" icon={Activity} />
              <ChartPlaceholder label="System Memory" icon={Activity} />
              <ChartPlaceholder label="Disk Usage" icon={HardDrive} />
            </div>
          </SectionCard>

          <SectionCard
            title="Endpoints"
            subtitle="Direct access for this node"
            action={
              <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                {endpoints.length}
              </span>
            }
          >
            {endpoints.length === 0 ? (
              <div className="rounded border border-dashed border-[var(--border)] px-3 py-4 text-center text-[11px] text-[var(--text-muted)]">
                No endpoints resolved yet. They appear when the node is ready.
              </div>
            ) : (
              <div className="space-y-1.5">
                {endpoints.slice(0, 4).map((ep, idx) => (
                  <div
                    key={`${ep.url}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2 text-[11px]">
                      <Link2 size={12} className="shrink-0 text-[var(--text-muted)]" />
                      <span className="font-mono text-[var(--text-main)]">:{ep.port}</span>
                      <span className="truncate font-mono text-[var(--text-muted)]">{ep.url}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <a
                        href={ep.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="rounded p-1 text-[var(--text-muted)] transition hover:bg-[var(--card-bg)] hover:text-[var(--text-main)]"
                        title="Open endpoint"
                      >
                        <ExternalLink size={12} />
                      </a>
                      <CopyButton value={ep.url} size={12} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard
          title="Running Workloads"
          subtitle="Containers on this node"
          action={
            <Button variant="ghost" size="sm" onClick={() => onOpenTab("workloads")}>
              View all
            </Button>
          }
        >
          <div className="rounded border border-dashed border-[var(--border)] px-3 py-6 text-center">
            <Boxes className="mx-auto size-4 text-[var(--text-muted)] opacity-50" />
            <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">Workload inventory reserved</p>
            <p className="mt-1 text-[10px] text-[var(--text-muted)] opacity-70">
              Replica / container rows appear when runtime reporting is live.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Logs"
          subtitle="Stdout / stderr preview"
          action={
            <Button variant="ghost" size="sm" onClick={() => onOpenTab("logs")}>
              Open logs
            </Button>
          }
        >
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-[11px] text-[var(--text-muted)]"
              >
                <span className="rounded bg-[var(--card-bg)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider">
                  INFO
                </span>
                <span className="truncate">Waiting for log stream event #{i}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Quick Actions" subtitle="Jump to related views">
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { tab: "events", icon: Activity, label: "Events", sub: "Lifecycle & health events" },
            { tab: "logs", icon: Terminal, label: "Logs", sub: "Live container output" },
            { tab: "workloads", icon: Boxes, label: "Workloads", sub: "Running containers" },
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
                <span className="block text-xs font-semibold text-[var(--text-main)]">{label}</span>
                <span className="block truncate text-[11px] text-[var(--text-muted)]">{sub}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-2">
          <Link
            href={`/deployments/${deployment.ID}`}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-main)]"
          >
            Back to deployment
            <ExternalLink size={11} />
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
