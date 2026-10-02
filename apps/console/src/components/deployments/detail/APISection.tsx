/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  Code,
  ExternalLink,
  Globe,
  Plug,
  Shield,
} from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";

type Language = "curl" | "python" | "typescript" | "go";

type SpecPort = { port: number; protocol: string; isPublic: boolean };
type LiveEndpoint = { port: number; url: string; nodeID: string };

/** Ports declared in the job spec (`containers[].args.expose`) */
function buildSpecPorts(deployment: any): SpecPort[] {
  let parsed: any = null;
  try {
    parsed = deployment.JobSpecJSON
      ? JSON.parse(deployment.JobSpecJSON)
      : null;
  } catch {
    return [];
  }
  const containers = Array.isArray(parsed?.containers)
    ? parsed.containers
    : [];
  const seen = new Set<number>();
  const ports: SpecPort[] = [];
  for (const c of containers) {
    for (const p of c?.args?.expose || []) {
      const port = Number(p?.port);
      if (!Number.isFinite(port) || port <= 0 || seen.has(port)) continue;
      seen.add(port);
      ports.push({
        port,
        protocol: String(p.protocol || "http").toLowerCase(),
        isPublic: Boolean(p.is_public),
      });
    }
  }
  return ports.sort((a, b) => a.port - b.port);
}

/** Live tunnel URLs reported by replica nodes */
function buildLiveEndpoints(nodes: any[]): LiveEndpoint[] {
  const out: LiveEndpoint[] = [];
  for (const node of nodes || []) {
    if (!node?.EndpointsJSON) continue;
    let arr: any[] = [];
    try {
      const parsed = JSON.parse(node.EndpointsJSON);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      continue;
    }
    for (const e of arr) {
      const port = Number(e?.port);
      const url = String(e?.base_url || "").replace(/\/+$/, "");
      if (!Number.isFinite(port) || port <= 0 || !url) continue;
      out.push({ port, url, nodeID: node.ID });
    }
  }
  return out;
}

function scheme(): string {
  if (typeof window === "undefined") return "http";
  return window.location.protocol === "https:" ? "https" : "http";
}

function SectionHeader({
  icon: Icon,
  title,
  sub,
  right,
}: {
  icon: typeof Globe;
  title: string;
  sub: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2.5">
      <div className="flex items-center gap-2">
        <Icon size={14} className="shrink-0 text-[var(--text-muted)]" />
        <div>
          <h2 className="text-sm font-bold text-[var(--text-main)]">{title}</h2>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{sub}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

function UrlActions({ url, openTitle }: { url: string; openTitle: string }) {
  if (!url) return null;
  return (
    <div className="flex shrink-0 items-center gap-1">
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="rounded p-1 text-[var(--text-muted)] transition hover:bg-[var(--card-bg)] hover:text-[var(--text-main)]"
        title={openTitle}
      >
        <ExternalLink size={12} />
      </a>
      <CopyButton value={url} size={12} />
    </div>
  );
}

export function APISection({ deployment }: { deployment: any }) {
  const [activeLang, setActiveLang] = useState<Language>("curl");
  const [selectedPort, setSelectedPort] = useState<number | null>(null);

  const nodes = deployment.Nodes || [];
  const specPorts = buildSpecPorts(deployment);
  const live = buildLiveEndpoints(nodes);
  const liveByPort = new Map<number, string>();
  for (const e of live) {
    if (!liveByPort.has(e.port)) liveByPort.set(e.port, e.url);
  }

  const host =
    typeof window !== "undefined" ? window.location.hostname : "localhost";
  const slug = String(deployment.Name || deployment.ID || "deployment")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const gatewayBase = String(
    deployment.GatewayURL || deployment.Endpoint || deployment.URL || "",
  ).replace(/\/+$/, "");

  /** Best-known URL for a port: live tunnel first, then reserved route */
  const urlFor = (port: number) => {
    const tunnel = liveByPort.get(port);
    if (tunnel) return { url: tunnel, live: true };
    if (gatewayBase)
      return { url: `${gatewayBase.replace(/:\d+$/, "")}:${port}`, live: false };
    return { url: `${scheme()}://${slug}-${port}.${host}`, live: false };
  };

  const publicCount = specPorts.filter((p) => p.isPublic).length;
  const primaryUrl = gatewayBase || `${scheme()}://${slug}.${host}`;

  const task = String(deployment.Task || "").toLowerCase();
  const isModel =
    task === "chat" ||
    task === "embedding" ||
    task === "score" ||
    Boolean(deployment.ModelID);
  const model = deployment.ModelID || deployment.Name || "-";
  const apiPath =
    task === "embedding"
      ? "/v1/embeddings"
      : task === "score"
        ? "/v1/score"
        : "/v1/chat/completions";

  // Base for snippets: explicit gateway, else first live tunnel root.
  const snippetBase = gatewayBase || live[0]?.url || "";
  const fullEndpoint = snippetBase ? `${snippetBase}${apiPath}` : "";

  const rows = specPorts.map((p) => ({ ...p, ...urlFor(p.port) }));
  const activeRow =
    rows.find((r) => r.port === selectedPort) ??
    rows.find((r) => r.isPublic) ??
    rows[0] ??
    null;

  const codeSnippets: Record<Language, string> = {
    curl: `curl -X POST "${fullEndpoint || apiPath}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $ORCN_API_KEY" \\
  -d '{
    "model": "${model}",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  }'`,
    python: `import openai

client = openai.OpenAI(
    base_url="${snippetBase}/v1",
    api_key="your-api-key",
)

response = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Hello!"}],
)

print(response.choices[0].message.content)`,
    typescript: `import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: '${snippetBase}/v1',
  apiKey: process.env.ORCN_API_KEY || 'your-api-key',
});

const completion = await openai.chat.completions.create({
  model: '${model}',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(completion.choices[0].message.content);`,
    go: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	payload, _ := json.Marshal(map[string]any{
		"model": "${model}",
		"messages": []map[string]string{
			{"role": "user", "content": "Hello!"},
		},
	})

	req, _ := http.NewRequest("POST", "${fullEndpoint || apiPath}", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer $ORCN_API_KEY")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`,
  };

  const sampleResponse = `{
  "id": "chatcmpl-${String(deployment.ID || "completion").slice(0, 8)}",
  "object": "chat.completion",
  "model": "${model}",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I assist you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 10, "completion_tokens": 9, "total_tokens": 19 }
}`;

  const connectSnippet = activeRow
    ? `# ${activeRow.isPublic ? "Public" : "Internal"} port :${activeRow.port}\ncurl -i "${activeRow.url}"`
    : "";

  return (
    <div className="space-y-3">
      {/* Live endpoints */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <SectionHeader
          icon={Globe}
          title="Endpoints"
          sub={
            rows.length
              ? "Resolved URLs for every declared port"
              : "No ports declared in this deployment"
          }
          right={
            rows.length > 0 ? (
              <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                {publicCount > 0
                  ? `${publicCount} public · ${rows.length - publicCount} internal`
                  : `${rows.length} internal`}
              </span>
            ) : undefined
          }
        />

        {rows.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Primary
                </span>
                <span className="truncate font-mono text-[11px] text-[var(--text-main)]">
                  {primaryUrl}
                </span>
              </div>
              <UrlActions url={primaryUrl} openTitle="Open primary endpoint" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <div
                  key={r.port}
                  className="rounded border border-[var(--border)] bg-[var(--surface-hover)] p-2.5"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-semibold text-[var(--text-main)]">
                        :{r.port}
                      </span>
                      <span className="text-[10px] uppercase text-[var(--text-muted)]">
                        {r.protocol}
                      </span>
                      {r.live && (
                        <span
                          className="size-1.5 rounded-full bg-emerald-500"
                          title="Live URL reported by a replica"
                        />
                      )}
                    </div>
                    <span
                      className={[
                        "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                        r.isPublic
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-[var(--card-bg)] text-[var(--text-muted)]",
                      ].join(" ")}
                    >
                      {r.isPublic ? "public" : "internal"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="truncate font-mono text-[10px] text-[var(--text-muted)]"
                      title={r.url}
                    >
                      {r.url}
                    </span>
                    <UrlActions url={r.url} openTitle={`Open :${r.port}`} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500 align-middle" />
              Live URLs are reported by running replicas; the rest are reserved
              routes that activate on start.
            </p>
          </div>
        ) : (
          <div className="rounded border border-dashed border-[var(--border)] px-3 py-3 text-center text-[11px] text-[var(--text-muted)]">
            This deployment exposes no ports, so there is nothing to connect
            to yet.
          </div>
        )}
      </div>

      {isModel ? (
        /* OpenAI-compatible request */
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <SectionHeader
            icon={Code}
            title="Request"
            sub={`OpenAI-compatible · POST ${apiPath}`}
            right={
              <div className="flex shrink-0 items-center gap-1">
                {(["curl", "python", "typescript", "go"] as Language[]).map(
                  (lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveLang(lang)}
                      className={[
                        "rounded px-2 py-1 font-mono text-[11px] transition-colors duration-150",
                        activeLang === lang
                          ? "bg-[var(--surface-hover)] font-semibold text-[var(--text-main)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-main)]",
                      ].join(" ")}
                    >
                      {lang}
                    </button>
                  ),
                )}
                <span className="mx-1 h-4 w-px bg-[var(--border)]" />
                <CopyButton
                  value={codeSnippets[activeLang]}
                  size={13}
                  title="Copy code snippet"
                />
              </div>
            }
          />

          {!snippetBase && (
            <div className="mb-2 rounded border border-dashed border-[var(--border)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
              No reachable base URL yet — start the deployment and the snippet
              below will fill in automatically.
            </div>
          )}
          <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[#0d1117] p-3.5">
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
              <code>{codeSnippets[activeLang]}</code>
            </pre>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              { name: "Authorization", value: "Bearer $ORCN_API_KEY" },
              { name: "Content-Type", value: "application/json" },
            ].map((h) => (
              <div
                key={h.name}
                className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2"
              >
                <code className="text-[11px] font-semibold text-[var(--text-main)]">
                  {h.name}
                </code>
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-mono text-[11px] text-[var(--text-muted)]">
                    {h.value}
                  </span>
                  <CopyButton value={h.value} size={12} />
                </div>
              </div>
            ))}
          </div>

          <details className="group mt-2 rounded-md border border-[var(--border)]">
            <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-main)]">
              <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">
                ▸
              </span>
              View sample response
            </summary>
            <div className="overflow-hidden border-t border-[var(--border)] bg-[#0d1117] p-3">
              <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-emerald-400">
                <code>{sampleResponse}</code>
              </pre>
            </div>
          </details>
        </div>
      ) : (
        /* Generic container: connect */
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <SectionHeader
            icon={Plug}
            title="Connect"
            sub="Talk to your container over HTTP"
            right={
              activeRow ? (
                <CopyButton
                  value={connectSnippet}
                  size={13}
                  title="Copy connect snippet"
                />
              ) : undefined
            }
          />

          {activeRow ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {rows.map((r) => (
                  <button
                    key={r.port}
                    type="button"
                    onClick={() => setSelectedPort(r.port)}
                    className={[
                      "rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors duration-150",
                      r.port === activeRow.port
                        ? "border-[var(--border-hover)] bg-[var(--surface-hover)] font-semibold text-[var(--text-main)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]",
                    ].join(" ")}
                  >
                    :{r.port}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2">
                <span className="truncate font-mono text-[11px] text-[var(--text-main)]">
                  {activeRow.url}
                </span>
                <UrlActions
                  url={activeRow.url}
                  openTitle={`Open :${activeRow.port}`}
                />
              </div>
              <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[#0d1117] p-3.5">
                <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
                  <code>{connectSnippet}</code>
                </pre>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Paths, methods, and auth depend on the server running inside
                your container — the snippet above just checks reachability.
              </p>
            </div>
          ) : (
            <div className="rounded border border-dashed border-[var(--border)] px-3 py-3 text-center text-[11px] text-[var(--text-muted)]">
              <Shield size={14} className="mx-auto mb-1.5 text-[var(--text-muted)]" />
              Declare an exposed port in the job spec to get a connect snippet
              here.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
