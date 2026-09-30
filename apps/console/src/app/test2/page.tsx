"use client";

import DeploymentCard from "./deployment";
import InferenceRequestsCard from "./inference_req";
import LatencyCard from "./latency";
import ProviderNodeCard from "./provider-node";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#090b0e] px-4 py-5 text-white">
      <div className="w-full">
        <div className="grid grid-cols-4 gap-3">
          <div className="min-w-0 h-[200px]">
            <DeploymentCard />
          </div>

          <div className="min-w-0 h-[200px]">
            <InferenceRequestsCard />
          </div>

          <div className="min-w-0 h-[200px]">
            <LatencyCard />
          </div>

          <div className="min-w-0 h-[200px]">
            <ProviderNodeCard />
          </div>
        </div>

        {/* Existing deployments table */}
        <div className="mt-5">
          {/* existing table */}
        </div>
      </div>
    </main>
  );
}