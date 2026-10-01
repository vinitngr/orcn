"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Boxes,
  Braces,
  Gauge,
  MoreHorizontal,
  Server,
  Terminal,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { Logo } from "@/components/ui/Logos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DetailShell } from "@/components/deployments/detail/DetailShell";
import { NodeOverviewTab } from "@/components/deployments/node-detail/NodeOverviewTab";
import { NodeMetricsTab } from "@/components/deployments/node-detail/NodeMetricsTab";
import { NodeWorkloadsTab } from "@/components/deployments/node-detail/NodeWorkloadsTab";
import { NodeEventsTab } from "@/components/deployments/node-detail/NodeEventsTab";
import { NodeLogsTab } from "@/components/deployments/node-detail/NodeLogsTab";
import { NodeConfigurationTab } from "@/components/deployments/node-detail/NodeConfigurationTab";
import { shortNodeId } from "@/components/deployments/node-detail/shared";

const tabOrder = [
  "overview",
  "metrics",
  "workloads",
  "events",
  "logs",
  "configuration",
] as const;
type TabId = (typeof tabOrder)[number];

type NodeRecord = {
  ID: string;
  InfraStatus?: string;
  AppStatus?: string;
  ProviderID?: string;
  EndpointsJSON?: string;
  NodeURL?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
};

type DeploymentRecord = {
  ID: string;
  Name: string;
  ProviderID?: string;
  ModelID?: string;
  InstanceName?: string;
  InstanceTypeID?: string;
  JobSpecJSON?: string;
  Endpoints?: unknown[];
  Nodes?: NodeRecord[];
};

export default function NodeDetailPage(props: {
  params: Promise<{ id: string; nodeId: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [deployment, setDeployment] = useState<DeploymentRecord | null>(null);
  const [node, setNode] = useState<NodeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const tabFromQuery = (searchParams.get("tab") as TabId | null) ?? "overview";
  const activeTab = tabOrder.includes(tabFromQuery) ? tabFromQuery : "overview";

  const setTab = (tab: TabId, extra?: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("container");
    if (tab === "overview") next.delete("tab");
    else next.set("tab", tab);
    for (const [key, value] of Object.entries(extra || {})) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const openTab = (tab: string, opts?: { container?: string }) =>
    setTab(
      tab as TabId,
      opts?.container ? { container: opts.container } : undefined,
    );

  useEffect(() => {
    const fetchNode = () => {
      fetch(`/api/v1/deployments/${params.id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Deployment not found");
          return res.json();
        })
        .then((data: DeploymentRecord) => {
          setDeployment(data);
          const found = (data.Nodes || []).find((n) => n.ID === params.nodeId);
          if (found) {
            setNode(found);
            setError("");
          } else {
            setError("Node not found within this deployment");
          }
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false));
    };

    fetchNode();
    const intervalId = setInterval(fetchNode, 3000);
    return () => clearInterval(intervalId);
  }, [params.id, params.nodeId]);

  const statusVariant = (status: string) => {
    const value = status?.toUpperCase();
    if (
      value === "RUNNING" ||
      value === "READY" ||
      value === "HEALTHY" ||
      value === "COMPLETED"
    ) {
      return "success" as const;
    }
    if (value === "PARTIAL" || value === "PENDING" || value === "SCALING")
      return "warning" as const;
    if (value === "STOPPED" || value === "FAILED" || value === "ERROR")
      return "error" as const;
    return "default" as const;
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-[var(--text-muted)]">
        Loading node details...
      </div>
    );
  }

  if (error || !node || !deployment) {
    return (
      <div className="p-16 text-center text-sm text-[var(--text-muted)]">
        {error || "Node not found."}
      </div>
    );
  }

  const shortId = shortNodeId(node.ID);
  let jobContainers: { id: string; image: string }[] = [];
  try {
    const spec = deployment.JobSpecJSON
      ? JSON.parse(deployment.JobSpecJSON)
      : null;
    jobContainers = Array.isArray(spec?.containers)
      ? spec.containers.map((c: any, i: number) => ({
          id: c.id || `container-${i + 1}`,
          image: c.args?.image || "-",
        }))
      : [];
  } catch {
    jobContainers = [];
  }
  const selectedContainer = searchParams.get("container");
  const tabItems = [
    { id: "overview" as const, label: "Overview", icon: Gauge },
    { id: "metrics" as const, label: "Metrics", icon: Activity },
    { id: "workloads" as const, label: "workloads", icon: Boxes },
    { id: "events" as const, label: "Events", icon: Server },
    { id: "logs" as const, label: "Logs", icon: Terminal },
    { id: "configuration" as const, label: "Configuration", icon: Braces },
  ];

  return (
    <div className="mx-auto max-w-[1450px] pb-16">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/deployments/${params.id}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-main)]"
            aria-label="Back to deployment"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex size-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)]">
            <Server className="size-5" />
          </div>
          <div>
            <div className="mb-0.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
              <Link
                href="/deployments"
                className="hover:text-[var(--text-main)]"
              >
                Deployments
              </Link>
              <span className="text-[var(--text-light)]">/</span>
              <Link
                href={`/deployments/${params.id}`}
                className="hover:text-[var(--text-main)]"
              >
                {deployment.Name}
              </Link>
              <span className="text-[var(--text-light)]">/</span>
              <span>Nodes</span>
              <span className="text-[var(--text-light)]">/</span>
              <span className="font-mono text-xs text-[var(--text-main)]">
                {node.ID}
              </span>
              <CopyButton value={node.ID} size={12} />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
                {shortId}...
              </h1>
              <Badge variant={statusVariant(node.InfraStatus || "")}>
                {node.InfraStatus || "UNKNOWN"}
              </Badge>
              {(node.ProviderID || deployment.ProviderID) && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                  <Logo
                    name={node.ProviderID || deployment.ProviderID || "nosana"}
                    size={12}
                  />
                  <span className="capitalize">
                    {node.ProviderID || deployment.ProviderID}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-main)] transition hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]">
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>Restart node (soon)</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/deployments/${params.id}`)}
              >
                View deployment
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mb-6 flex items-center gap-6 overflow-x-auto border-b border-[var(--border)] px-1">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={[
              "relative flex shrink-0 items-center gap-2 py-3 text-xs font-semibold transition-colors duration-150",
              activeTab === tab.id
                ? "-mb-[1px] border-b-2 border-[var(--text-main)] text-[var(--text-main)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]",
            ].join(" ")}
          >
            <tab.icon className="size-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <DetailShell>
        {activeTab === "overview" && (
          <NodeOverviewTab
            deployment={deployment}
            node={node}
            onOpenTab={openTab}
            statusVariant={statusVariant}
          />
        )}
        {activeTab === "metrics" && (
          <NodeMetricsTab
            key={`${deployment.ID}:${node.ID}:metrics`}
            deploymentId={deployment.ID}
            nodeId={node.ID}
            enabled={activeTab === "metrics"}
          />
        )}
        {activeTab === "workloads" && (
          <NodeWorkloadsTab
            deployment={deployment}
            node={node}
            statusVariant={statusVariant}
            onOpenTab={openTab}
          />
        )}
        {activeTab === "events" && (
          <NodeEventsTab
            key={`${deployment.ID}:${node.ID}:events`}
            deploymentId={deployment.ID}
            nodeId={node.ID}
          />
        )}
        {activeTab === "logs" && (
          <NodeLogsTab
            key={`${deployment.ID}:${node.ID}:logs`}
            deploymentId={deployment.ID}
            nodeId={node.ID}
            containers={jobContainers}
            selected={selectedContainer}
            onSelect={(id) =>
              id ? setTab("logs", { container: id }) : setTab("logs")
            }
          />
        )}
        {activeTab === "configuration" && (
          <NodeConfigurationTab deployment={deployment} node={node} />
        )}
      </DetailShell>
    </div>
  );
}
