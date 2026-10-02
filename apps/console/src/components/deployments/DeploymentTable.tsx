"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  MoreHorizontal,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Square,
} from "lucide-react";
import { Logo } from "../ui/Logos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";

type Deployment = {
  id: string;
  name: string;
  status: string;
  model: string;
  kind: string;
  provider: string;
  resource: string;
  replicas: string;
  nodeCount: number;
  desired: number;
  created: string;
  createdAt: string;
};

function statusDot(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "ready" || normalized === "running")
    return "bg-emerald-500";
  if (normalized === "scaling" || normalized === "pending")
    return "bg-amber-500";
  if (normalized === "error" || normalized === "failed") return "bg-red-500";
  return "bg-[var(--text-muted)]";
}

/** Grayscale identity logo: model logo for inference, container icon otherwise */
function logoFor(deployment: Deployment) {
  if (deployment.model && deployment.model !== "-") return deployment.model;
  if (deployment.kind.toLowerCase().includes("container")) return "container";
  return "model";
}

function kindLabel(kind: string) {
  const normalized = kind.toLowerCase();
  if (normalized.includes("container")) return "Container";
  if (normalized.includes("model")) return "Model inference";
  return kind || "-";
}

function timeAgo(iso: string) {
  if (!iso) return "-";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "-";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// Dynamic filter options will be generated from fetched deployments

function statusStyle(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "ready")
    return "border-[var(--status-ready-border)] bg-[var(--status-ready-bg)] text-[var(--status-ready)]";
  if (normalized === "running")
    return "border-[var(--status-running-border)] bg-[var(--status-running-bg)] text-[var(--status-running)]";
  if (normalized === "scaling")
    return "border-[var(--status-scaling-border)] bg-[var(--status-scaling-bg)] text-[var(--status-scaling)]";
  if (normalized === "pending")
    return "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending)]";
  if (normalized === "stopped")
    return "border-[var(--status-stopped-border)] bg-[var(--status-stopped-bg)] text-[var(--status-stopped)]";
  if (normalized === "error" || normalized === "failed")
    return "border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error)]";
  return "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-muted)]";
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-card)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          {label}
        </span>
        <Icon className="size-4 text-[var(--text-light)]" strokeWidth={1.8} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <strong className="font-heading text-2xl font-semibold tracking-tight text-[var(--text-main)]">
          {value}
        </strong>
        <span className="text-right text-[10px] text-[var(--text-light)]">
          {detail}
        </span>
      </div>
    </div>
  );
}

function FilterSelect({
  items,
  value,
  onChange,
}: {
  items: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(nextValue: string) =>
        onChange(String(nextValue ?? "all"))
      }
    >
      <SelectTrigger className="h-9 min-w-36 border-[var(--border)] bg-[var(--bg-color)] text-xs text-[var(--text-main)]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Filter</SelectLabel>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function DeploymentTable() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const copyField = (
    event: { stopPropagation: () => void },
    key: string,
    value: string,
  ) => {
    event.stopPropagation();
    const done = () => {
      setCopied(key);
      window.setTimeout(() => {
        setCopied((current) => (current === key ? null : current));
      }, 1200);
    };
    try {
      const clipboard = navigator.clipboard;
      if (clipboard?.writeText) {
        clipboard.writeText(value).then(done).catch(done);
        return;
      }
    } catch {
      /* fall through to done */
    }
    done();
  };

  const statusOptions = useMemo(() => {
    const unique = new Set<string>();
    deployments.forEach((d) => unique.add(d.status.toLowerCase()));
    const items = Array.from(unique).sort();
    const options: { label: string; value: string }[] = [
      { label: "All statuses", value: "all" },
    ];
    options.push(
      ...items.map((v) => ({
        label: v.charAt(0).toUpperCase() + v.slice(1),
        value: v,
      })),
    );
    return options;
  }, [deployments]);

  const providerOptions = useMemo(() => {
    const unique = new Set<string>();
    deployments.forEach((d) => unique.add(d.provider.toLowerCase()));
    const items = Array.from(unique).sort();
    const options: { label: string; value: string }[] = [
      { label: "All providers", value: "all" },
    ];
    options.push(...items.map((v) => ({ label: v.toUpperCase(), value: v })));
    return options;
  }, [deployments]);

  const typeOptions = useMemo(() => {
    const unique = new Set<string>();
    deployments.forEach((d) => unique.add(d.kind));
    const items = Array.from(unique).sort();
    const options: { label: string; value: string }[] = [
      { label: "All types", value: "all" },
    ];
    options.push(...items.map((v) => ({ label: kindLabel(v), value: v })));
    return options;
  }, [deployments]);

  useEffect(() => {
    fetch("/api/v1/deployments")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data))
          setDeployments(
            data
              .map((deployment) => {
                const nodeCount = deployment.Nodes?.length || 0;
                const replicas = deployment.Replicas || 0;
                const isStopped = nodeCount === 0 || replicas === 0;
                // Nodes stay listed with STOPPED/FAILED status after teardown,
                // so only live ones count toward the replica display.
                const onlineCount = (deployment.Nodes || []).filter((n: {
                  InfraStatus?: string;
                }) =>
                  ["RUNNING", "READY", "HEALTHY"].includes(
                    (n.InfraStatus || "").toUpperCase(),
                  ),
                ).length;
                
                let status = deployment.Status || "UNKNOWN";
                const hasErrorNode = deployment.Nodes?.some(
                  (n: { InfraStatus?: string; AppStatus?: string }) =>
                    n.InfraStatus?.toLowerCase() === "error" ||
                    n.InfraStatus?.toLowerCase() === "failed" ||
                    n.AppStatus?.toLowerCase() === "error" ||
                    n.AppStatus?.toLowerCase() === "failed",
                ) ?? false;
                
                if (hasErrorNode) {
                  status = "error";
                } else if (isStopped) {
                  status = "stopped";
                }
                
                return {
                  id: deployment.ID,
                  name: deployment.Name || "Unnamed deployment",
                  status: status.toLowerCase(),
                  model: deployment.ModelID || "-",
                  kind:
                    deployment.WorkloadType ||
                    (deployment.ModelID ? "model_inference" : "container"),
                  provider: deployment.ProviderID || "-",
                  resource: deployment.InstanceName || "-",
                  replicas: `${onlineCount} / ${replicas}`,
                  nodeCount: onlineCount,
                  desired: replicas,
                  created: deployment.CreatedAt
                    ? new Date(deployment.CreatedAt).toLocaleDateString()
                    : "-",
                  createdAt: deployment.CreatedAt || "",
                };
              })
              .reverse(),
          );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredDeployments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return deployments.filter((deployment) => {
      const matchesStatus =
        statusFilter === "all" ||
        deployment.status.toLowerCase() === statusFilter;
      const matchesProvider =
        providerFilter === "all" ||
        deployment.provider.toLowerCase().includes(providerFilter);
      const matchesType =
        typeFilter === "all" || deployment.kind === typeFilter;
      const matchesQuery =
        !normalizedQuery ||
        [
          deployment.name,
          deployment.model,
          deployment.provider,
          deployment.resource,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesProvider && matchesType && matchesQuery;
    });
  }, [deployments, providerFilter, query, statusFilter, typeFilter]);

  const runningCount = deployments.filter(
    (deployment) => deployment.status.toLowerCase() === "running",
  ).length;
  const readyCount = deployments.filter(
    (deployment) => deployment.status.toLowerCase() === "ready",
  ).length;
  const stoppedCount = deployments.filter(
    (deployment) => deployment.status.toLowerCase() === "stopped",
  ).length;
  const errorCount = deployments.filter(
    (deployment) => deployment.status.toLowerCase() === "error",
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total deployments"
          value={String(deployments.length)}
          detail="Across all workspaces"
          icon={Activity}
        />
        <StatCard
          label="Running"
          value={String(runningCount)}
          detail="Ready to serve traffic"
          icon={Activity}
        />
        <StatCard
          label="Ready"
          value={String(readyCount)}
          detail="Healthy & serving"
          icon={Activity}
        />
        <StatCard
          label="Stopped"
          value={String(stoppedCount)}
          detail="No active instances"
          icon={Clock3}
        />
        {/* <StatCard
          label="Error"
          value={String(errorCount)}
          detail="Failed deployments"
          icon={SlidersHorizontal}
        /> */}
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">
              Deployments
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Monitor workloads across your infrastructure.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex h-9 min-w-56 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-color)] px-3 focus-within:border-[var(--border-hover)]">
              <Search className="size-3.5 text-[var(--text-light)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search deployments..."
                className="min-w-0 flex-1 bg-transparent text-xs text-[var(--text-main)] outline-none placeholder:text-[var(--text-light)]"
              />
            </label>
            <FilterSelect
              items={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <FilterSelect
              items={providerOptions}
              value={providerFilter}
              onChange={setProviderFilter}
            />
            <FilterSelect
              items={typeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1120px] divide-y divide-[var(--border)]">
              {loading ? (
                <div className="px-4 py-14 text-center text-xs text-[var(--text-muted)]">
                    Loading deployments...
                </div>
              ) : filteredDeployments.length === 0 ? (
                <div className="px-4 py-14 text-center text-xs text-[var(--text-muted)]">
                    No deployments match these filters.
                </div>
              ) : (
                filteredDeployments.map((deployment) => {
                  const ratio =
                    deployment.desired > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (deployment.nodeCount / deployment.desired) * 100,
                          ),
                        )
                      : 0;
                  return (
                  <div
                    key={deployment.id}
                    onClick={() => router.push(`/deployments/${deployment.id}`)}
                    className="group grid cursor-pointer grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_auto] items-center gap-5 px-5 py-5 transition-colors duration-200 hover:bg-[var(--surface-hover)]"
                  >
                    {/* Deployment: logo + name | status over id */}
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-main)] grayscale ${
                          deployment.status === "stopped" ? "opacity-50" : ""
                        }`}
                      >
                        <Logo name={logoFor(deployment)} size={20} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={(e) =>
                              copyField(e, `${deployment.id}:name`, deployment.name)
                            }
                            title="Click to copy"
                            className="group/copy inline-flex min-w-0 cursor-pointer items-center gap-1 truncate text-sm font-semibold text-[var(--text-main)]"
                          >
                            <span className="truncate">{deployment.name}</span>
                            {copied === `${deployment.id}:name` ? (
                              <Check className="size-3 shrink-0 text-emerald-500" />
                            ) : (
                              <Copy className="hidden size-3 shrink-0 text-[var(--text-light)] group-hover/copy:inline" />
                            )}
                          </span>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyle(deployment.status)}`}
                          >
                            <span className="size-1.5 rounded-full bg-current" />
                            {deployment.status}
                          </span>
                        </div>
                        <div
                          onClick={(e) =>
                            copyField(e, `${deployment.id}:id`, deployment.id)
                          }
                          title="Click to copy"
                          className="group/copy mt-1 inline-flex max-w-full cursor-pointer items-center gap-1 truncate font-mono text-[10px] text-[var(--text-light)]"
                        >
                          <span className="truncate">{deployment.id}</span>
                          {copied === `${deployment.id}:id` ? (
                            <Check className="size-3 shrink-0 text-emerald-500" />
                          ) : (
                            <Copy className="hidden size-3 shrink-0 group-hover/copy:inline" />
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Model / workload kind */}
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-light)]">
                        Model
                      </div>
                      <div
                        onClick={(e) =>
                          copyField(e, `${deployment.id}:model`, deployment.model)
                        }
                        title="Click to copy"
                        className="group/copy mt-1 inline-flex max-w-full cursor-pointer items-center gap-1 truncate text-xs font-semibold text-[var(--text-main)]"
                      >
                        <span className="truncate">{deployment.model}</span>
                        {copied === `${deployment.id}:model` ? (
                          <Check className="size-3 shrink-0 text-emerald-500" />
                        ) : (
                          <Copy className="hidden size-3 shrink-0 text-[var(--text-light)] group-hover/copy:inline" />
                        )}
                      </div>
                      <div className="mt-1">
                        <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                          {kindLabel(deployment.kind)}
                        </span>
                      </div>
                    </div>
                    {/* Provider / instance */}
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-light)]">
                        Provider
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 truncate text-xs font-semibold text-[var(--text-main)]">
                        <Logo name={deployment.provider} size={14} />
                        <span className="truncate">{deployment.provider}</span>
                      </div>
                      <div className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                        {deployment.resource}
                      </div>
                    </div>
                    {/* Replicas */}
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-light)]">
                        Replicas
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[var(--text-main)]">
                          {deployment.replicas}
                        </span>
                        <span className="h-1 w-14 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                          <span
                            className={`block h-full rounded-full ${statusDot(deployment.status)}`}
                            style={{ width: `${ratio}%` }}
                          />
                        </span>
                      </div>
                      <div className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                        {deployment.nodeCount} of {deployment.desired} online
                      </div>
                    </div>
                    {/* Requests (24h) — telemetry placeholder */}
                    <div className="min-w-0" title="Request telemetry coming soon">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-light)]">
                        Requests
                      </div>
                      <div className="mt-1 font-mono text-xs font-semibold text-[var(--text-light)]">
                        --
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--text-light)]">
                        last 24h
                      </div>
                    </div>
                    {/* Latency — telemetry placeholder */}
                    <div className="min-w-0" title="Latency telemetry coming soon">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-light)]">
                        Latency
                      </div>
                      <div className="mt-1 font-mono text-xs font-semibold text-[var(--text-light)]">
                        --
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--text-light)]">
                        avg
                      </div>
                    </div>
                    {/* Created */}
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-light)]">
                        Created
                      </div>
                      <div className="mt-1 whitespace-nowrap text-xs font-semibold text-[var(--text-main)]">
                        {deployment.created}
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {timeAgo(deployment.createdAt)}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-0.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Actions for ${deployment.name}`}
                          className="inline-flex rounded-md p-1.5 text-[var(--text-light)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/deployments/${deployment.id}`)
                              }
                            >
                              <Eye />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Play />
                              Start
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RotateCcw />
                              Restart
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive">
                            <Square />
                            Stop
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronRight className="size-4 text-[var(--text-light)] transition group-hover:translate-x-0.5 group-hover:text-[var(--text-main)]" />
                    </div>
                  </div>
                  );
                })
              )}
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-4 py-3 text-[10px] text-[var(--text-light)]">
          Showing {filteredDeployments.length} of {deployments.length}{" "}
          deployments
        </div>
      </div>
    </div>
  );
}
