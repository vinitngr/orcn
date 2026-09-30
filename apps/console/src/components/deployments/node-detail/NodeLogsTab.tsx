"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { SectionCard } from "@/components/deployments/node-detail/shared";
import { wsUrl } from "@/lib/api";

export type ContainerRef = { id: string; image: string };

type LogEvent = {
  node: string;
  container: string;
  timestamp: string;
  log: string;
  source: string;
};

type StreamStatus = "idle" | "connecting" | "open" | "closed" | "error";
type KindFilter = "all" | "container" | "system";

type Props = {
  deploymentId?: string;
  nodeId?: string;
  containers: ContainerRef[];
  selected?: string | null;
  onSelect: (id: string | null) => void;
};

const MAX_LOG_LINES = 3000;
const ALL_CONTAINERS = "__all__";

export function NodeLogsTab({
  deploymentId,
  nodeId,
  containers,
  selected,
  onSelect,
}: Props) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>(
    deploymentId && nodeId ? "connecting" : "idle",
  );
  const [error, setError] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!deploymentId || !nodeId) return;

    let disposed = false;

    const socket = new WebSocket(
      wsUrl(`/api/v1/deployments/${deploymentId}/nodes/${nodeId}/logs`),
    );

    socket.onopen = () => {
      if (!disposed) setStatus("open");
    };

    socket.onmessage = (message) => {
      if (disposed) return;
      try {
        const event = JSON.parse(message.data) as LogEvent;
        if (!event?.log) return;
        setLogs((prev) => {
          const next = prev.length >= MAX_LOG_LINES ? prev.slice(1) : prev.slice();
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
        setError(event.reason || "Log stream disconnected");
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

  const containerOptions = useMemo(() => {
    const set = new Set<string>();
    containers.forEach((c) => c.id && set.add(c.id));
    logs.forEach((l) => l.container && set.add(l.container));
    return Array.from(set).sort();
  }, [containers, logs]);

  const visibleLogs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter((line) => {
      if (kind === "container" && line.source !== "app") return false;
      if (kind === "system" && line.source !== "system") return false;
      if (selected && line.container !== selected) return false;
      if (needle && !line.log.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [logs, kind, selected, query]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visibleLogs.length]);

  const statusLabel =
    status === "open"
      ? "Live"
      : status === "connecting"
        ? "Connecting"
        : status === "error"
          ? "Error"
          : status === "closed"
            ? "Disconnected"
            : "Idle";

  return (
    <div className="space-y-3">
      <SectionCard
        title="Container Logs"
        subtitle={
          selected ? `Filtered to ${selected}` : "All containers on this node"
        }
        action={
          <div className="flex items-center gap-2">
            {selected && (
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--text-muted)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-main)]"
              >
                <X className="size-3" /> Clear filter
              </button>
            )}
            <Button variant="secondary" size="sm" disabled>
              {statusLabel}
            </Button>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Select
            value={kind}
            onValueChange={(value: string) => setKind((value as KindFilter) ?? "all")}
          >
            <SelectTrigger
              size="sm"
              className="h-8 min-w-[150px] border-[var(--border)] bg-[var(--surface)] text-[11px] text-[var(--text-main)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All messages</SelectItem>
              <SelectItem value="container">Container logs</SelectItem>
              <SelectItem value="system">System events</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selected ?? ALL_CONTAINERS}
            onValueChange={(value: string) =>
              onSelect(!value || value === ALL_CONTAINERS ? null : value)
            }
          >
            <SelectTrigger
              size="sm"
              className="h-8 min-w-[160px] border-[var(--border)] bg-[var(--surface)] text-[11px] text-[var(--text-main)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CONTAINERS}>All containers</SelectItem>
              {containerOptions.map((id) => (
                <SelectItem key={id} value={id}>
                  {id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search logs..."
            className="h-8 min-w-[180px] flex-1 border-[var(--border)] bg-[var(--surface)] text-[11px] text-[var(--text-main)] md:text-[11px]"
          />

          <span className="ml-auto font-mono text-[10px] text-[var(--text-muted)]">
            {visibleLogs.length} / {logs.length} lines
          </span>
        </div>

        {visibleLogs.length === 0 ? (
          <div className="flex h-[68vh] min-h-[460px] flex-col items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-hover)] px-4 py-10 text-center">
            <Terminal className="size-5 text-[var(--text-muted)] opacity-40" />
            <p className="mt-3 text-xs font-medium text-[var(--text-muted)]">
              {status === "connecting"
                ? "Connecting to log stream..."
                : logs.length > 0
                  ? "No lines match the current filters"
                  : selected
                    ? `Waiting for ${selected} log stream`
                    : "Waiting for log stream"}
            </p>
            {error ? (
              <p className="mt-1 max-w-sm text-[10px] text-red-500">{error}</p>
            ) : (
              <p className="mt-1 max-w-sm text-[10px] text-[var(--text-muted)] opacity-70">
                Logs stream live from the node and are cleared when you leave
                this tab.
              </p>
            )}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="h-[68vh] min-h-[460px] overflow-auto rounded border border-[var(--border)] bg-[var(--surface-hover)] p-3 font-mono text-[11.5px] leading-relaxed"
          >
            {visibleLogs.map((line, idx) => (
              <div
                key={idx}
                className="flex gap-2 whitespace-pre-wrap break-all border-b border-[var(--border)]/40 py-0.5"
              >
                <span className="shrink-0 text-[var(--text-muted)] opacity-60">
                  {formatTime(line.timestamp)}
                </span>
                <span
                  className={[
                    "shrink-0 rounded px-1 text-[10px] py-1 h-fit",
                    line.source === "system"
                      ? "bg-blue-500/10 text-blue-400"
                      : "bg-emerald-500/10 text-emerald-400",
                  ].join(" ")}
                >
                  {line.container}
                </span>
                <span className="text-[var(--text-main)]">{line.log}</span>
              </div>
            ))}
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
