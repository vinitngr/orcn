import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Search } from "lucide-react";

interface Props {
  instanceSearch: string;
  setInstanceSearch: (v: string) => void;
  deviceFilter: string;
  setDeviceFilter: (v: string) => void;
  hasDeviceTypes: boolean;
  sortBy: string;
  setSortBy: (v: string) => void;
}

export const ComputeFiltersSection: React.FC<Props> = ({
  instanceSearch,
  setInstanceSearch,
  deviceFilter,
  setDeviceFilter,
  hasDeviceTypes,
  sortBy,
  setSortBy,
}) => (
  <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
    {/* Search Input */}
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-light)]" />
      <input
        type="text"
        value={instanceSearch}
        onChange={(e) => setInstanceSearch(e.target.value)}
        placeholder="Search instances (e.g. RTX 4090, A100, 24GB)..."
        className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--dm-card)] pl-9 pr-3 text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:border-[var(--border-hover)] focus:outline-none"
      />
    </div>

    {/* Filters Row */}
    <div className="flex flex-wrap items-center gap-2">
      {/* Device Type — only when backend data distinguishes device types */}
      {hasDeviceTypes && (
        <Select
          value={deviceFilter}
          onValueChange={(val: string | null) => val && setDeviceFilter(val)}
        >
          <SelectTrigger className="h-9 min-w-[105px] border-[var(--border)] bg-[var(--dm-card)] text-xs text-[var(--dm-text-2)]">
            <SelectValue placeholder="Device" />
          </SelectTrigger>
          <SelectContent className="border-[var(--border)] bg-[var(--dm-select-content)] text-[var(--dm-text-2)]">
            <SelectItem value="all">All Devices</SelectItem>
            <SelectItem value="gpu">GPU Only</SelectItem>
            <SelectItem value="cpu">CPU Only</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Sort */}
      <Select
        value={sortBy}
        onValueChange={(val: string | null) => val && setSortBy(val)}
      >
        <SelectTrigger className="h-9 min-w-[130px] border-[var(--border)] bg-[var(--dm-card)] text-xs text-[var(--dm-text-2)]">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent className="border-[var(--border)] bg-[var(--dm-select-content)] text-[var(--dm-text-2)]">
          <SelectItem value="price_asc">Price: Low to High</SelectItem>
          <SelectItem value="price_desc">Price: High to Low</SelectItem>
          <SelectItem value="vram_desc">Highest VRAM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

export default ComputeFiltersSection;
