"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpRight, Plus, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/Logos";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  CURATED_MODELS,
  CURATED_PROVIDERS,
  MODEL_CATEGORIES,
  type CuratedModel,
} from "@/data/curated-models";

const CATEGORY_ITEMS = [
  { label: "All types", value: "all" },
  ...MODEL_CATEGORIES.map((c) => ({ label: c.label, value: c.id })),
];

const PROVIDER_ITEMS = [
  { label: "All providers", value: "all" },
  ...CURATED_PROVIDERS.map((p) => ({ label: p, value: p })),
];

const SIZE_ITEMS = [
  { label: "All sizes", value: "all" },
  { label: "< 4B", value: "small" },
  { label: "4B - 13B", value: "mid" },
  { label: "> 13B", value: "large" },
];

function formatParams(p: number) {
  if (p < 1) return `${Math.round(p * 1000)}M`;
  return `${p}B`;
}

function ModelCard({
  m,
  onDeploy,
}: {
  m: CuratedModel;
  onDeploy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onDeploy}
      className="group relative flex min-h-[176px] w-full flex-col justify-between rounded-xl border border-[var(--dm-card-border)] bg-[var(--card-bg)] p-5 text-left transition-all duration-150 hover:border-[var(--border-hover)] hover:bg-[var(--surface-hover)]"
    >
      <ArrowUpRight className="absolute right-4 top-4 size-4 text-[var(--text-light)] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />

      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--dm-logo)] p-2">
          <Logo name={m.logo} size={24} />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <div
            className="truncate text-sm font-semibold text-[var(--text-main)]"
            title={m.displayName}
          >
            {m.displayName}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-light)]">
            {m.provider}
          </div>
          <p
            className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--text-muted)]"
            title={m.description}
          >
            {m.description}
          </p>
          <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
            <span className="rounded bg-[var(--dm-chip)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
              {m.pipeline}
            </span>
            {m.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                title={tag}
                className="max-w-full truncate rounded bg-[var(--dm-chip)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)] capitalize"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4 border-t border-[var(--dm-divider)] pt-3.5 text-[11px] text-[var(--text-muted)]">
        <span>{formatParams(m.parameters)}</span>
        <span className="text-[var(--border)]">|</span>
        <span>{m.minVramGb ? `~${m.minVramGb} GB VRAM` : m.runtime}</span>
        {m.contextLength && (
          <>
            <span className="text-[var(--border)]">|</span>
            <span>{m.contextLength} ctx</span>
          </>
        )}
      </div>
    </button>
  );
}

export default function AIModelsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [provider, setProvider] = useState("all");
  const [size, setSize] = useState("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return CURATED_MODELS.filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (provider !== "all" && m.provider !== provider) return false;
      if (size !== "all") {
        if (size === "small" && !(m.parameters < 4)) return false;
        if (size === "mid" && !(m.parameters >= 4 && m.parameters <= 13))
          return false;
        if (size === "large" && !(m.parameters > 13)) return false;
      }
      if (!q) return true;
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q)) ||
        m.pipeline.toLowerCase().includes(q)
      );
    });
  }, [query, category, provider, size]);

  const sections = useMemo(
    () =>
      MODEL_CATEGORIES.map((c) => ({
        ...c,
        models: filtered.filter((m) => m.category === c.id),
      })).filter((s) => s.models.length > 0),
    [filtered],
  );

  const handleDeploy = (
    modelId: string,
    runtime: string,
    modality: string,
    image: string,
  ) => {
    const params = new URLSearchParams({
      model: modelId,
      runtime,
      task: modality,
      ...(image ? { image } : {}),
      from: "catalog",
    });
    router.push(`/models/deploy?${params.toString()}`);
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <Sparkles className="size-3.5" /> Tested & ready to deploy
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[var(--text-main)]">
            AI Models
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Pre-configured models we have tested hosting. Pick one and choose
            compute — no setup needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/models/deploy")}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-[var(--border)] bg-[var(--surface-hover)] px-3 text-xs font-medium text-[var(--text-main)] transition hover:border-[var(--border-hover)]"
        >
          <Plus className="size-3.5" />
          Deploy custom model
        </button>
      </header>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-light)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search curated models (e.g. llama, embeddings, vision)"
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--dm-input)] pl-10 pr-3.5 text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:border-[var(--border-hover)] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={category}
            items={CATEGORY_ITEMS}
            onValueChange={(val: string | null) => val && setCategory(val)}
          >
            <SelectTrigger className="h-9 min-w-[130px] border-[var(--border)] bg-[var(--dm-input)] text-xs text-[var(--dm-text-2)]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border)] bg-[var(--dm-logo-solid)] text-[var(--dm-text-2)]">
              <SelectItem value="all">All types</SelectItem>
              {MODEL_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={provider}
            items={PROVIDER_ITEMS}
            onValueChange={(val: string | null) => val && setProvider(val)}
          >
            <SelectTrigger className="h-9 min-w-[140px] border-[var(--border)] bg-[var(--dm-input)] text-xs text-[var(--dm-text-2)]">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border)] bg-[var(--dm-logo-solid)] text-[var(--dm-text-2)]">
              <SelectItem value="all">All providers</SelectItem>
              {CURATED_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={size}
            items={SIZE_ITEMS}
            onValueChange={(val: string | null) => val && setSize(val)}
          >
            <SelectTrigger className="h-9 min-w-[110px] border-[var(--border)] bg-[var(--dm-input)] text-xs text-[var(--dm-text-2)]">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border)] bg-[var(--dm-logo-solid)] text-[var(--dm-text-2)]">
              <SelectItem value="all">All sizes</SelectItem>
              <SelectItem value="small">&lt; 4B</SelectItem>
              <SelectItem value="mid">4B - 13B</SelectItem>
              <SelectItem value="large">&gt; 13B</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sections */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--dm-hover-soft)] px-6 py-14 text-center">
          <Search className="size-5 text-zinc-600" />
          <p className="mt-3 text-xs font-medium text-[var(--text-muted)]">
            No models match your filters
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-light)]">
            Try a different search or clear the type / provider filter.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id}>
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-[var(--text-main)]">
                    {section.label}
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {section.description}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-[var(--text-light)]">
                  {section.models.length}{" "}
                  {section.models.length === 1 ? "model" : "models"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {section.models.map((m) => (
                  <ModelCard
                    key={m.modelId}
                    m={m}
                    onDeploy={() =>
                      handleDeploy(m.modelId, m.runtime, m.modality, m.image)
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
