/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Terminal, Key, Shield, Code, Sparkles } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";

type Language = "curl" | "python" | "typescript" | "go";

export function APISection({ deployment }: { deployment: any }) {
  const [activeLang, setActiveLang] = useState<Language>("curl");
  
  const task = deployment.Task ?? "chat";
  const path = task === "embedding" ? "/v1/embeddings" : task === "score" ? "/v1/score" : "/v1/chat/completions";
  
  // Use actual deployment endpoint or gateway URL if provided by backend API
  const endpointBase = deployment.Endpoint || deployment.GatewayURL || deployment.URL || "";
  const fullEndpoint = endpointBase ? `${endpointBase.replace(/\/$/, '')}${path}` : path;
  const model = deployment.ModelID || deployment.Name || "-";

  const codeSnippets: Record<Language, string> = {
    curl: `curl -X POST "${fullEndpoint || path}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $ORCN_API_KEY" \\
  -d '{
    "model": "${model}",
    "messages": [
      { "role": "system", "content": "You are a helpful AI assistant." },
      { "role": "user", "content": "Hello!" }
    ],
    "temperature": 0.7,
    "max_tokens": 150
  }'`,
    python: `import openai

client = openai.OpenAI(
    base_url="${endpointBase || "https://api.your-domain.com"}/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="${model}",
    messages=[
        {"role": "system", "content": "You are a helpful AI assistant."},
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)`,
    typescript: `import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: '${endpointBase || "https://api.your-domain.com"}/v1',
  apiKey: process.env.ORCN_API_KEY || 'your-api-key',
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: '${model}',
    messages: [
      { role: 'user', content: 'Hello!' },
    ],
  });

  console.log(completion.choices[0].message.content);
}

main();`,
    go: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	url := "${fullEndpoint || path}"
	payload := map[string]interface{}{
		"model": "${model}",
		"messages": []map[string]string{
			{"role": "user", "content": "Hello!"},
		},
	}
	jsonPayload, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer $ORCN_API_KEY")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`
  };

  const sampleResponse = `{
  "id": "chatcmpl-${deployment.ID?.slice(0, 8) || "completion"}",
  "object": "chat.completion",
  "created": ${Math.floor(Date.now() / 1000)},
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
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 9,
    "total_tokens": 19
  }
}`;

  return (
    <div className="flex flex-col gap-3">
      {/* Endpoint Overview Header Card */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded bg-[var(--surface-hover)] text-[var(--text-main)] border border-[var(--border)]">
              <Terminal size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">API Endpoint Reference</h2>
              <p className="text-xs text-[var(--text-muted)]">OpenAI-compatible HTTP REST API specification</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500 border border-emerald-500/20">
              HTTP POST
            </span>
            <span className="rounded bg-[var(--surface-hover)] px-2 py-0.5 text-[11px] font-mono text-[var(--text-muted)] border border-[var(--border)]">
              {task}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface-hover)] p-3 flex flex-col justify-between">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">Target Base URL</div>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <code className="font-mono text-xs font-semibold text-[var(--text-main)] truncate">
                {endpointBase || "-"}
              </code>
              {endpointBase && <CopyButton value={endpointBase} size={13} />}
            </div>
          </div>

          <div className="rounded-md border border-[var(--border)] bg-[var(--surface-hover)] p-3 flex flex-col justify-between">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">Full Endpoint Path</div>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <code className="font-mono text-xs font-semibold text-[var(--text-main)] truncate">
                {fullEndpoint || path}
              </code>
              <CopyButton value={fullEndpoint || path} size={13} />
            </div>
          </div>
        </div>
      </div>

      {/* Code Integration & Authentication Grid */}
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr] items-start">
        {/* Left: Code Snippets with Language Switcher */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 flex flex-col">
          <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <Code size={16} className="text-[var(--text-main)]" />
              <h2 className="text-sm font-bold text-[var(--text-main)]">Request Code Examples</h2>
            </div>
            <CopyButton value={codeSnippets[activeLang]} size={14} title="Copy code snippet" />
          </div>

          {/* Language Switcher Tabs */}
          <div className="mb-3 flex items-center gap-1 border-b border-[var(--border)] pb-2">
            {(["curl", "python", "typescript", "go"] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLang(lang)}
                className={[
                  "rounded px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors duration-150",
                  activeLang === lang
                    ? "bg-[var(--text-main)] text-[var(--bg-color)] font-semibold"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]",
                ].join(" ")}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[#0d1117] p-3.5">
            <pre className="overflow-x-auto text-xs leading-relaxed text-slate-200 font-mono">
              <code>{codeSnippets[activeLang]}</code>
            </pre>
          </div>
        </div>

        {/* Right: Headers & Expected Response */}
        <div className="flex flex-col gap-3">
          {/* Headers Card */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 flex flex-col">
            <div className="mb-3 flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <Shield size={16} className="text-[var(--text-main)]" />
              <h2 className="text-sm font-bold text-[var(--text-main)]">Required Request Headers</h2>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2">
                <code className="font-semibold text-[var(--text-main)]">Authorization</code>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[var(--text-muted)]">Bearer $ORCN_API_KEY</span>
                  <CopyButton value="Bearer $ORCN_API_KEY" size={12} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2">
                <code className="font-semibold text-[var(--text-main)]">Content-Type</code>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[var(--text-muted)]">application/json</span>
                  <CopyButton value="application/json" size={12} />
                </div>
              </div>
            </div>
          </div>

          {/* Sample JSON Response */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4 flex flex-col">
            <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--text-main)]" />
                <h2 className="text-sm font-bold text-[var(--text-main)]">Expected Response Payload</h2>
              </div>
              <CopyButton value={sampleResponse} size={13} />
            </div>
            <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[#0d1117] p-3">
              <pre className="overflow-x-auto text-[11px] leading-relaxed text-emerald-400 font-mono">
                <code>{sampleResponse}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
