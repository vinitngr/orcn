/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import {
  Box,
  ChevronDown,
  ChevronRight,
  Container,
  Cpu,
  GitBranch,
  Globe,
  HardDrive,
  Layers,
  Lock,
  Terminal,
  Variable,
} from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";
import { Badge } from "@/components/ui/Badge";

function InfoTile({
  label,
  value,
  mono = false,
  copy = false,
  wide = false,
}: {
  label: string;
  value?: string | number | boolean | null;
  mono?: boolean;
  copy?: boolean;
  wide?: boolean;
}) {
  if (value === undefined || value === null || value === "") return null;
  const display = String(value);
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2.5 ${wide ? "col-span-2" : ""}`}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <span
        className={`flex items-center gap-1.5 break-all text-[12px] font-medium text-[var(--text-main)] ${mono ? "font-mono" : ""}`}
      >
        {display}
        {copy && <CopyButton value={display} size={11} />}
      </span>
    </div>
  );
}

function SectionBlock({
  icon: Icon,
  title,
  count,
  defaultOpen = true,
  children,
}: {
  icon: any;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition hover:bg-[var(--surface-hover)]"
      >
        {open ? (
          <ChevronDown size={13} className="shrink-0 text-[var(--text-muted)]" />
        ) : (
          <ChevronRight size={13} className="shrink-0 text-[var(--text-muted)]" />
        )}
        <Icon size={13} className="shrink-0 text-[var(--text-muted)]" />
        <span className="text-xs font-bold text-[var(--text-main)]">{title}</span>
        {count !== undefined && (
          <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
            {count}
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-[var(--border)] px-4 py-3">{children}</div>
      )}
    </div>
  );
}

/* ─── env vars table ────────────────────────────────────── */
function EnvVarsSection({ env }: { env: Record<string, string> }) {
  const entries = Object.entries(env);
  if (!entries.length) return null;
  const isSensitive = (k: string) =>
    /secret|password|token|key|auth|credential/i.test(k);

  return (
    <SectionBlock icon={Variable} title="Environment Variables" count={entries.length} defaultOpen={false}>
      <div className="rounded-md border border-[var(--border)] overflow-hidden">
        {/* header row */}
        <div className="grid grid-cols-[1fr_2fr] bg-[var(--surface-hover)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <span>Key</span>
          <span>Value</span>
        </div>
        {entries.map(([k, v], i) => (
          <div
            key={k}
            className={`grid grid-cols-[1fr_2fr] items-center px-3 py-2 text-[11px] ${i % 2 === 0 ? "bg-[var(--surface-hover)]" : "bg-[var(--card-bg)]"}`}
          >
            <span className="font-mono font-semibold text-sky-400 truncate pr-2">{k}</span>
            {isSensitive(k) ? (
              <span className="flex items-center gap-1 text-[var(--text-muted)]">
                <Lock size={10} />
                <span className="font-mono">••••••••</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 font-mono text-emerald-400 break-all">
                {v || <span className="italic text-[var(--text-muted)]">empty</span>}
                {v && <CopyButton value={v} size={10} />}
              </span>
            )}
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

/* ─── ports ─────────────────────────────────────────────── */
function PortsSection({ expose }: { expose: any[] }) {
  if (!expose?.length) return null;
  return (
    <SectionBlock icon={Globe} title="Exposed Ports" count={expose.length}>
      <div className="flex flex-wrap gap-2">
        {expose.map((p: any, i: number) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface-hover)] px-2.5 py-1.5 text-[11px]"
          >
            <span className="font-mono font-semibold text-[var(--text-main)]">{p.port}</span>
            <span className="text-[10px] uppercase text-[var(--text-muted)]">{p.protocol || "tcp"}</span>
            {p.is_public && (
              <Badge variant="success" className="text-[9px] py-0 px-1">public</Badge>
            )}
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

/* ─── volume mounts ─────────────────────────────────────── */
function MountsSection({ mounts }: { mounts: any[] }) {
  if (!mounts?.length) return null;
  return (
    <SectionBlock icon={HardDrive} title="Volume Mounts" count={mounts.length}>
      <div className="rounded-md border border-[var(--border)] overflow-hidden">
        <div className="grid grid-cols-2 bg-[var(--surface-hover)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <span>Volume Name</span>
          <span>Mount Path</span>
        </div>
        {mounts.map((m: any, i: number) => (
          <div
            key={i}
            className={`grid grid-cols-2 items-center px-3 py-2 text-[11px] font-mono ${i % 2 === 0 ? "bg-[var(--surface-hover)]" : "bg-[var(--card-bg)]"}`}
          >
            <span className="text-amber-400 truncate pr-2">{m.volume_name || m.name}</span>
            <span className="text-[var(--text-main)]">{m.mount_path}</span>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

/* ─── resources/weights ─────────────────────────────────── */
function ResourcesSection({ resources }: { resources: any[] }) {
  if (!resources?.length) return null;
  return (
    <SectionBlock icon={GitBranch} title="Resources / Weights" count={resources.length} defaultOpen={false}>
      <div className="flex flex-col gap-2">
        {resources.map((r: any, i: number) => (
          <div
            key={i}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2.5"
          >
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="default">{r.type || "HF"}</Badge>
              <span className="font-mono text-[11px] text-sky-400 break-all flex-1">{r.url}</span>
              {r.url && <CopyButton value={r.url} size={10} />}
            </div>
            {r.target && (
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <span>→</span>
                <span className="font-mono text-[var(--text-main)]">{r.target}</span>
              </div>
            )}
            {r.files?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {r.files.map((f: string, fi: number) => (
                  <span key={fi} className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

/* ─── single container card ─────────────────────────────── */
function ContainerCard({ container, index }: { container: any; index: number }) {
  const [open, setOpen] = useState(true);
  const args = container.args || {};
  const image: string = args.image || container.image || "";
  const cmd: string[] = args.cmd || [];
  const entrypoint: string[] = args.entrypoint || [];
  const env: Record<string, string> = args.env || {};
  const expose: any[] = args.expose || [];
  const mounts: any[] = args.volume_mounts || [];
  const resources: any[] = args.resources || [];
  const gpu: boolean = args.gpu ?? false;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      {/* container header toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-hover)]"
      >
        {open ? (
          <ChevronDown size={14} className="shrink-0 text-[var(--text-muted)]" />
        ) : (
          <ChevronRight size={14} className="shrink-0 text-[var(--text-muted)]" />
        )}
        <Container size={15} className="shrink-0 text-[var(--text-muted)]" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-main)]">
              {container.id || `container-${index + 1}`}
            </span>
            {gpu && (
              <span className="flex items-center gap-0.5 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
                <Cpu size={9} /> GPU
              </span>
            )}
          </div>
          {image && (
            <span className="mt-0.5 block font-mono text-[11px] text-[var(--text-muted)] truncate">
              {image}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] px-4 py-4 flex flex-col gap-3">

          {/* ── Core info grid ── */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <InfoTile label="Image" value={image} mono copy wide={!entrypoint.length && !cmd.length} />
            {entrypoint.length > 0 && (
              <InfoTile label="Entrypoint" value={entrypoint.join(" ")} mono copy />
            )}
            {gpu !== undefined && (
              <InfoTile label="GPU" value={gpu ? "Enabled" : "Disabled"} />
            )}
          </div>

          {/* ── Command box (full-width) ── */}
          {cmd.length > 0 && (
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <Terminal size={10} />
                Command
              </div>
              <div className="flex items-start gap-2">
                <code className="flex-1 break-all font-mono text-[12px] text-[var(--text-main)]">
                  {cmd.join(" ")}
                </code>
                <CopyButton value={cmd.join(" ")} size={11} />
              </div>
            </div>
          )}

          {/* ── Sub-sections ── */}
          <div className="flex flex-col gap-3">
            <EnvVarsSection env={env} />
            <PortsSection expose={expose} />
            <MountsSection mounts={mounts} />
            <ResourcesSection resources={resources} />
          </div>

        </div>
      )}
    </div>
  );
}

/* ─── top-level volumes (storage) ───────────────────────── */
function StorageVolumes({ volumes }: { volumes: any[] }) {
  if (!volumes?.length) return null;
  return (
    <SectionBlock icon={HardDrive} title="Storage Volumes" count={volumes.length}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {volumes.map((v: any, i: number) => (
          <div
            key={i}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2.5 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[12px] text-[var(--text-main)] truncate">{v.name}</span>
              <Badge variant="default">{v.type || "persistent"}</Badge>
            </div>
            {v.size_gb && (
              <span className="text-[11px] text-[var(--text-muted)]">{v.size_gb} GB</span>
            )}
            {v.host_path && (
              <span className="font-mono text-[10px] text-[var(--text-muted)] truncate">{v.host_path}</span>
            )}
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

/* ─── main export ───────────────────────────────────────── */
export function SpecViewer({ config }: { config: any }) {
  if (!config) return null;

  const containers: any[] = config.containers || [];
  const volumes: any[] = config.volumes || [];
  const meta: any = config.meta || {};

  return (
    <div className="flex flex-col gap-3">

      {/* ── Overview info grid ── */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <Layers size={11} />
          Overview
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <InfoTile label="Name" value={config.name} copy />
          <InfoTile label="Type" value={config.type} />
          <InfoTile label="Version" value={config.version} />
          <InfoTile label="Compute Type" value={config.computeType} />
          {meta.trigger && <InfoTile label="Trigger" value={meta.trigger} />}
        </div>
      </div>

      {/* ── Storage Volumes ── */}
      <StorageVolumes volumes={volumes} />

      {/* ── Containers ── */}
      {containers.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <Box size={11} />
            Containers
            <span className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 font-medium normal-case">
              {containers.length}
            </span>
          </div>
          {containers.map((c, i) => (
            <ContainerCard key={c.id || i} container={c} index={i} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {containers.length === 0 && volumes.length === 0 && (
        <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-hover)] p-6 text-center text-xs text-[var(--text-muted)]">
          No containers or volumes found in this specification.
        </div>
      )}
    </div>
  );
}
