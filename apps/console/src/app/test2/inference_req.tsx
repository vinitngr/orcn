"use client";

import { ChartColumnIncreasing } from "lucide-react";
import { useRef, useState } from "react";

type Bucket = {
  success: number;
  errors: number;
};

type Day = {
  label: string;
  buckets: Bucket[];
};

const data: Day[] = [
  {
    label: "Sep 24",
    buckets: [
      { success: 18, errors: 1 },
      { success: 24, errors: 0 },
      { success: 31, errors: 1 },
      { success: 28, errors: 0 },
      { success: 36, errors: 2 },
      { success: 29, errors: 1 },
      { success: 41, errors: 1 },
      { success: 35, errors: 0 },
    ],
  },
  {
    label: "Sep 25",
    buckets: [
      { success: 42, errors: 1 },
      { success: 51, errors: 2 },
      { success: 47, errors: 0 },
      { success: 58, errors: 2 },
      { success: 63, errors: 1 },
      { success: 55, errors: 2 },
      { success: 71, errors: 2 },
      { success: 66, errors: 1 },
    ],
  },
  {
    label: "Sep 26",
    buckets: [
      { success: 38, errors: 1 },
      { success: 44, errors: 0 },
      { success: 52, errors: 2 },
      { success: 48, errors: 1 },
      { success: 61, errors: 2 },
      { success: 57, errors: 1 },
      { success: 69, errors: 3 },
      { success: 62, errors: 1 },
    ],
  },
  {
    label: "Sep 27",
    buckets: [
      { success: 65, errors: 2 },
      { success: 73, errors: 1 },
      { success: 81, errors: 3 },
      { success: 76, errors: 1 },
      { success: 91, errors: 2 },
      { success: 86, errors: 2 },
      { success: 103, errors: 4 },
      { success: 95, errors: 2 },
    ],
  },
  {
    label: "Sep 28",
    buckets: [
      { success: 72, errors: 1 },
      { success: 84, errors: 2 },
      { success: 78, errors: 1 },
      { success: 96, errors: 3 },
      { success: 91, errors: 1 },
      { success: 105, errors: 2 },
      { success: 98, errors: 1 },
      { success: 88, errors: 2 },
    ],
  },
  {
    label: "Sep 29",
    buckets: [
      { success: 91, errors: 2 },
      { success: 104, errors: 3 },
      { success: 118, errors: 2 },
      { success: 109, errors: 4 },
      { success: 127, errors: 3 },
      { success: 115, errors: 2 },
      { success: 138, errors: 5 },
      { success: 121, errors: 3 },
    ],
  },
  {
    label: "Sep 30",
    buckets: [
      { success: 76, errors: 1 },
      { success: 83, errors: 2 },
      { success: 91, errors: 1 },
      { success: 87, errors: 2 },
      { success: 98, errors: 2 },
      { success: 93, errors: 1 },
      { success: 106, errors: 3 },
      { success: 99, errors: 2 },
    ],
  },
];

export default function InferenceRequestsCard() {
  const chartRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    day: string;
    bucket: Bucket;
  } | null>(null);

  const totalSuccess = data.reduce(
    (dayTotal, day) =>
      dayTotal +
      day.buckets.reduce(
        (total, bucket) => total + bucket.success,
        0
      ),
    0
  );

  const totalErrors = data.reduce(
    (dayTotal, day) =>
      dayTotal +
      day.buckets.reduce(
        (total, bucket) => total + bucket.errors,
        0
      ),
    0
  );

  const totalRequests = totalSuccess + totalErrors;

  const allBuckets = data.flatMap((day) => day.buckets);

  const maxRequests = Math.max(
    ...allBuckets.map(
      (bucket) => bucket.success + bucket.errors
    )
  );

  const handleEnter = (
    event: React.MouseEvent<HTMLDivElement>,
    day: string,
    bucket: Bucket
  ) => {
    if (!chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();

    setTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      day,
      bucket,
    });
  };

  const handleMove = (
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
    <section className="w-full h-full rounded-xl border border-white/10 bg-[#0d0f12] px-5 py-4 text-white">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-white/85">
            <ChartColumnIncreasing className="h-4 w-4 text-white/45" />
            Inference requests
          </p>

          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight">
              {totalRequests.toLocaleString()}
            </span>

            <span className="text-[10px] text-white/30">
              requests
            </span>
          </div>

          <p className="text-[10px] text-white/25">
            Last 7 days
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-[2px] bg-[#3b82f6]" />
            <span className="text-[9px] text-white/35">
              Success
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-[2px] bg-[#ef4444]" />
            <span className="text-[9px] text-white/35">
              Errors
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={chartRef}
        className="relative mt-3"
        onMouseLeave={() => setTooltip(null)}
      >
        <div className="flex h-[42px] w-full items-end">
          {data.map((day) => (
            <div
              key={day.label}
              className="flex h-full min-w-0 flex-1 items-end"
            >
              {day.buckets.map((bucket, index) => {
                const total = bucket.success + bucket.errors;

                const height = Math.max(
                  (total / maxRequests) * 100,
                  10
                );

                const errorHeight =
                  (bucket.errors / total) * 100;

                return (
                  <div
                    key={`${day.label}-${index}`}
                    className="relative flex h-full min-w-0 flex-1 items-end"
                    onMouseEnter={(event) =>
                      handleEnter(event, day.label, bucket)
                    }
                    onMouseMove={handleMove}
                  >
                    <div
                      className="mx-[1px] w-full cursor-default overflow-hidden rounded-[1px]"
                      style={{
                        height: `${height}%`,
                      }}
                    >
                      <div
                        className="w-full bg-[#ef4444]"
                        style={{
                          height: `${errorHeight}%`,
                        }}
                      />

                      <div className="h-full w-full bg-[#3b82f6]" />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-1 h-px w-full bg-white/[0.06]" />

        {/* Day labels */}
        <div className="mt-1 flex w-full">
          {data.map((day) => (
            <div
              key={day.label}
              className="flex-1 text-center text-[8px] text-white/20"
            >
              {day.label}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50"
            style={{
              left: tooltip.x,
              top: tooltip.y - 6,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="min-w-[135px] rounded-md border border-white/10 bg-[#17191d] px-2.5 py-2 shadow-xl">
              <div className="mb-1.5 text-[10px] font-medium text-white">
                {tooltip.day}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-5">
                  <span className="flex items-center gap-1.5 text-[9px] text-white/40">
                    <span className="h-1.5 w-1.5 rounded-[2px] bg-[#3b82f6]" />
                    Success
                  </span>

                  <span className="text-[9px] text-white">
                    {tooltip.bucket.success}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-5">
                  <span className="flex items-center gap-1.5 text-[9px] text-white/40">
                    <span className="h-1.5 w-1.5 rounded-[2px] bg-[#ef4444]" />
                    Errors
                  </span>

                  <span className="text-[9px] text-white">
                    {tooltip.bucket.errors}
                  </span>
                </div>

                <div className="border-t border-white/10 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/25">
                      Total
                    </span>

                    <span className="text-[9px] font-medium text-white">
                      {tooltip.bucket.success +
                        tooltip.bucket.errors}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}