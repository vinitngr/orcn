"use client";

import { useState, useEffect, useMemo } from "react";
import { HardDrive, Server } from "lucide-react";

import { ComputeInstance } from "@/components/create/instance-utils";
import { ProviderInfo } from "./compute-types";
import {
  type ProviderConnection,
  fetchConnections,
} from "@/components/providers/api";
import ProviderConnectionSection from "./ProviderConnectionSection";
import ComputeFiltersSection from "./ComputeFiltersSection";
import ComputeInstancesList from "./ComputeInstancesList";
import ComputeProviderConfigSection from "./ComputeProviderConfigSection";

interface ComputePanelProps {
  selectedProvider: string;
  onSelectProvider: (providerId: string) => void;
  selectedConnectionId?: string;
  onSelectConnection?: (connection: ProviderConnection) => void;
  instances: ComputeInstance[];
  selectedInstance?: ComputeInstance | null;
  onSelectInstance: (instance: ComputeInstance) => void;
  requiredVram: number;
  selectedModel: string;
  providerConfig?: Record<string, string>;
  onProviderConfigChange?: (key: string, value: string) => void;
  volumeSizeGb?: number;
  onVolumeSizeGbChange?: (size: number) => void;
}

export function ComputePanel({
  selectedProvider,
  selectedConnectionId = "",
  onSelectConnection,
  instances,
  selectedInstance,
  onSelectInstance,
  requiredVram,
  selectedModel,
  providerConfig = {},
  onProviderConfigChange,
  volumeSizeGb = 50,
  onVolumeSizeGbChange,
}: ComputePanelProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [instanceSearch, setInstanceSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("price_asc");
  const [showProviderAdvanced, setShowProviderAdvanced] = useState(false);

  // Fetch dynamic providers list from backend
  useEffect(() => {
    fetch("/api/v1/providers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.providers)) {
          setProviders(data.providers);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch saved provider connections (connectors)
  useEffect(() => {
    fetchConnections()
      .then(setConnections)
      .catch((e) =>
        setConnectionsError(
          e instanceof Error ? e.message : "Failed to load connectors",
        ),
      )
      .finally(() => setConnectionsLoading(false));
  }, []);

  const activeProvider = providers.find((p) => p.id === selectedProvider) ||
    providers[0] || {
      id: selectedProvider,
      name: selectedProvider,
      description: "",
      type: "cloud",
      schema: [],
    };

  // Filter instances
  const filteredInstances = useMemo(() => {
    let list = [...instances];

    // Text search
    if (instanceSearch.trim()) {
      const q = instanceSearch.toLowerCase();
      list = list.filter(
        (i) =>
          (i.name && i.name.toLowerCase().includes(q)) ||
          (i.id && i.id.toLowerCase().includes(q)) ||
          (i.tag && i.tag.toLowerCase().includes(q)) ||
          (i.gpu_model && i.gpu_model.toLowerCase().includes(q)),
      );
    }

    // Device type filter — classification comes from the backend (device_type)
    if (deviceFilter !== "all") {
      list = list.filter((i) => (i.device_type || "") === deviceFilter);
    }

    // Sorting
    if (sortBy === "price_asc") {
      list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else if (sortBy === "vram_desc") {
      list.sort((a, b) => (b.vram_gb ?? 0) - (a.vram_gb ?? 0));
    }

    return list;
  }, [instances, instanceSearch, deviceFilter, sortBy]);

  // Show device filter only when the backend data distinguishes device types
  const hasDeviceTypes = useMemo(
    () => instances.some((i) => i.device_type !== undefined),
    [instances],
  );

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm space-y-6">
      {/* VRAM requirement notice */}
      {selectedModel && requiredVram > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-[var(--dm-divider)] bg-[var(--dm-card)] px-4 py-3 text-xs">
          <HardDrive className="size-4 shrink-0 text-blue-400" />
          <span className="text-[var(--text-muted)]">
            Estimated{" "}
            <span className="font-semibold text-[var(--text-main)]">
              ~{Math.ceil(requiredVram)} GB
            </span>{" "}
            VRAM needed for{" "}
            <span className="font-mono text-[var(--dm-text-2)]">
              {selectedModel.split("/").pop()}
            </span>
          </span>
        </div>
      )}

      {/* 1. Provider Connection Selection */}
      <ProviderConnectionSection
        connections={connections}
        isLoading={connectionsLoading}
        error={connectionsError}
        selectedConnectionId={selectedConnectionId}
        onSelect={(connection) => onSelectConnection?.(connection)}
      />

      {/* 2. Hardware Instance Selection */}
      <div className="pt-2 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              2. Hardware Instance
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-light)]">
              Available compute resources on {activeProvider.name}.
            </p>
          </div>
          <span className="text-xs text-[var(--text-light)] font-mono">
            {filteredInstances.length} of {instances.length} instance
            {instances.length !== 1 ? "s" : ""}
          </span>
        </div>

        <ComputeFiltersSection
          instanceSearch={instanceSearch}
          setInstanceSearch={setInstanceSearch}
          deviceFilter={deviceFilter}
          setDeviceFilter={setDeviceFilter}
          hasDeviceTypes={hasDeviceTypes}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        <ComputeInstancesList
          instances={filteredInstances}
          totalInstances={instances.length}
          requiredVram={requiredVram}
          selectedInstance={selectedInstance}
          onSelectInstance={onSelectInstance}
        />
      </div>

      {/* 4. Volume, Required & Advanced Provider Configuration */}
      <ComputeProviderConfigSection
        activeProvider={activeProvider}
        providerConfig={providerConfig}
        onProviderConfigChange={onProviderConfigChange}
        volumeSizeGb={volumeSizeGb}
        onVolumeSizeGbChange={onVolumeSizeGbChange}
        showProviderAdvanced={showProviderAdvanced}
        setShowProviderAdvanced={setShowProviderAdvanced}
      />
    </div>
  );
}

export default ComputePanel;
