"use client";

import { useRef, useState } from "react";
import { Activity } from "lucide-react";

const data = [
  { time: "00:00", p50: 182, p95: 310, requests: 420, errors: 4 },
  { time: "02:00", p50: 176, p95: 295, requests: 380, errors: 3 },
  { time: "04:00", p50: 191, p95: 325, requests: 290, errors: 2 },
  { time: "06:00", p50: 205, p95: 350, requests: 510, errors: 6 },
  { time: "08:00", p50: 218, p95: 380, requests: 740, errors: 8 },
  { time: "10:00", p50: 196, p95: 335, requests: 820, errors: 5 },
  { time: "12:00", p50: 188, p95: 318, requests: 910, errors: 4 },
  { time: "14:00", p50: 214, p95: 362, requests: 860, errors: 7 },
  { time: "16:00", p50: 201, p95: 342, requests: 790, errors: 5 },
  { time: "18:00", p50: 185, p95: 315, requests: 680, errors: 3 },
  { time: "20:00", p50: 179, p95: 302, requests: 590, errors: 3 },
  { time: "22:00", p50: 187, p95: 320, requests: 470, errors: 4 },
];

export default function PerformanceCard() {
  const chartRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: (typeof data)[number];
  } | null>(null);

  const totalRequests = data.reduce(
    (sum, point) => sum + point.requests,
    0
  );

  const totalErrors = data.reduce(
    (sum, point) => sum + point.errors,
    0
  );

  const errorRate = (
    (totalErrors / totalRequests) *
    100
  ).toFixed(2);

  const avgP50 = Math.round(
    data.reduce((sum, point) => sum + point.p50, 0) /
      data.length
  );

  const maxLatency = Math.max(
    ...data.map((point) => point.p95)
  );

  const showTooltip = (
    event: React.MouseEvent<HTMLDivElement>,
    point: (typeof data)[number]
  ) => {
    if (!chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();

    setTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      point,
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

  const getY = (value: number) => {
    const min = 150;
    const max = maxLatency + 30;

    return 100 - ((value - min) / (max - min)) * 100;
  };

  return (
    <section className="w-full rounded-xl border border-white/10 bg-[#0d0f12] px-5 py-4 text-white">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-white/40" />

            <p className="text-sm font-medium text-white/85">
              Performance
            </p>
          </div>

          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight">
              {avgP50}
            </span>

            <span className="text-[10px] text-white/30">
              ms p50
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-medium text-white/60">
            {errorRate}%
          </div>

          <div className="text-[9px] text-white/25">
            error rate
          </div>
        </div>
      </header>

      {/* Chart */}
      <div
        ref={chartRef}
        className="relative mt-3"
        onMouseLeave={() => setTooltip(null)}
      >
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.12em] text-white/25">
            Inference latency
          </span>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white/65" />
              <span className="text-[8px] text-white/30">
                p50
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
              <span className="text-[8px] text-white/20">
                p95
              </span>
            </div>
          </div>
        </div>

        {/* Smaller graph */}
        <div className="relative h-[48px] w-full">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            <div className="border-t border-white/[0.04]" />
            <div className="border-t border-white/[0.035]" />
            <div className="border-t border-white/[0.04]" />
          </div>

          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            preserveAspectRatio="none"
            viewBox={`0 0 ${data.length - 1} 100`}
          >
            <polyline
              points={data
                .map(
                  (point, index) =>
                    `${index},${getY(point.p95)}`
                )
                .join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />

            <polyline
              points={data
                .map(
                  (point, index) =>
                    `${index},${getY(point.p50)}`
                )
                .join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.65)"
              strokeWidth="1.3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Hover targets */}
          <div className="absolute inset-0 flex">
            {data.map((point) => (
              <div
                key={point.time}
                className="relative flex-1 cursor-default"
                onMouseEnter={(event) =>
                  showTooltip(event, point)
                }
                onMouseMove={moveTooltip}
              >
                <div className="absolute inset-y-0 left-1/2 w-px bg-transparent hover:bg-white/[0.06]" />
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="pointer-events-none absolute z-50"
              style={{
                left: tooltip.x,
                top: tooltip.y - 5,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="min-w-[150px] rounded-md border border-white/10 bg-[#17191d] px-2.5 py-2 shadow-xl">
                <div className="mb-1.5 flex items-center justify-between gap-5">
                  <span className="text-[10px] font-medium text-white">
                    {tooltip.point.time}
                  </span>

                  <span className="text-[8px] text-white/30">
                    {tooltip.point.requests} req
                  </span>
                </div>

                <div className="space-y-1 border-t border-white/10 pt-1.5">
                  <div className="flex justify-between gap-5">
                    <span className="text-[9px] text-white/40">
                      p50
                    </span>

                    <span className="text-[9px] text-white">
                      {tooltip.point.p50} ms
                    </span>
                  </div>

                  <div className="flex justify-between gap-5">
                    <span className="text-[9px] text-white/40">
                      p95
                    </span>

                    <span className="text-[9px] text-white">
                      {tooltip.point.p95} ms
                    </span>
                  </div>

                  <div className="flex justify-between gap-5">
                    <span className="text-[9px] text-white/40">
                      Errors
                    </span>

                    <span className="text-[9px] text-white">
                      {tooltip.point.errors}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Time labels */}
        <div className="mt-1 flex justify-between">
          {data
            .filter((_, index) => index % 2 === 0)
            .map((point) => (
              <span
                key={point.time}
                className="text-[8px] text-white/20"
              >
                {point.time}
              </span>
            ))}
        </div>
      </div>

      {/* Small bottom metrics */}
      <div className="mt-2.5 flex items-center gap-5 border-t border-white/[0.06] pt-2.5">
        <div>
          <span className="text-[8px] uppercase tracking-wider text-white/20">
            P50
          </span>
          <span className="ml-1.5 text-[9px] text-white/45">
            {avgP50} ms
          </span>
        </div>

        <div>
          <span className="text-[8px] uppercase tracking-wider text-white/20">
            Requests
          </span>
          <span className="ml-1.5 text-[9px] text-white/45">
            {totalRequests.toLocaleString()}
          </span>
        </div>

        <div>
          <span className="text-[8px] uppercase tracking-wider text-white/20">
            Errors
          </span>
          <span className="ml-1.5 text-[9px] text-white/45">
            {totalErrors}
          </span>
        </div>
      </div>
    </section>
  );
}