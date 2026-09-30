"use client";

import { Box } from "lucide-react";
import { useRef, useState } from "react";

const legend = [
  { label: "Running", color: "#3ecf6f" },
  { label: "Stopped", color: "#6b7280" },
  { label: "Error", color: "#ef4444" },
];

const groups = [
  {
    label: "Inference",
    w: 48,
    color: "#3b82f6",
  },
  {
    label: "Workload",
    w: 30,
    color: "#3ecf6f",
  },
  {
    label: "Other",
    w: 22,
    color: "#6b7280",
  },
];

const statusGroups = [
  {
    name: "Inference",
    segments: [
      { label: "Running", w: 24, count: 12, color: "#3ecf6f" },
      { label: "Stopped", w: 14, count: 7, color: "#6b7280" },
      { label: "Error", w: 10, count: 4, color: "#ef4444" },
    ],
  },
  {
    name: "Workload",
    segments: [
      { label: "Running", w: 18, count: 8, color: "#3ecf6f" },
      { label: "Stopped", w: 8, count: 3, color: "#6b7280" },
      { label: "Error", w: 4, count: 1, color: "#ef4444" },
    ],
  },
  {
    name: "Other",
    segments: [
      { label: "Running", w: 12, count: 5, color: "#3ecf6f" },
      { label: "Stopped", w: 7, count: 2, color: "#6b7280" },
      { label: "Error", w: 3, count: 1, color: "#ef4444" },
    ],
  },
];

type TooltipData = {
  x: number;
  y: number;
  type: string;
  status?: string;
  count: number;
  percentage: number;
  color: string;
};

export default function DeploymentCard() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const showTooltip = (
    event: React.MouseEvent<HTMLDivElement>,
    data: Omit<TooltipData, "x" | "y">
  ) => {
    if (!chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();

    setTooltip({
      ...data,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const moveTooltip = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!chartRef.current || !tooltip) return;

    const rect = chartRef.current.getBoundingClientRect();

    setTooltip((current) =>
      current
        ? {
            ...current,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          }
        : null
    );
  };

  return (
    <section
      className="
        relative
        w-full
        aspect-[16/10]
        overflow-hidden
        rounded-xl
        h-full
        border border-white/10
        bg-[#0d0f12]
        text-white
      "
    >
      <div className="flex h-full flex-col px-[5%] py-[4%]">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-[0.7em]">
            <Box className="h-[1em] w-[1em] text-white/45" />

            <div>
              <h1 className="text-[clamp(10px,0.85vw,14px)] font-medium tracking-tight text-white/85">
                Deployments
              </h1>

              <p className="text-[clamp(7px,0.55vw,10px)] text-white/30">
                39 total deployments
              </p>
            </div>
          </div>
        </header>

        {/* Chart */}
        <div
          ref={chartRef}
          className="relative mt-auto mb-auto w-full"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Type labels */}
          <div className="flex w-full items-center">
            {groups.map((group) => (
              <div
                key={group.label}
                style={{ width: `${group.w}%` }}
                className="flex min-w-0 items-center gap-[1%]"
              >
                <div className="h-px flex-1 bg-white/[0.08]" />

                <span className="shrink-0 text-[clamp(7px,0.55vw,10px)] text-white/40">
                  {group.label}
                </span>

                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>
            ))}
          </div>

          {/* Type bar */}
          <div className="mt-[1%] flex h-[8px] w-full overflow-hidden rounded-[2px]">
            {groups.map((group) => (
              <div
                key={group.label}
                style={{
                  width: `${group.w}%`,
                  backgroundColor: group.color,
                }}
                className="h-full cursor-default border-r border-[#0d0f12] last:border-r-0"
                onMouseEnter={(event) =>
                  showTooltip(event, {
                    type: group.label,
                    count: group.w,
                    percentage: group.w,
                    color: group.color,
                  })
                }
                onMouseMove={moveTooltip}
              />
            ))}
          </div>

          {/* Status bar */}
          <div className="mt-[2px] flex h-[8px] w-full overflow-hidden rounded-[2px]">
            {statusGroups.map((group) => {
              const parent = groups.find(
                (item) => item.label === group.name
              );

              if (!parent) return null;

              return (
                <div
                  key={group.name}
                  style={{ width: `${parent.w}%` }}
                  className="flex h-full border-r border-[#0d0f12] last:border-r-0"
                >
                  {group.segments.map((segment, index) => {
                    const segmentWidth =
                      (segment.w / parent.w) * 100;

                    const percentage =
                      (segment.count / parent.w) * 100;

                    return (
                      <div
                        key={`${group.name}-${segment.label}-${index}`}
                        style={{
                          width: `${segmentWidth}%`,
                          backgroundColor: segment.color,
                        }}
                        className="h-full cursor-default"
                        onMouseEnter={(event) =>
                          showTooltip(event, {
                            type: group.name,
                            status: segment.label,
                            count: segment.count,
                            percentage,
                            color: segment.color,
                          })
                        }
                        onMouseMove={moveTooltip}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full"
              style={{
                left: tooltip.x,
                top: tooltip.y - 7,
              }}
            >
              <div className="min-w-[140px] rounded-md border border-white/10 bg-[#17191d] px-2.5 py-2 shadow-xl shadow-black/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-[2px]"
                      style={{
                        backgroundColor: tooltip.color,
                      }}
                    />

                    <span className="text-[10px] font-medium text-white">
                      {tooltip.type}
                    </span>
                  </div>

                  {tooltip.status && (
                    <span className="text-[10px] text-white/40">
                      {tooltip.status}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xs font-semibold text-white">
                    {tooltip.count}
                  </span>

                  <span className="text-[10px] text-white/35">
                    deployments
                  </span>
                </div>

                {tooltip.status && (
                  <div className="mt-0.5 text-[9px] text-white/30">
                    {tooltip.percentage.toFixed(1)}% of{" "}
                    {tooltip.type.toLowerCase()}
                  </div>
                )}
              </div>

              <div className="mx-auto h-0 w-0 border-l-[3px] border-r-[3px] border-t-[3px] border-l-transparent border-r-transparent border-t-[#17191d]" />
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-[clamp(8px,1vw,16px)]">
          {legend.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5"
            >
              <span
                className="h-1.5 w-1.5 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />

              <span className="text-[clamp(7px,0.55vw,10px)] text-white/40">
                {item.label}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}   