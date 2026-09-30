"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Logo } from "@/components/ui/Logos";
import { Button } from "@/components/ui/Button";
import {
  deleteConnection,
  fetchConnections,
  fetchProviders,
  providerLabel,
  reverifyConnection,
  type ProviderCapability,
  type ProviderConnection,
} from "@/components/providers/api";

export default function ProvidersPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [providers, setProviders] = useState<Record<string, ProviderCapability>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchConnections(), fetchProviders()])
      .then(([conns, list]) => {
        setConnections(conns);
        setProviders(Object.fromEntries(list.map((p) => [p.id, p])));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleReverify(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await reverifyConnection(id);
      setConnections((prev) =>
        prev.map((c) =>
          c.ID === id
            ? { ...c, Status: res.status || (res.verified ? "verified" : "failed") }
            : c,
        ),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this provider connection?")) return;
    setBusyId(id);
    setError("");
    try {
      await deleteConnection(id);
      setConnections((prev) => prev.filter((c) => c.ID !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete connection.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
            Providers
          </h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Connect cloud and compute providers to deploy workloads on ORCN.
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/providers/new")}>
          <Plus className="mr-1.5 size-3.5" /> Add Provider
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-xs text-[var(--text-muted)]">
          <Loader2 className="size-4 animate-spin" />
          Loading connections…
        </div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--dm-card-border)] bg-[var(--card-bg)] py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--dm-inset)]">
            <Plus className="size-5 text-[var(--text-muted)]" />
          </div>
          <p className="mt-3 text-sm font-medium text-[var(--text-main)]">
            No provider connections yet
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Connect a provider to start deploying.
          </p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => router.push("/providers/new")}
          >
            Add Provider
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((c) => {
            const providerName =
              providers[c.Provider]?.name || providerLabel(c.Provider);
            const verified = c.Status === "verified";
            return (
              <div
                key={c.ID}
                className="flex flex-col rounded-xl border border-[var(--dm-card-border)] bg-[var(--card-bg)] p-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--dm-inset)] p-2">
                    <Logo name={c.Provider} size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--text-main)]">
                      {c.Name}
                    </div>
                    <div className="truncate text-[11px] text-[var(--text-muted)]">
                      {providerName}
                    </div>
                  </div>
                  <span
                    className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      verified
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${verified ? "bg-emerald-400" : "bg-red-400"}`}
                    />
                    {verified ? "Connected" : "Failed"}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[var(--dm-divider)] pt-3">
                  <span className="text-[10px] text-[var(--text-light)]">
                    Added {new Date(c.CreatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => router.push(`/providers/${c.ID}/edit`)}
                      disabled={busyId === c.ID}
                      title="Edit connection"
                      className="flex items-center justify-center rounded-md border border-[var(--border)] p-1.5 text-[var(--text-muted)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-main)] disabled:opacity-50"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReverify(c.ID)}
                      disabled={busyId === c.ID}
                      title="Re-verify connection"
                      className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-muted)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-main)] disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`size-3 ${busyId === c.ID ? "animate-spin" : ""}`}
                      />
                      Verify
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.ID)}
                      disabled={busyId === c.ID}
                      title="Delete connection"
                      className="flex items-center justify-center rounded-md border border-[var(--border)] p-1.5 text-[var(--text-muted)] transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
