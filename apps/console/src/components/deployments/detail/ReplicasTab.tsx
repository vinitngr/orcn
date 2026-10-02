/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Cpu,
  Database,
  Map,
  RefreshCw,
  Search,
  Server,
  Wifi,
  HardDrive,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/ui/Logos";
import { CopyButton } from "@/components/ui/CopyButton";
import { shortNodeId } from "@/components/deployments/node-detail/shared";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

function Stat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Server;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
        <Icon className="size-4 text-[var(--text-muted)]" />
      </div>
      <div className="font-heading mt-2 text-xl font-bold tracking-tight text-[var(--text-main)]">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-[var(--text-muted)]">{detail}</div>
    </div>
  );
}

function timeAgo(iso?: string): string {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "-";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatUptime(iso?: string, live?: boolean): string {
  if (!live || !iso) return "--";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "--";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function statusDot(status?: string): string {
  const v = String(status || "").toUpperCase();
  if (["RUNNING", "READY", "HEALTHY"].includes(v)) return "bg-emerald-500";
  if (["PENDING", "SCALING", "PARTIAL"].includes(v)) return "bg-amber-500";
  if (["STOPPED", "FAILED", "ERROR"].includes(v)) return "bg-red-500";
  return "bg-gray-400";
}

function isLiveStatus(status?: string): boolean {
  return ["RUNNING", "READY", "HEALTHY"].includes(
    String(status || "").toUpperCase(),
  );
}

export function ReplicasTab({
  nodes = [],
  deployment,
  statusVariant,
}: {
  nodes: any[];
  deployment?: any;
  statusVariant?: any;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [nodeQuery, setNodeQuery] = useState("");
  const [nodeStatusFilter, setNodeStatusFilter] = useState(
    () => searchParams.get("status") ?? "all",
  );

  const writeParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null || value === "" || value === "all") next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const applyNodeStatus = (value: string) => {
    const normalized = String(value ?? "all").toUpperCase();
    setNodeStatusFilter(normalized);
    writeParam("status", normalized === "ALL" ? "all" : normalized.toLowerCase());
  };

  const nodeStatusValues = useMemo(() => {
    const unique = new Set<string>();
    nodes.forEach((n) =>
      unique.add(String(n.InfraStatus || "UNKNOWN").toUpperCase()),
    );
    return Array.from(unique).sort();
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    const q = nodeQuery.trim().toLowerCase();
    const status = nodeStatusFilter.toUpperCase();
    return nodes.filter((n) => {
      const matchesStatus =
        status === "ALL" ||
        String(n.InfraStatus || "UNKNOWN").toUpperCase() === status;
      const matchesQuery =
        !q ||
        String(n.ID || "").toLowerCase().includes(q) ||
        String(n.ProviderID || "").toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [nodes, nodeQuery, nodeStatusFilter]);

  const readyNodes = nodes.filter((n) =>
    ["READY", "RUNNING", "HEALTHY"].includes(
      String(n.InfraStatus).toUpperCase(),
    ),
  ).length;

  return (
    <div className="space-y-3">
      {/* Stat Cards Row */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total Assigned Nodes"
          value={nodes.length ? String(nodes.length) : "-"}
          detail="Deployment replicas"
          icon={Server}
        />
        <Stat
          label="Healthy Replicas"
          value={nodes.length ? `${readyNodes} / ${nodes.length}` : "-"}
          detail="Passing health checks"
          icon={Wifi}
        />
        <Stat
          label="Total GPU Capacity"
          value="- / -"
          detail="Capacity reported by nodes"
          icon={Cpu}
        />
        <Stat
          label="System Memory"
          value="- / -"
          detail="Allocation reported by nodes"
          icon={Database}
        />
      </div>

      {/* Distribution & Resource Grid */}
      <div className="grid gap-3 lg:grid-cols-[1fr_1.3fr]">
        {/* Node Distribution Placeholder */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div className="flex items-center gap-2">
              <Map size={14} className="text-[var(--text-muted)]" />
              <h2 className="text-sm font-bold text-[var(--text-main)]">
                Node Distribution
              </h2>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">
              Reserved
            </span>
          </div>
          <div className="flex h-36 items-center justify-center rounded border border-dashed border-[var(--border)] bg-[var(--surface-hover)] text-center p-4">
            <div>
              <Map className="mx-auto size-5 text-[var(--text-muted)] opacity-40" />
              <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
                Topology data reserved
              </p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)] opacity-70">
                Geographic routing connects when backend telemetry is live.
              </p>
            </div>
          </div>
        </div>

        {/* Aggregate Hardware Capacity */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">
                Aggregate Hardware Capacity
              </h2>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                Combined replica utilization
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-hover)] p-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Cpu size={14} /> GPU Utilization
                </span>
                <span className="font-mono">-</span>
              </div>
              <div className="mt-2 text-base font-semibold text-[var(--text-main)]">
                - / -
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]" />
            </div>

            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-hover)] p-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5 font-medium">
                  <HardDrive size={14} /> VRAM Allocated
                </span>
                <span className="font-mono">-</span>
              </div>
              <div className="mt-2 text-base font-semibold text-[var(--text-main)]">
                - / -
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Nodes Section */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card-bg)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-main)]">
              Nodes ({filteredNodes.length})
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Registered node replicas serving this deployment
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-color)] px-3 focus-within:border-[var(--border-hover)]">
              <Search className="size-3.5 text-[var(--text-light)]" />
              <input
                value={nodeQuery}
                onChange={(event) => setNodeQuery(event.target.value)}
                placeholder="Search nodes..."
                className="w-36 bg-transparent text-xs text-[var(--text-main)] outline-none placeholder:text-[var(--text-light)]"
              />
            </label>
            <Select
              value={
                nodeStatusFilter.toUpperCase() === "ALL"
                  ? "all"
                  : nodeStatusFilter.toUpperCase()
              }
              onValueChange={(nextValue: string) =>
                applyNodeStatus(String(nextValue ?? "all"))
              }
            >
              <SelectTrigger className="h-9 min-w-32 border-[var(--border)] bg-[var(--bg-color)] text-xs text-[var(--text-main)]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All statuses</SelectItem>
                  {nodeStatusValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.charAt(0) + value.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => {
                setNodeQuery("");
                applyNodeStatus("all");
              }}
              className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-2.5 text-[var(--text-muted)] transition hover:text-[var(--text-main)]"
              title="Reset filters"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1180px] divide-y divide-[var(--border)]">
            {filteredNodes.length === 0 ? (
              <div className="px-4 py-14 text-center text-xs text-[var(--text-muted)]">
                {nodes.length === 0
                  ? "No nodes registered yet. Node capacity and health details will appear here as replicas scale."
                  : "No nodes match these filters."}
              </div>
            ) : (
              filteredNodes.map((node: any, idx: number) => {
                const nodeStatus = node.InfraStatus || "UNKNOWN";
                const badgeVariant = statusVariant
                  ? statusVariant(nodeStatus)
                  : "default";
                const live = isLiveStatus(node.InfraStatus);
                const created = node.CreatedAt
                  ? new Date(node.CreatedAt).toLocaleDateString()
                  : "-";
                const updatedAbsolute = node.UpdatedAt
                  ? new Date(node.UpdatedAt).toLocaleString()
                  : "-";

                return (
                  <div
                    key={node.ID || idx}
                    onClick={() =>
                      deployment?.ID &&
                      router.push(
                        `/deployments/${deployment.ID}/nodes/${node.ID}`,
                      )
                    }
                    className="grid cursor-pointer grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] items-start gap-6 px-5 py-6 transition-colors duration-200 hover:bg-[var(--surface-hover)]"
                  >
                    {/* Node identity */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 shrink-0 rounded-full ${statusDot(node.InfraStatus)}`}
                        />
                        <span className="truncate text-sm font-bold text-[var(--text-main)]">
                          {shortNodeId(node.ID || `node-${idx + 1}`)}
                        </span>
                      </div>
                      <div
                        className="mt-2 flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate font-mono text-[11px] text-[var(--text-muted)]">
                          {node.ID}
                        </span>
                        <CopyButton value={node.ID} size={12} />
                      </div>
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                          {node.ProviderID ? (
                            <Logo name={node.ProviderID} size={12} />
                          ) : null}
                          <span className="capitalize">
                            {node.ProviderID || "unknown"}
                          </span>
                        </span>
                      </div>
                    </div>
                    {/* Instance / app */}
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-[var(--text-muted)]">
                        Instance Type
                      </div>
                      <div className="mt-2 truncate text-sm font-bold text-[var(--text-main)]">
                        {node.InstanceName ||
                          deployment?.InstanceName ||
                          deployment?.InstanceTypeID ||
                          "--"}
                      </div>
                      <div className="mt-3">
                        <div className="text-[11px] font-medium text-[var(--text-muted)]">
                          App Status
                        </div>
                        <div className="mt-1.5">
                          <Badge
                            variant={
                              statusVariant
                                ? statusVariant(node.AppStatus || "UNKNOWN")
                                : "default"
                            }
                          >
                            {node.AppStatus || "UNKNOWN"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {/* GPU placeholder */}
                    <div
                      className="min-w-0"
                      title="GPU telemetry not reported yet"
                    >
                      <div className="text-[11px] font-medium text-[var(--text-muted)]">
                        GPU
                      </div>
                      <div className="mt-2 truncate text-sm font-bold text-[var(--text-light)]">
                        {node.GpuSpec || "--"}
                      </div>
                      <div className="mt-3 text-[11px] text-[var(--text-light)]">
                        Pending telemetry
                      </div>
                    </div>
                    {/* GPU memory placeholder */}
                    <div
                      className="min-w-0"
                      title="GPU memory telemetry not reported yet"
                    >
                      <div className="text-[11px] font-medium text-[var(--text-muted)]">
                        GPU Memory
                      </div>
                      <div className="mt-2 truncate text-sm font-bold text-[var(--text-light)]">
                        {node.GpuMemory || "--"}
                      </div>
                      <div className="mt-3 text-[11px] text-[var(--text-light)]">
                        Pending telemetry
                      </div>
                    </div>
                    {/* Infra status */}
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-[var(--text-muted)]">
                        Infra Status
                      </div>
                      <div className="mt-2">
                        <Badge variant={badgeVariant}>{nodeStatus}</Badge>
                      </div>
                      <div className="mt-3 text-[11px] text-[var(--text-muted)]">
                        Replica {idx + 1} of {filteredNodes.length}
                      </div>
                    </div>
                    {/* Uptime */}
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-[var(--text-muted)]">
                        Uptime
                      </div>
                      <div className="mt-2 whitespace-nowrap text-sm font-bold text-[var(--text-main)]">
                        {formatUptime(node.CreatedAt, live)}
                      </div>
                      <div className="mt-3 text-[11px] text-[var(--text-muted)]">
                        {live ? "Running" : "Not running"}
                      </div>
                    </div>
                    {/* Heartbeat */}
                    <div className="min-w-0" title={updatedAbsolute}>
                      <div className="text-[11px] font-medium text-[var(--text-muted)]">
                        Last Heartbeat
                      </div>
                      <div className="mt-2 whitespace-nowrap text-sm font-bold text-[var(--text-main)]">
                        {timeAgo(node.UpdatedAt)}
                      </div>
                      <div className="mt-3 text-[11px] text-[var(--text-muted)]">
                        {created}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center justify-end pt-1">
                      <ChevronRight className="size-4 text-[var(--text-light)]" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
