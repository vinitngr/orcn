"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Braces,
  Gauge,
  MoreHorizontal,
  Network,
  Play,
  RotateCcw,
  Server,
  Square,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/ui/Logos";
import { CopyButton } from "@/components/ui/CopyButton";
import { DetailShell } from "@/components/deployments/detail/DetailShell";
import { OverviewTab } from "@/components/deployments/detail/OverviewTab";
import { MetricsTab } from "@/components/deployments/detail/MetricsTab";
import { ReplicasTab } from "@/components/deployments/detail/ReplicasTab";
import { ConfigurationTab } from "@/components/deployments/detail/ConfigurationTab";
import { APISection } from "@/components/deployments/detail/APISection";

const tabOrder = [
  "overview",
  "metrics",
  "replicas",
  "api",
  "configuration",
] as const;

type TabId = (typeof tabOrder)[number];

export default function DeploymentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [deployment, setDeployment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const tabFromQuery = (searchParams.get("tab") as TabId | null) ?? "overview";
  const activeTab = tabOrder.includes(tabFromQuery) ? tabFromQuery : "overview";

  const setTab = (tab: TabId) => {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "overview") next.delete("tab");
    else next.set("tab", tab);

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  useEffect(() => {
    fetch(`/api/v1/deployments/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Deployment not found");
        return res.json();
      })
      .then((data) => setDeployment(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleAction = async (action: string) => {
    if (!deployment) return;

    setActionLoading(true);
    try {
      if (action === "restart") {
        await fetch(`/api/v1/deployments/${deployment.ID}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        });
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await fetch(`/api/v1/deployments/${deployment.ID}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        });
      } else {
        await fetch(`/api/v1/deployments/${deployment.ID}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      }

      window.location.reload();
    } catch {
      alert("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const statusVariant = (status: string) => {
    const value = status?.toUpperCase();
    if (value === "RUNNING" || value === "READY") return "success";
    if (value === "PARTIAL" || value === "SCALING") return "warning";
    if (value === "STOPPED") return "error";
    return "default";
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-[var(--text-muted)]">
        Loading deployment...
      </div>
    );
  }

  if (error || !deployment) {
    return (
      <div className="p-16 text-center text-sm text-[var(--text-muted)]">
        Deployment not found.
      </div>
    );
  }

  const nodes = deployment.Nodes || [];
  let parsedSpec: any = null;
  try {
    parsedSpec = deployment.JobSpecJSON
      ? JSON.parse(deployment.JobSpecJSON)
      : null;
  } catch {
    parsedSpec = null;
  }

  const tabItems = [
    { id: "overview", label: "Overview", icon: Gauge },
    { id: "metrics", label: "Metrics", icon: Activity },
    {
      id: "replicas",
      label: "Replicas / Nodes",
      icon: Server,
      count: nodes.length || deployment.Replicas,
    },
    { id: "api", label: "API", icon: Network },
    { id: "configuration", label: "Configuration", icon: Braces },
  ];

  return (
    <div className="mx-auto max-w-[1450px] pb-16">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/deployments"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-main)]"
            aria-label="Back to deployments"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-3">
            {/* <div className="flex size-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] shadow-sm">
              <Logo name={deployment.ModelID || deployment.ProviderID || "model"} size={22} />
            </div> */}
            <div>
              <div className="mb-0.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                <span>Deployment</span>
                <span className="text-[var(--text-light)]">/</span>
                <span className="font-mono text-xs text-[var(--text-main)]">
                  {deployment.ID}
                </span>
                <CopyButton value={deployment.ID} size={12} />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
                  {deployment.Name}
                </h1>
                <CopyButton value={deployment.Name} size={14} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(deployment.Status)}>
            {deployment.Status}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-main)] transition hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]">
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => handleAction("restart")}
                  disabled={actionLoading}
                >
                  <RotateCcw className="mr-2 size-4" />
                  Restart
                </DropdownMenuItem>
                {deployment.Status !== "STOPPED" ? (
                  <DropdownMenuItem
                    onClick={() => handleAction("stop")}
                    disabled={actionLoading}
                  >
                    <Square className="mr-2 size-4" />
                    Stop
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => handleAction("start")}
                    disabled={actionLoading}
                  >
                    <Play className="mr-2 size-4" />
                    Start
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Underline Style Tab Switcher */}
      <div className="mb-6 flex items-center gap-6 border-b border-[var(--border)] px-1">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id as TabId)}
            className={[
              "relative flex items-center gap-2 py-3 text-xs font-semibold transition-colors duration-150",
              activeTab === tab.id
                ? "text-[var(--text-main)] border-b-2 border-[var(--text-main)] -mb-[1px]"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]",
            ].join(" ")}
          >
            <tab.icon className="size-3.5" />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <DetailShell>
        {activeTab === "overview" && (
          <OverviewTab
            deployment={deployment}
            nodes={nodes}
            onOpenTab={(tab) => setTab(tab as TabId)}
            statusVariant={statusVariant}
          />
        )}
        {activeTab === "metrics" && <MetricsTab />}
        {activeTab === "replicas" && (
          <ReplicasTab
            nodes={nodes}
            deployment={deployment}
            statusVariant={statusVariant}
          />
        )}
        {activeTab === "api" && <APISection deployment={deployment} />}
        {activeTab === "configuration" && (
          <ConfigurationTab config={parsedSpec} />
        )}
      </DetailShell>
    </div>
  );
}
