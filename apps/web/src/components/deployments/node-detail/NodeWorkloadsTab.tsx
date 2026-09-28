/* eslint-disable @typescript-eslint/no-explicit-any */
import { Boxes, Braces, Cpu, Database, MoreHorizontal, RotateCcw, Server, Square, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MetricTile, SectionCard } from "@/components/deployments/node-detail/shared";

type Props = {
  deployment: any;
  node: any;
  statusVariant: (status: string) => "default" | "success" | "warning" | "error";
  onOpenTab: (tab: string, opts?: { container?: string }) => void;
};

export function NodeWorkloadsTab({ deployment, node, statusVariant, onOpenTab }: Props) {
  let containers: any[] = [];
  try {
    const spec = deployment.JobSpecJSON ? JSON.parse(deployment.JobSpecJSON) : null;
    containers = Array.isArray(spec?.containers) ? spec.containers : [];
  } catch {
    containers = [];
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Declared Containers" value={String(containers.length || "--")} meta="From job spec" />
        <MetricTile label="Running" value="--" meta="Runtime reporting pending" />
        <MetricTile label="GPU Assigned" value="--" meta="Hardware pending" />
        <MetricTile label="Memory" value="--" meta="Allocation pending" />
      </div>

      <SectionCard
        title={`Running Workloads (${containers.length || 0})`}
        subtitle="Container operations run inside this node"
        action={<Boxes className="size-4 text-[var(--text-muted)]" />}
      >
        {containers.length === 0 ? (
          <div className="rounded border border-dashed border-[var(--border)] px-3 py-8 text-center">
            <Server className="mx-auto size-5 text-[var(--text-muted)] opacity-40" />
            <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">No containers in job spec</p>
            <p className="mt-1 text-[10px] text-[var(--text-muted)] opacity-70">
              Workload rows populate from the deployment job definition.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Image</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">GPU</th>
                  <th className="pb-2 font-medium">Memory</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((c: any, idx: number) => (
                  <tr key={c.id || idx} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2.5 font-medium text-[var(--text-main)]">{c.id || `container-${idx + 1}`}</td>
                    <td className="py-2.5 font-mono text-[11px] text-[var(--text-muted)]">{c.args?.image || "-"}</td>
                    <td className="py-2.5">
                      <Badge variant={statusVariant(node.AppStatus || node.InfraStatus || "UNKNOWN")}>
                        {node.AppStatus || node.InfraStatus || "UNKNOWN"}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Cpu size={11} /> --
                      </span>
                    </td>
                    <td className="py-2.5 text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Database size={11} /> --
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <ContainerActions onOpenTab={onOpenTab} containerId={c.id || `container-${idx + 1}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[10px] text-[var(--text-muted)] opacity-70">
          Restart / stop target the container on this node only — the node itself is never affected.
        </p>
      </SectionCard>
    </div>
  );
}

function ContainerActions({
  onOpenTab,
  containerId,
}: {
  onOpenTab: (tab: string, opts?: { container?: string }) => void;
  containerId: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-7 w-7 items-center justify-center rounded border border-transparent text-[var(--text-muted)] transition hover:border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
        aria-label="Container actions"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <RotateCcw /> Restart container (soon)
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Square /> Stop container (soon)
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onOpenTab("logs", { container: containerId })}>
            <Terminal /> View logs
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenTab("configuration")}>
            <Braces /> View config
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
