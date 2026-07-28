"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DeploymentTable } from "@/components/deployments/DeploymentTable";
import { useRouter } from "next/navigation";

export default function DeploymentsPage() {
  const router = useRouter();

  return (
    <div>
      <PageHeader 
        title="Deployments" 
        description="Find information about your deployments here"
        action={
          <Button onClick={() => router.push('/create')}>
            + Create Deployment
          </Button>
        }
      />
      <DeploymentTable />
    </div>
  );
}
