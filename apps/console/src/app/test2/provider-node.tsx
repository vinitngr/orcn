"use client";

import { useRef, useState } from "react";
import { Server } from "lucide-react";
import { Logo } from "@/components/ui/Logos";

const providers = [
  {
    name: "nosana",
    nodes: 8,
    color: "#4f8f68",
    instances: [
      { name: "RTX 4090", count: 4 },
      { name: "RTX 3090", count: 3 },
      { name: "A100", count: 1 },
    ],
  },
  {
    name: "aws",
    nodes: 2,
    color: "#a98245",
    instances: [
      { name: "A100", count: 2 },
    ],
  },
  {
    name: "gcp",
    nodes: 2,
    color: "#587da3",
    instances: [
      { name: "L4", count: 2 },
    ],
  },
];

export default function ComputeNodesCard() {
  const chartRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    provider: (typeof providers)[number];
  } | null>(null);

  const totalNodes = providers.reduce(
    (sum, provider) => sum + provider.nodes,
    0
  );

  const showTooltip = (
    event: React.MouseEvent<HTMLDivElement>,
    provider: (typeof providers)[number]
  ) => {
    if (!chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();

    setTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      provider,
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
    <section className="h-full w-full rounded-xl border border-white/10 bg-[#0d0f12] px-5 py-4 text-white">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-white/40" />

            <p className="text-sm font-medium text-white/85">
              Compute / Nodes
            </p>
          </div>

          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight">
              {totalNodes}
            </span>

            <span className="text-[10px] text-white/30">
              running nodes
            </span>
          </div>
        </div>

        <div className="pt-0.5 text-right">
          <div className="text-xs font-medium text-white/60">
            {providers.length} providers
          </div>

          <div className="text-[9px] text-white/25">
            active compute
          </div>
        </div>
      </header>

      {/* Provider distribution */}
      <div
        ref={chartRef}
        className="relative mt-4"
        onMouseLeave={() => setTooltip(null)}
      >
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.12em] text-white/25">
            Running nodes by provider
          </span>

          <span className="text-[9px] text-white/20">
            {totalNodes} active
          </span>
        </div>

        {/* Provider bar */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-[2px] bg-white/[0.03]">
          {providers.map((provider) => (
            <div
              key={provider.name}
              style={{
                width: `${(provider.nodes / totalNodes) * 100}%`,
                backgroundColor: provider.color,
                opacity: 0.8,
              }}
              className="h-full cursor-default border-r border-[#0d0f12] last:border-r-0"
              onMouseEnter={(event) =>
                showTooltip(event, provider)
              }
              onMouseMove={moveTooltip}
            />
          ))}
        </div>

        {/* Provider logos */}
        <div className="mt-2 flex">
          {providers.map((provider) => (
            <div
              key={provider.name}
              style={{
                width: `${(provider.nodes / totalNodes) * 100}%`,
              }}
              className="flex min-w-0 items-center justify-center"
            >
              <Logo
                name={provider.name}
                size={13}
                className="opacity-55"
              />
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50"
            style={{
              left: tooltip.x,
              top: tooltip.y - 7,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="min-w-[150px] rounded-md border border-white/10 bg-[#17191d] px-2.5 py-2 shadow-xl">
              <div className="mb-1.5 flex items-center justify-between gap-5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-[2px]"
                    style={{
                      backgroundColor: tooltip.provider.color,
                    }}
                  />

                  <span className="text-[10px] font-medium text-white">
                    {tooltip.provider.name}
                  </span>
                </div>

                <span className="text-[9px] text-white/35">
                  {tooltip.provider.nodes} nodes
                </span>
              </div>

              <div className="space-y-1 border-t border-white/10 pt-1.5">
                {tooltip.provider.instances.map((instance) => (
                  <div
                    key={instance.name}
                    className="flex items-center justify-between gap-5"
                  >
                    <span className="text-[9px] text-white/40">
                      {instance.name}
                    </span>

                    <span className="text-[9px] text-white">
                      {instance.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compact bottom info */}
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
        <div>
          <span className="text-[8px] uppercase tracking-[0.12em] text-white/20">
            Providers
          </span>

          <span className="ml-2 text-[9px] text-white/40">
            {providers.map((provider) => provider.name).join(" · ")}
          </span>
        </div>

        <div>
          <span className="text-[8px] uppercase tracking-[0.12em] text-white/20">
            Nodes
          </span>

          <span className="ml-1.5 text-[9px] text-white/45">
            {totalNodes}
          </span>
        </div>
      </div>
    </section>
  );
}