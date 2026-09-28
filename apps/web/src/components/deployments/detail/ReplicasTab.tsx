/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter } from "next/navigation";
import { Cpu, Database, Map, RefreshCw, Search, Server, Wifi, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/ui/Logos";
import { CopyButton } from "@/components/ui/CopyButton";

function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Server }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        <Icon className="size-4 text-[var(--text-muted)]" />
      </div>
      <div className="font-heading mt-2 text-xl font-bold tracking-tight text-[var(--text-main)]">{value}</div>
      <div className="mt-1 text-[11px] text-[var(--text-muted)]">{detail}</div>
    </div>
  );
}

export function ReplicasTab({ nodes = [], deployment, statusVariant }: { nodes: any[]; deployment?: any; statusVariant?: any }) {
  const router = useRouter();
  const readyNodes = nodes.filter((n) => ["READY", "RUNNING", "HEALTHY"].includes(String(n.InfraStatus).toUpperCase())).length;

  return (
    <div className="space-y-3">
      {/* Stat Cards Row */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Assigned Nodes" value={nodes.length ? String(nodes.length) : "-"} detail="Deployment replicas" icon={Server} />
        <Stat label="Healthy Replicas" value={nodes.length ? `${readyNodes} / ${nodes.length}` : "-"} detail="Passing health checks" icon={Wifi} />
        <Stat label="Total GPU Capacity" value="- / -" detail="Capacity reported by nodes" icon={Cpu} />
        <Stat label="System Memory" value="- / -" detail="Allocation reported by nodes" icon={Database} />
      </div>

      {/* Distribution & Resource Grid */}
      <div className="grid gap-3 lg:grid-cols-[1fr_1.3fr]">
        {/* Node Distribution Placeholder */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div className="flex items-center gap-2">
              <Map size={14} className="text-[var(--text-muted)]" />
              <h2 className="text-sm font-bold text-[var(--text-main)]">Node Distribution</h2>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">Reserved</span>
          </div>
          <div className="flex h-36 items-center justify-center rounded border border-dashed border-[var(--border)] bg-[var(--surface-hover)] text-center p-4">
            <div>
              <Map className="mx-auto size-5 text-[var(--text-muted)] opacity-40" />
              <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">Topology data reserved</p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)] opacity-70">Geographic routing connects when backend telemetry is live.</p>
            </div>
          </div>
        </div>

        {/* Aggregate Hardware Capacity */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">Aggregate Hardware Capacity</h2>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Combined replica utilization</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-hover)] p-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5 font-medium"><Cpu size={14} /> GPU Utilization</span>
                <span className="font-mono">-</span>
              </div>
              <div className="mt-2 text-base font-semibold text-[var(--text-main)]">- / -</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]" />
            </div>

            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-hover)] p-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5 font-medium"><HardDrive size={14} /> VRAM Allocated</span>
                <span className="font-mono">-</span>
              </div>
              <div className="mt-2 text-base font-semibold text-[var(--text-main)]">- / -</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Nodes Table Section - Strictly uses actual data */}
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card-bg)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-main)]">Nodes ({nodes.length})</h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Registered node replicas serving this deployment</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-2.5 py-1.5 text-xs text-[var(--text-muted)]">
              <Search className="size-3.5" />
              <span>Search nodes...</span>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-hover)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
              title="Refresh nodes"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-hover)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Node ID</th>
                <th className="px-4 py-3 font-semibold">Provider</th>
                <th className="px-4 py-3 font-semibold">Instance Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">GPU</th>
                <th className="px-4 py-3 font-semibold">GPU Memory</th>
                <th className="px-4 py-3 font-semibold">Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {nodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-[var(--text-muted)]">
                    No nodes registered yet. Node capacity and health details will appear here as replicas scale.
                  </td>
                </tr>
              ) : (
                nodes.map((node: any, idx: number) => {
                  const nodeStatus = node.InfraStatus || "UNKNOWN";
                  const badgeVariant = statusVariant ? statusVariant(nodeStatus) : "default";

                  return (
                    <tr
                      key={node.ID || idx}
                      onClick={() => deployment?.ID && router.push(`/deployments/${deployment.ID}/nodes/${node.ID}`)}
                      className="group cursor-pointer border-b border-[var(--border)] transition-colors duration-150 last:border-0 hover:bg-[var(--surface-hover)]"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-[var(--text-main)]">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          <span>{node.ID}</span>
                          <CopyButton value={node.ID} size={12} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium text-[var(--text-main)] capitalize">
                          {node.ProviderID ? <Logo name={node.ProviderID} size={15} /> : null}
                          <span>{node.ProviderID || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {node.InstanceName || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={badgeVariant}>{nodeStatus}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {node.GpuSpec || "- / -"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {node.GpuMemory || "-"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {node.Heartbeat || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
