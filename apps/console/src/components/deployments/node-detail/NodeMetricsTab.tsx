import { Activity, Cpu, Database, Gauge, HardDrive } from "lucide-react";
import {
  ChartPlaceholder,
  MetricTile,
  SectionCard,
} from "@/components/deployments/node-detail/shared";

export function NodeMetricsTab() {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="GPU Utilization"
          value="--"
          meta="Telemetry pending"
        />
        <MetricTile label="GPU Memory" value="--" meta="Telemetry pending" />
        <MetricTile
          label="CPU Utilization"
          value="--"
          meta="Telemetry pending"
        />
        <MetricTile label="System Memory" value="--" meta="Telemetry pending" />
      </div>

      <SectionCard
        title="Resource Charts"
        subtitle="Node-level utilization over time"
        action={
          <span className="text-[11px] text-[var(--text-muted)]">
            Connecting...
          </span>
        }
      >
        <div className="grid gap-2 lg:grid-cols-2">
          <ChartPlaceholder label="GPU Utilization" icon={Gauge} tall />
          <ChartPlaceholder label="GPU Memory" icon={HardDrive} tall />
          <ChartPlaceholder label="CPU Utilization" icon={Cpu} tall />
          <ChartPlaceholder label="System Memory" icon={Database} tall />
        </div>
      </SectionCard>

      <SectionCard title="Disk & Network" subtitle="I/O and bandwidth">
        <div className="grid gap-2 sm:grid-cols-2">
          <ChartPlaceholder label="Disk Usage" icon={HardDrive} tall />
          <ChartPlaceholder label="Network Throughput" icon={Activity} tall />
        </div>
      </SectionCard>
    </div>
  );
}
