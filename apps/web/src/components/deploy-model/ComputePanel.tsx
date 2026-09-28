"use client";

import { useState, useEffect, useMemo } from "react";
import {
  HardDrive,
  Server,
  AlertTriangle,
  Check,
  Cpu,
  Globe,
  Database,
  Search,
  ChevronDown,
  Layers,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/ui/Logos";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

export interface ProviderConfigField {
  key: string;
  name: string;
  description: string;
  type: "text" | "number" | "select" | "boolean" | string;
  required: boolean;
  is_advanced: boolean;
  default: string;
  options?: string[];
  placeholder?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  type: string;
  has_volume_support?: boolean;
  requires_regions?: boolean;
  requires_vpc?: boolean;
  features?: string[];
  regions?: string[];
  schema?: ProviderConfigField[];
}

interface ComputePanelProps {
  selectedProvider: string;
  onSelectProvider: (providerId: string) => void;
  markets: any[];
  selectedMarket: any;
  onSelectMarket: (market: any) => void;
  requiredVram: number;
  selectedModel: string;
  providerConfig?: Record<string, string>;
  onProviderConfigChange?: (key: string, value: string) => void;
  volumeSizeGb?: number;
  onVolumeSizeGbChange?: (size: number) => void;
}

export function ComputePanel({
  selectedProvider,
  onSelectProvider,
  markets,
  selectedMarket,
  onSelectMarket,
  requiredVram,
  selectedModel,
  providerConfig = {},
  onProviderConfigChange,
  volumeSizeGb = 50,
  onVolumeSizeGbChange,
}: ComputePanelProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([
    {
      id: "nosana",
      name: "Nosana Network",
      description: "Decentralized GPU compute network powered by Solana.",
      type: "depin",
      has_volume_support: false,
      requires_regions: false,
      features: ["On-demand GPUs", "Competitive Pricing", "Pay-as-you-go"],
      schema: [],
    },
    {
      id: "local",
      name: "Local Node",
      description: "Deploy directly on your connected local worker node.",
      type: "local",
      has_volume_support: false,
      requires_regions: false,
      features: ["Zero Latency", "Direct Hardware Access", "Private & Isolated"],
      schema: [],
    },
  ]);

  // Search & Filters for instances
  const [instanceSearch, setInstanceSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [vramFilter, setVramFilter] = useState("all");
  const [sortBy, setSortBy] = useState("price_asc");
  const [showProviderAdvanced, setShowProviderAdvanced] = useState(false);

  // Fetch dynamic providers list from backend
  useEffect(() => {
    fetch("/api/v1/providers")
      .then((r) => r.json())
      .then((data) => {
        if (data.providers && Array.isArray(data.providers) && data.providers.length > 0) {
          setProviders(data.providers);
        }
      })
      .catch(console.error);
  }, []);

  const activeProvider =
    providers.find((p) => p.id === selectedProvider) || providers[0] || {
      id: selectedProvider,
      name: selectedProvider,
      description: "",
      type: "cloud",
      schema: [],
    };

  // Filter instances
  const filteredMarkets = useMemo(() => {
    let list = [...markets];

    // Text search
    if (instanceSearch.trim()) {
      const q = instanceSearch.toLowerCase();
      list = list.filter(
        (m) =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.id && m.id.toLowerCase().includes(q)) ||
          (m.tag && m.tag.toLowerCase().includes(q))
      );
    }

    // Device type filter (GPU vs CPU)
    if (deviceFilter !== "all") {
      list = list.filter((m) => {
        const nameLower = (m.name || "").toLowerCase();
        const isCpu = nameLower.includes("cpu") && !nameLower.includes("gpu");
        return deviceFilter === "cpu" ? isCpu : !isCpu;
      });
    }

    // Vendor filter
    if (vendorFilter !== "all") {
      list = list.filter((m) => {
        const nameLower = (m.name || "").toLowerCase();
        if (vendorFilter === "nvidia") {
          return (
            nameLower.includes("nvidia") ||
            nameLower.includes("rtx") ||
            nameLower.includes("gtx") ||
            nameLower.includes("a100") ||
            nameLower.includes("h100") ||
            nameLower.includes("l40")
          );
        }
        if (vendorFilter === "amd") {
          return (
            nameLower.includes("amd") ||
            nameLower.includes("radeon") ||
            nameLower.includes("mi300")
          );
        }
        if (vendorFilter === "apple") {
          return nameLower.includes("apple") || nameLower.includes("m1") || nameLower.includes("m2") || nameLower.includes("m3");
        }
        return true;
      });
    }

    // Min VRAM filter
    if (vramFilter !== "all") {
      const min = parseInt(vramFilter, 10);
      list = list.filter((m) => (m.vram_gb || 0) >= min);
    }

    // Sorting
    if (sortBy === "price_asc") {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "vram_desc") {
      list.sort((a, b) => (b.vram_gb || 0) - (a.vram_gb || 0));
    }

    return list;
  }, [markets, instanceSearch, deviceFilter, vendorFilter, vramFilter, sortBy]);

  // Split provider schema into required vs advanced
  const providerSchema = activeProvider.schema || [];
  const requiredFields = providerSchema.filter((f) => f.required && !f.is_advanced);
  const advancedFields = providerSchema.filter((f) => !f.required || f.is_advanced);

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0d0d10] p-6 shadow-sm space-y-6">
      {/* VRAM requirement notice */}
      {selectedModel && requiredVram > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-zinc-800/80 bg-[#131317] px-4 py-3 text-xs">
          <HardDrive className="size-4 shrink-0 text-blue-400" />
          <span className="text-zinc-400">
            Estimated{" "}
            <span className="font-semibold text-zinc-100">~{Math.ceil(requiredVram)} GB</span>{" "}
            VRAM needed for{" "}
            <span className="font-mono text-zinc-200">{selectedModel.split("/").pop()}</span>
          </span>
        </div>
      )}

      {/* 1. Provider Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              1. Compute Provider
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Choose an infrastructure provider to orchestrate your instances.
            </p>
          </div>
          <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            {providers.length} Available
          </span>
        </div>

        {/* Enhanced Provider Cards */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {providers.map((p) => {
            const isSelected = selectedProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProvider(p.id)}
                className={[
                  "group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150",
                  isSelected
                    ? "border-blue-500/90 bg-[#161a29] shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50"
                    : "border-zinc-800/90 bg-[#131317] hover:border-zinc-700 hover:bg-[#18181f]",
                ].join(" ")}
              >
                {/* Selected check badge */}
                {isSelected && (
                  <span className="absolute right-3.5 top-3.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 shadow-sm">
                    <Check className="size-2.5 stroke-[3] text-white" />
                  </span>
                )}

                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#0e0e12] p-2">
                    <Logo name={p.id} size={24} />
                  </div>
                  <div className="min-w-0 flex-1 pr-5">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-zinc-100">{p.name}</span>
                      <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 uppercase">
                        {p.type}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed line-clamp-2">
                      {p.description}
                    </p>
                  </div>
                </div>

                {/* Features & Status Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-2.5">
                  <div className="flex flex-wrap gap-1">
                    {(p.features || []).slice(0, 2).map((feat) => (
                      <span
                        key={feat}
                        className="rounded bg-[#0e0e12] px-2 py-0.5 text-[10px] text-zinc-400 border border-zinc-800/60"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Ready</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Hardware Instance Selection */}
      <div className="pt-2 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              2. Hardware Instance
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Available compute resources on {activeProvider.name}.
            </p>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            {filteredMarkets.length} of {markets.length} instance{markets.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={instanceSearch}
              onChange={(e) => setInstanceSearch(e.target.value)}
              placeholder="Search instances (e.g. RTX 4090, A100, 24GB)..."
              className="h-9 w-full rounded-lg border border-zinc-800 bg-[#131317] pl-9 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-700 focus:outline-none"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Device Type */}
            <Select value={deviceFilter} onValueChange={(val: any) => val && setDeviceFilter(val)}>
              <SelectTrigger className="h-9 min-w-[105px] border-zinc-800 bg-[#131317] text-xs text-zinc-200">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-[#121216] text-zinc-200">
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="gpu">GPU Only</SelectItem>
                <SelectItem value="cpu">CPU Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Vendor */}
            <Select value={vendorFilter} onValueChange={(val: any) => val && setVendorFilter(val)}>
              <SelectTrigger className="h-9 min-w-[105px] border-zinc-800 bg-[#131317] text-xs text-zinc-200">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-[#121216] text-zinc-200">
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="nvidia">NVIDIA</SelectItem>
                <SelectItem value="amd">AMD</SelectItem>
                <SelectItem value="apple">Apple</SelectItem>
              </SelectContent>
            </Select>

            {/* Min VRAM */}
            <Select value={vramFilter} onValueChange={(val: any) => val && setVramFilter(val)}>
              <SelectTrigger className="h-9 min-w-[105px] border-zinc-800 bg-[#131317] text-xs text-zinc-200">
                <SelectValue placeholder="VRAM" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-[#121216] text-zinc-200">
                <SelectItem value="all">Any VRAM</SelectItem>
                <SelectItem value="16">16+ GB</SelectItem>
                <SelectItem value="24">24+ GB</SelectItem>
                <SelectItem value="48">48+ GB</SelectItem>
                <SelectItem value="80">80+ GB</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(val: any) => val && setSortBy(val)}>
              <SelectTrigger className="h-9 min-w-[130px] border-zinc-800 bg-[#131317] text-xs text-zinc-200">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-[#121216] text-zinc-200">
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="vram_desc">Highest VRAM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scrollable Instances Grid (with max-height) */}
        <div className="max-h-[380px] overflow-y-auto pr-1.5 space-y-3">
          {filteredMarkets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-[#131317]/50 p-8 text-center text-xs text-zinc-500">
              No matching compute instances found. Try relaxing your filters or search query.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {filteredMarkets.map((m) => {
                const hasEnoughVram = m.vram_gb === undefined || m.vram_gb >= requiredVram;
                const isSelected = selectedMarket?.id === m.id;
                const isAvailable = hasEnoughVram;

                const nameLower = (m.name || "").toLowerCase();
                const isCpu = nameLower.includes("cpu") && !nameLower.includes("gpu");
                const deviceType = isCpu ? "CPU" : "GPU";

                const vendor =
                  m.vendor ||
                  (nameLower.includes("rtx") ||
                  nameLower.includes("nvidia") ||
                  nameLower.includes("a100") ||
                  nameLower.includes("h100") ||
                  nameLower.includes("l40")
                    ? "NVIDIA"
                    : nameLower.includes("mi300") || nameLower.includes("radeon")
                    ? "AMD"
                    : nameLower.includes("apple") || nameLower.includes("m1") || nameLower.includes("m2") || nameLower.includes("m3")
                    ? "Apple Silicon"
                    : "PCIe Host");

                const vendorColor =
                  vendor === "NVIDIA"
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : vendor === "AMD"
                    ? "text-red-400 bg-red-500/10 border-red-500/20"
                    : "text-zinc-300 bg-zinc-800/80 border-zinc-700";

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={isAvailable ? () => onSelectMarket(m) : undefined}
                    disabled={!isAvailable}
                    className={[
                      "group relative flex flex-col justify-between rounded-xl border text-left transition-all duration-150",
                      !isAvailable ? "cursor-not-allowed opacity-45" : "cursor-pointer",
                      isSelected
                        ? "border-blue-500/90 bg-[#161a29] shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50"
                        : "border-zinc-800/90 bg-[#131317] hover:border-zinc-700 hover:bg-[#18181f]",
                    ].join(" ")}
                  >
                    {/* Selected badge */}
                    {isSelected && (
                      <span className="absolute right-3.5 top-3.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 shadow-sm">
                        <Check className="size-2.5 stroke-[3] text-white" />
                      </span>
                    )}

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2 pr-5">
                        <div>
                          <div className="text-sm font-semibold text-zinc-100">{m.name}</div>
                          <div className="font-mono text-[10px] text-zinc-500 mt-0.5 truncate max-w-[200px]" title={m.id}>
                            {m.id}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Device Type Tag */}
                          <span className="rounded bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 flex items-center gap-1">
                            <Cpu className="size-2.5" />
                            {deviceType}
                          </span>
                          {/* Vendor Tag */}
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${vendorColor}`}>
                            {vendor}
                          </span>
                        </div>
                      </div>

                      {/* Extensive Specs */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {m.vram_gb !== undefined && (
                          <div className="flex items-center gap-1.5 text-zinc-300">
                            <HardDrive className="size-3.5 text-zinc-500 shrink-0" />
                            <span className="font-medium">{m.vram_gb} GB VRAM</span>
                          </div>
                        )}
                        {m.cpu_cores !== undefined && (
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <Cpu className="size-3.5 text-zinc-500 shrink-0" />
                            <span>{m.cpu_cores} vCPUs</span>
                          </div>
                        )}
                        {m.ram_gb !== undefined && (
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <Server className="size-3.5 text-zinc-500 shrink-0" />
                            <span>{m.ram_gb} GB RAM</span>
                          </div>
                        )}
                        {m.available !== undefined && (
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <span className="size-1.5 rounded-full bg-emerald-400" />
                            <span>{m.available} node{m.available !== 1 ? "s" : ""} free</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Low VRAM Warning */}
                    {!hasEnoughVram && (
                      <div className="flex items-center gap-2 border-t border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-400">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        <span>VRAM too low (~{Math.ceil(requiredVram)} GB needed)</span>
                      </div>
                    )}

                    {/* Price Footer */}
                    <div className="flex items-center justify-between border-t border-zinc-800/80 px-4 py-2.5 bg-[#0e0e12]/60 rounded-b-xl">
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <Globe className="size-3" />
                        <span>{m.location || (selectedProvider === "local" ? "Localhost" : "On-Demand")}</span>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-sm font-semibold text-zinc-100">${m.price}</span>
                        <span className="text-[10px] text-zinc-500">/hr</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Selected Instance Summary (if selected) */}
      {selectedMarket && (
        <div className="rounded-xl border border-zinc-800/80 bg-[#131317] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400">
              <Server className="size-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-100">
                Selected: {selectedMarket.name}
              </div>
              <div className="text-[11px] text-zinc-400">
                {selectedMarket.vram_gb ? `${selectedMarket.vram_gb} GB VRAM • ` : ""}
                ${selectedMarket.price}/h • {activeProvider.name}
              </div>
            </div>
          </div>
          <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            Hardware Assigned
          </span>
        </div>
      )}

      {/* 4. Volume Section (shown only if provider supports volume e.g. AWS/Akash) */}
      {activeProvider.has_volume_support && (
        <div className="rounded-xl border border-zinc-800/80 bg-[#131317] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Database className="size-3.5 text-blue-400" />
              <span>Persistent Volume Storage</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">EBS / Persistent Disk</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Attach high-throughput persistent storage for model weight caching and fast cold-starts.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={10}
              max={1000}
              value={volumeSizeGb}
              onChange={(e) => onVolumeSizeGbChange?.(parseInt(e.target.value, 10) || 50)}
              className="h-9 w-36 rounded-lg border border-zinc-800 bg-[#0e0e12] px-3 text-xs text-zinc-100 focus:border-zinc-700 focus:outline-none"
            />
            <span className="text-xs text-zinc-400">GB Mounted Storage</span>
          </div>
        </div>
      )}

      {/* 5. Required Provider Inputs (if schema specifies required fields) */}
      {requiredFields.length > 0 && (
        <div className="rounded-xl border border-zinc-800/80 bg-[#131317] p-4 space-y-4">
          <div className="text-xs font-semibold text-zinc-200">
            Required Provider Parameters <span className="text-red-400">*</span>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {requiredFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  {field.name} <span className="text-red-400">*</span>
                </label>
                {field.type === "select" && field.options ? (
                  <Select
                    value={providerConfig[field.key] || field.default || ""}
                    onValueChange={(val: any) => val && onProviderConfigChange?.(field.key, val)}
                  >
                    <SelectTrigger className="h-9 w-full border-zinc-800 bg-[#0e0e12] text-xs text-zinc-200">
                      <SelectValue placeholder={field.placeholder || "Select an option"} />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-[#121216] text-zinc-200">
                      {field.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    placeholder={field.placeholder || field.default || ""}
                    value={providerConfig[field.key] ?? field.default ?? ""}
                    onChange={(e) => onProviderConfigChange?.(field.key, e.target.value)}
                    className="h-9 w-full rounded-lg border border-zinc-800 bg-[#0e0e12] px-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-700 focus:outline-none"
                  />
                )}
                {field.description && (
                  <p className="text-[10px] text-zinc-500">{field.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Optional / Advanced Provider Configurations Accordion */}
      {advancedFields.length > 0 && (
        <div className="rounded-xl border border-zinc-800/80 bg-[#131317] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowProviderAdvanced(!showProviderAdvanced)}
            className="flex w-full items-center justify-between p-4 text-left transition hover:bg-zinc-900/30"
          >
            <div className="flex items-center gap-2.5">
              <Settings2 className="size-4 text-zinc-400" />
              <div>
                <div className="text-xs font-semibold text-zinc-200">
                  Provider Advanced Options <span className="text-zinc-500 font-normal">(Optional)</span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Configure network peering, subnets, and provider-specific runtime flags.
                </div>
              </div>
            </div>
            <ChevronDown
              className={`size-4 text-zinc-400 transition-transform duration-200 ${
                showProviderAdvanced ? "rotate-180" : ""
              }`}
            />
          </button>

          {showProviderAdvanced && (
            <div className="border-t border-zinc-800/80 p-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {advancedFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-300">
                    {field.name}
                  </label>
                  {field.type === "select" && field.options ? (
                    <Select
                      value={providerConfig[field.key] || field.default || ""}
                      onValueChange={(val: any) => val && onProviderConfigChange?.(field.key, val)}
                    >
                      <SelectTrigger className="h-9 w-full border-zinc-800 bg-[#0e0e12] text-xs text-zinc-200">
                        <SelectValue placeholder={field.placeholder || "Select an option"} />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-800 bg-[#121216] text-zinc-200">
                        {field.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      placeholder={field.placeholder || field.default || ""}
                      value={providerConfig[field.key] ?? field.default ?? ""}
                      onChange={(e) => onProviderConfigChange?.(field.key, e.target.value)}
                      className="h-9 w-full rounded-lg border border-zinc-800 bg-[#0e0e12] px-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-700 focus:outline-none"
                    />
                  )}
                  {field.description && (
                    <p className="text-[10px] text-zinc-500">{field.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
