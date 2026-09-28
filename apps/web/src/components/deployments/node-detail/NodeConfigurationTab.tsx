/* eslint-disable @typescript-eslint/no-explicit-any */
import { Braces } from "lucide-react";
import { SpecViewer } from "@/components/deployments/detail/SpecViewer";
import { SectionCard } from "@/components/deployments/node-detail/shared";

type Props = {
  deployment: any;
  node: any;
};

export function NodeConfigurationTab({ deployment, node }: Props) {
  let parsedSpec: any = null;
  try {
    parsedSpec = deployment.JobSpecJSON ? JSON.parse(deployment.JobSpecJSON) : null;
  } catch {
    parsedSpec = null;
  }

  const nodeConfig = {
    node_id: node.ID,
    provider_id: node.ProviderID,
    infra_status: node.InfraStatus,
    app_status: node.AppStatus,
    endpoints: node.EndpointsJSON ? safeParse(node.EndpointsJSON) : null,
    deployment_id: deployment.ID,
    instance: deployment.InstanceName || deployment.InstanceTypeID || null,
    model_id: deployment.ModelID || null,
  };

  return (
    <div className="space-y-3">
      <SectionCard
        title="Node Configuration"
        subtitle="Resolved node metadata"
        action={<Braces className="size-4 text-[var(--text-muted)]" />}
      >
        <SpecViewer config={nodeConfig} />
      </SectionCard>

      <SectionCard title="Parent Job Spec" subtitle="Deployment job definition">
        {parsedSpec ? (
          <SpecViewer config={parsedSpec} />
        ) : (
          <div className="rounded border border-dashed border-[var(--border)] px-3 py-6 text-center text-[11px] text-[var(--text-muted)]">
            No job spec available for this deployment.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function safeParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
