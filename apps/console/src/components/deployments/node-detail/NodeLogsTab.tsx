import { Terminal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/deployments/node-detail/shared";

export type ContainerRef = { id: string; image: string };

type Props = {
  containers: ContainerRef[];
  selected?: string | null;
  onSelect: (id: string | null) => void;
};

export function NodeLogsTab({ containers, selected, onSelect }: Props) {
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
              Stream (Coming Soon)
            </Button>
          </div>
        }
      >
        {containers.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <FilterChip
              label="All containers"
              active={!selected}
              onClick={() => onSelect(null)}
              muted={Boolean(selected)}
            />
            {containers.map((c) => (
              <FilterChip
                key={c.id}
                label={c.id}
                active={selected === c.id}
                onClick={() => onSelect(c.id)}
                muted={Boolean(selected) && selected !== c.id}
              />
            ))}
          </div>
        )}

        <div className="flex min-h-[220px] flex-col items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-hover)] px-4 py-10 text-center">
          <Terminal className="size-5 text-[var(--text-muted)] opacity-40" />
          <p className="mt-3 text-xs font-medium text-[var(--text-muted)]">
            {selected
              ? `Waiting for ${selected} log stream`
              : "Waiting for log stream"}
          </p>
          <p className="mt-1 max-w-sm text-[10px] text-[var(--text-muted)] opacity-70">
            Log streaming is reserved. Connect the runtime log feed to populate
            this panel.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

function FilterChip({
  label,
  active,
  muted,
  onClick,
}: {
  label: string;
  active: boolean;
  muted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition",
        active
          ? "border-[var(--text-main)] bg-[var(--surface-hover)] font-semibold text-[var(--text-main)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-main)]",
        muted ? "opacity-60" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
