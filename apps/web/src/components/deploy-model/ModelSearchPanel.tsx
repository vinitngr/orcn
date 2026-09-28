"use client";

import { useState, useMemo } from "react";
import { Search, Loader2 } from "lucide-react";
import { ModelCard, ModelItem } from "./ModelCard";
import { ModelDetailCard } from "./ModelDetailCard";
import { AdvancedConfigSection, ConfigOption } from "./AdvancedConfigSection";
import { ModelDetails } from "./model-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

export interface RuntimeTask {
  id: string;
  name: string;
  description?: string;
}

export interface RuntimeCapability {
  id: string;
  name: string;
  tasks: RuntimeTask[];
}

interface ModelSearchPanelProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  searchResults: ModelItem[];
  selectedModel: string;
  onSelectModel: (id: string) => void;
  modality: string;
  onModalityChange: (val: string) => void;
  runtime: string;
  onRuntimeChange: (val: string) => void;
  modalities: RuntimeTask[];
  runtimes: RuntimeCapability[];
  isLoadingCapabilities: boolean;
  modelDetails: ModelDetails | null;
  requiredVram: number;
  hfToken: string;
  onHfTokenChange: (token: string) => void;
  advancedSchema: ConfigOption[];
  advancedConfig: Record<string, string>;
  onAdvancedChange: (key: string, value: string) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

export function ModelSearchPanel({
  searchQuery,
  onSearchChange,
  onSearch,
  isSearching,
  searchResults,
  selectedModel,
  onSelectModel,
  modality,
  onModalityChange,
  runtime,
  onRuntimeChange,
  modalities,
  runtimes,
  isLoadingCapabilities,
  modelDetails,
  requiredVram,
  hfToken,
  onHfTokenChange,
  advancedSchema,
  advancedConfig,
  onAdvancedChange,
  showAdvanced,
  onToggleAdvanced,
}: ModelSearchPanelProps) {
  const [sizeFilter, setSizeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("popular");

  // Runtimes that support the selected modality, discovered from the backend.
  const supportedRuntimes = useMemo(() => {
    return runtimes.filter((r) => r.tasks.some((t) => t.id === modality));
  }, [runtimes, modality]);

  const handleModalitySelect = (val: string) => {
    onModalityChange(val);
    const available = runtimes.filter((r) => r.tasks.some((t) => t.id === val));
    if (!available.some((r) => r.id === runtime) && available[0]) {
      onRuntimeChange(available[0].id);
    }
  };

  // Filter models by size using real parameter counts from the model card.
  const filteredModels = useMemo(() => {
    let list = [...searchResults];
    if (sizeFilter !== "all") {
      list = list.filter((m) => {
        const params = m.parameters;
        if (params === undefined) return true;
        if (sizeFilter === "small") return params < 7;
        if (sizeFilter === "mid") return params >= 7 && params <= 13;
        if (sizeFilter === "large") return params > 13 && params <= 70;
        if (sizeFilter === "xl") return params > 70;
        return true;
      });
    }

    if (sortBy === "downloads") {
      list.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (sortBy === "likes") {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    return list;
  }, [searchResults, sizeFilter, sortBy]);

  return (
    <div className="space-y-6">

      <div className="rounded-xl border border-zinc-800 bg-[#121215] p-6 shadow-sm">
        {/* Title & Subtitle */}
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Select a Model</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Search and choose a model from the hub.
          </p>
        </div>

        <div className="space-y-5">
          {/* Search bar & Shadcn filter selects */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                placeholder="Search models (e.g. meta-llama/Llama-3.1-8B-Instruct)"
                className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900/90 pl-10 pr-3.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              />
              {isSearching && (
                <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-zinc-500" />
              )}
            </div>

            {/* Filters using Shadcn Select */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Modality / Task (discovered from the backend runtime registry) */}
              <Select value={modality} onValueChange={(val: string | null) => val && handleModalitySelect(val)}>
                <SelectTrigger className="h-9 min-w-[140px] border-zinc-800 bg-zinc-900/90 text-xs text-zinc-200">
                  <SelectValue placeholder="Modality" />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-200">
                  {modalities.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Runtime (only those registered for the selected modality) */}
              <Select value={runtime} onValueChange={(val: string | null) => val && onRuntimeChange(val)}>
                <SelectTrigger className="h-9 min-w-[100px] border-zinc-800 bg-zinc-900/90 text-xs text-zinc-200">
                  <SelectValue placeholder="Runtime" />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-200">
                  {supportedRuntimes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Size Filter */}
              <Select value={sizeFilter} onValueChange={(val: string | null) => val && setSizeFilter(val)}>
                <SelectTrigger className="h-9 min-w-[110px] border-zinc-800 bg-zinc-900/90 text-xs text-zinc-200">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-200">
                  <SelectItem value="all">All Sizes</SelectItem>
                  <SelectItem value="small">&lt; 7B</SelectItem>
                  <SelectItem value="mid">7B - 13B</SelectItem>
                  <SelectItem value="large">14B - 70B</SelectItem>
                  <SelectItem value="xl">&gt; 70B</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(val: string | null) => val && setSortBy(val)}>
                <SelectTrigger className="h-9 min-w-[150px] border-zinc-800 bg-zinc-900/90 text-xs text-zinc-200">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-200">
                  <SelectItem value="popular">Sort: Most popular</SelectItem>
                  <SelectItem value="downloads">Sort: Downloads</SelectItem>
                  <SelectItem value="likes">Sort: Likes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Model Cards Grid with Max Height & Internal Scroll */}
          <div className="max-h-[380px] overflow-y-auto pr-1">
            {filteredModels.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-14 text-center">
                <Search className="size-5 text-zinc-600" />
                <p className="mt-3 text-xs font-medium text-zinc-400">
                  {isLoadingCapabilities
                    ? "Loading available runtimes…"
                    : searchResults.length === 0
                    ? "No models to show yet"
                    : "No models match your filters"}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {isLoadingCapabilities
                    ? "Fetching runtime capabilities from the backend."
                    : searchResults.length === 0
                    ? "Search by name to find models on the hub."
                    : "Try clearing the size filter or changing your search."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                {filteredModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    selected={selectedModel === model.id}
                    onClick={() => onSelectModel(model.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Selected Model Detail Card */}
      {selectedModel && (
        <ModelDetailCard
          modelId={selectedModel}
          modelDetails={modelDetails}
          taskLabel={modalities.find((t) => t.id === modality)?.name}
          requiredVram={requiredVram}
          hfToken={hfToken}
          onHfTokenChange={onHfTokenChange}
        />
      )}

      {/* 3. Standalone Advanced Configuration Accordion at the bottom */}
      {selectedModel && (
        <AdvancedConfigSection
          schema={advancedSchema}
          data={advancedConfig}
          onChange={onAdvancedChange}
          isOpen={showAdvanced}
          onToggle={onToggleAdvanced}
        />
      )}
    </div>
  );
}
