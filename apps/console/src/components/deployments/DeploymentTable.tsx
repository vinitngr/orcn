"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Clock3,
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
  provider: string;
  resource: string;
  replicas: string;
  created: string;
};

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
  const [query, setQuery] = useState("");
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

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
                
                let status = deployment.Status || "UNKNOWN";
                const hasErrorNode = deployment.Nodes?.some((n: any) =>
                  n.InfraStatus?.toLowerCase() === "error" ||
                  n.InfraStatus?.toLowerCase() === "failed" ||
                  n.AppStatus?.toLowerCase() === "error" ||
                  n.AppStatus?.toLowerCase() === "failed"
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
                  provider: deployment.ProviderID || "-",
                  resource: deployment.InstanceName || "-",
                  replicas: `${nodeCount} / ${replicas}`,
                  created: deployment.CreatedAt
                    ? new Date(deployment.CreatedAt).toLocaleDateString()
                    : "-",
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
      const matchesQuery =
        !normalizedQuery ||
        [
          deployment.name,
          deployment.model,
          deployment.provider,
          deployment.resource,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesProvider && matchesQuery;
    });
  }, [deployments, providerFilter, query, statusFilter]);

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
              Model deployments
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Monitor model instances across your infrastructure.
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-color)]">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {[
                  "Deployment",
                  "Status",
                  "Model",
                  "Provider",
                  "Replicas",
                  "Resource",
                  "Requests (24h)",
                  "Latency",
                  "Created",
                  "",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-14 text-center text-xs text-[var(--text-muted)]"
                  >
                    Loading deployments...
                  </td>
                </tr>
              ) : filteredDeployments.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-14 text-center text-xs text-[var(--text-muted)]"
                  >
                    No deployments match these filters.
                  </td>
                </tr>
              ) : (
                filteredDeployments.map((deployment) => (
                  <tr
                    key={deployment.id}
                    onClick={() => router.push(`/deployments/${deployment.id}`)}
                    className="group cursor-pointer border-b border-[var(--border)] text-xs text-[var(--text-main)] transition-colors duration-200 last:border-0 hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium">{deployment.name}</div>
                      <div className="mt-1 font-mono text-[10px] text-[var(--text-light)]">
                        {deployment.id.slice(0, 14)}...
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium ${statusStyle(deployment.status)}`}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {deployment.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="max-w-32 truncate font-medium">
                        {deployment.model}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-md bg-[var(--surface-hover)] text-[var(--text-main)]">
                          <Logo name={deployment.provider} size={16} />
                        </span>
                        <span>{deployment.provider}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-[var(--text-muted)]">
                      {deployment.replicas}
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-28 truncate text-[var(--text-muted)]">
                        {deployment.resource}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex h-9 min-w-24 items-center justify-center rounded-md border border-dotted border-[var(--border-hover)] text-[10px] text-[var(--text-light)]">
                        --
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex h-9 min-w-20 items-center justify-center rounded-md border border-dotted border-[var(--border-hover)] text-[10px] text-[var(--text-light)]">
                        --
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-[var(--text-muted)]">
                      {deployment.created}
                    </td>
                    <td className="px-4 py-4 text-right">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[var(--border)] px-4 py-3 text-[10px] text-[var(--text-light)]">
          Showing {filteredDeployments.length} of {deployments.length}{" "}
          deployments
        </div>
      </div>
    </div>
  );
}
