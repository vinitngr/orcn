/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { CopyButton } from "@/components/ui/CopyButton";
import { Braces, LayoutList } from "lucide-react";
import { SpecViewer } from "./SpecViewer";

function highlightJSON(jsonString: string) {
  if (!jsonString) return null;
  const regex = /(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(jsonString)) !== null) {
    const textBefore = jsonString.slice(lastIndex, match.index);
    if (textBefore) parts.push(textBefore);

    const token = match[0];
    if (/^"/.test(token)) {
      if (/:$/.test(token)) {
        parts.push(
          <span key={match.index} className="text-sky-400 font-medium">
            {token.slice(0, -1)}
          </span>
        );
        parts.push(":");
      } else {
        parts.push(
          <span key={match.index} className="text-emerald-300">
            {token}
          </span>
        );
      }
    } else if (/true|false/.test(token)) {
      parts.push(
        <span key={match.index} className="text-amber-400 font-semibold">
          {token}
        </span>
      );
    } else if (/null/.test(token)) {
      parts.push(
        <span key={match.index} className="text-rose-400 italic">
          {token}
        </span>
      );
    } else {
      parts.push(
        <span key={match.index} className="text-purple-300 font-medium">
          {token}
        </span>
      );
    }

    lastIndex = regex.lastIndex;
  }

  const textAfter = jsonString.slice(lastIndex);
  if (textAfter) parts.push(textAfter);

  return parts;
}

export function ConfigurationTab({ config }: { config: any }) {
  const pretty = config ? JSON.stringify(config, null, 2) : "";

  return (
    <div className="flex flex-col gap-3">
      {config && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <div className="mb-4 flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <LayoutList size={15} className="text-[var(--text-main)]" />
            <h2 className="text-sm font-bold text-[var(--text-main)]">Spec Details</h2>
          </div>
          <SpecViewer config={config} />
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <div className="flex items-center justify-between border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Braces size={15} className="text-[var(--text-main)]" />
            <h2 className="text-sm font-bold text-[var(--text-main)]">Raw JSON</h2>
          </div>
          {pretty && <CopyButton value={pretty} size={14} title="Copy configuration JSON" />}
        </div>

        {pretty ? (
          <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[#0d1117] p-4">
            <pre className="overflow-x-auto text-xs leading-relaxed font-mono whitespace-pre-wrap break-all text-slate-300">
              <code>{highlightJSON(pretty)}</code>
            </pre>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-hover)] p-8 text-center text-xs text-[var(--text-muted)]">
            No raw configuration specification stored for this deployment.
          </div>
        )}
      </div>
    </div>
  );
}
