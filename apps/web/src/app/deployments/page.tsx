"use client";

import { DeploymentTable } from "@/components/deployments/DeploymentTable";
import { Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeploymentsPage() {
  const router = useRouter();

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]"><Sparkles className="size-3.5" /> Infrastructure</div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[var(--text-main)]">Deployments</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Manage and monitor your model deployments across infrastructure.</p>
        </div>
        <button type="button" onClick={() => router.push("/workloads/create")} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-md)]"><Plus className="size-4" />Create deployment</button>
      </header>
      <DeploymentTable />
    </div>
  );
}
