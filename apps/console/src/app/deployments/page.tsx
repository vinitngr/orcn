"use client";

import { DeploymentTable } from "@/components/deployments/DeploymentTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Boxes, ChevronDown, Plus, Sparkles, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeploymentsPage() {
  const router = useRouter();

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <Sparkles className="size-3.5" /> Infrastructure
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[var(--text-main)]">
            Deployments
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Manage and monitor your model deployments across infrastructure.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className=" group inline-flex h-8 items-stretch overflow-hidden rounded-sm bg-[var(--primary)] text-sm font-medium text-[var(--primary-foreground)] shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-md)]">
            <span className="inline-flex items-center gap-1 px-3">
              <Plus className="size-4" />
              Create
            </span>
            <span className="mx-0.5 my-1.5 w-px shrink-0 bg-[var(--primary-foreground)]/25" />
            <span className="inline-flex items-center px-2">
              <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[popup-open]:rotate-180" />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mt-2 bg-[var(--card-bg)] w-64 p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-light)]">
                Create new
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => router.push("/workloads/create")}
                className="items-start gap-2.5 rounded-md px-2 py-2"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-main)]">
                  <Boxes className="size-3.5" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-[var(--text-main)]">
                    Workload
                  </span>
                  <span className="text-[10px] leading-snug text-[var(--text-muted)]">
                    Create a deployment from a workload template
                  </span>
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/models/deploy")}
                className="items-start gap-2.5 rounded-md px-2 py-2"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-main)]">
                  <Zap className="size-3.5" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-[var(--text-main)]">
                    AI Model
                  </span>
                  <span className="text-[10px] leading-snug text-[var(--text-muted)]">
                    Deploy a model from the catalog to your infrastructure
                  </span>
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <DeploymentTable />
    </div>
  );
}
