"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, CircleDot } from "lucide-react";
import { SectionCard } from "@/components/deployments/node-detail/shared";
import { wsUrl } from "@/lib/api";

type LogEvent = {
  node: string;
  container: string;
  timestamp: string;
  log: string;
  source: string;
};

type StreamStatus = "idle" | "connecting" | "open" | "closed" | "error";

type Props = {
  deploymentId?: string;
  nodeId?: string;
};

const MAX_EVENTS = 500;

function levelFor(message: string): "INFO" | "WARN" | "ERROR" {
  const text = message.toLowerCase();
  if (text.includes("error") || text.includes("fail") || text.includes("interrupt")) {
    return "ERROR";
  }
  if (text.includes("warn") || text.includes("retry") || text.includes("reconnect")) {
    return "WARN";
  }
  return "INFO";
}

function levelClass(level: string) {
  if (level === "WARN") return "bg-amber-500/10 text-amber-500";
  if (level === "ERROR") return "bg-red-500/10 text-red-500";
  return "bg-blue-500/10 text-blue-400";
}

export function NodeEventsTab({ deploymentId, nodeId }: Props) {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>(
    deploymentId && nodeId ? "connecting" : "idle",
  );
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!deploymentId || !nodeId) return;

    let disposed = false;

    const socket = new WebSocket(
      wsUrl(`/api/v1/deployments/${deploymentId}/nodes/${nodeId}/events`),
    );

    socket.onopen = () => {
      if (!disposed) setStatus("open");
    };

    socket.onmessage = (message) => {
      if (disposed) return;
      try {
        const event = JSON.parse(message.data) as LogEvent;
        if (!event?.log) return;
        setEvents((prev) => {
          const next = prev.length >= MAX_EVENTS ? prev.slice(1) : prev.slice();
          next.push(event);
          return next;
        });
      } catch {
        // Ignore malformed frames.
      }
    };

    socket.onerror = () => {
      if (!disposed) setStatus("error");
    };

    socket.onclose = (event) => {
      if (disposed) return;
      setStatus("closed");
      if (event.code !== 1000) {
        setError(event.reason || "Event stream disconnected");
      }
    };

    return () => {
      disposed = true;
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    };
  }, [deploymentId, nodeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  const live = status === "open";

  return (
    <div className="space-y-3">
      <SectionCard
        title="Node Events"
        subtitle="Lifecycle and health events"
        action={
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <CircleDot
              className={[
                "size-3",
                live ? "text-emerald-500" : "text-[var(--text-muted)]",
              ].join(" ")}
            />
            {live
              ? "Live"
              : status === "connecting"
                ? "Connecting"
                : status === "error"
                  ? "Error"
                  : status === "closed"
                    ? "Disconnected"
                    : "Idle"}
          </span>
        }
      >
        {events.length > 0 ? (
          <div ref={scrollRef} className="max-h-[520px] space-y-1.5 overflow-auto">
            {events.map((event, idx) => {
              const level = levelFor(event.log);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={[
                        "rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider",
                        levelClass(level),
                      ].join(" ")}
                    >
                      {level}
                    </span>
                    <span className="truncate text-xs text-[var(--text-main)]">
                      {event.log}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded border border-dashed border-[var(--border)] px-3 py-4 text-center">
            <Activity className="mx-auto size-4 text-[var(--text-muted)] opacity-50" />
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              {status === "connecting"
                ? "Connecting to event feed..."
                : error
                  ? error
                  : "System events will stream here when the node emits them."}
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return date.toLocaleTimeString(undefined, { hour12: false });
}
