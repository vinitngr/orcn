"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logos";
import { Button } from "@/components/ui/Button";
import {
  createConnection,
  fetchConnection,
  fetchConnections,
  fetchProviders,
  fetchSchemas,
  reverifyConnection,
  updateConnection,
  verifyConnectionInput,
  providerLabel,
  type ProviderCapability,
  type ProviderConnection,
  type ProviderField,
} from "./api";
import { ProviderFieldInput } from "./ProviderFieldInput";

const STEPS = ["Provider", "Configuration", "Complete"];

type FlowStatus = "idle" | "verifying" | "saving" | "success" | "error";

interface Props {
  connectionId?: string;
}

export function ProviderWizard({ connectionId }: Props) {
  const router = useRouter();
  const isEdit = Boolean(connectionId);

  const [providers, setProviders] = useState<ProviderCapability[]>([]);
  const [schemas, setSchemas] = useState<Record<string, ProviderField[]>>({});
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  const [selected, setSelected] = useState<ProviderCapability | null>(null);
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File>>({});

  const [status, setStatus] = useState<FlowStatus>("idle");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<ProviderConnection | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchProviders(),
      fetchSchemas(),
      fetchConnections(),
      connectionId ? fetchConnection(connectionId) : Promise.resolve(null),
    ])
      .then(([list, map, conns, existing]) => {
        if (!active) return;
        setProviders(list);
        setSchemas(map);
        setConnections(conns);

        if (existing) {
          const provider =
            list.find((p) => p.id === existing.Provider) || {
              id: existing.Provider,
              name: providerLabel(existing.Provider),
              description: "",
              type: "cloud",
            };
          const schema = map[existing.Provider] || provider.schema || [];
          const config = existing.Config
            ? (JSON.parse(existing.Config) as Record<string, unknown>)
            : {};
          const prefilled: Record<string, unknown> = {};
          schema.forEach((f) => {
            if (!f.secret && config[f.key] !== undefined) {
              prefilled[f.key] = config[f.key];
            }
            if (f.type === "boolean" && prefilled[f.key] === undefined) {
              prefilled[f.key] = f.secret ? false : (config[f.key] ?? false);
            }
          });
          setSelected(provider);
          setName(existing.Name);
          setValues(prefilled);
          setStep(2);
        }
      })
      .catch((e: unknown) =>
        active && setError(e instanceof Error ? e.message : "Failed to load."),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [connectionId]);

  const available = useMemo(() => {
    if (!providers.length) return [];
    const known = Object.keys(schemas);
    if (known.length === 0) return providers;
    return providers.filter((p) => schemas[p.id] !== undefined);
  }, [providers, schemas]);

  const fields = useMemo(
    () => (selected ? schemas[selected.id] || selected.schema || [] : []),
    [selected, schemas],
  );

  const nameTaken = useMemo(() => {
    if (!selected) return false;
    return connections.some(
      (c) =>
        c.ID !== connectionId &&
        c.Provider === selected.id &&
        c.Name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
  }, [connections, selected, name, connectionId]);

  const canConnect = useMemo(() => {
    if (!name.trim() || nameTaken) return false;
    return fields
      .filter((f) => f.required)
      .every((f) => {
        if (f.type === "file") return Boolean(files[f.key]);
        const v = values[f.key];
        return v !== undefined && v !== null && v !== "";
      });
  }, [name, nameTaken, fields, values, files]);

  function chooseProvider(p: ProviderCapability) {
    setSelected(p);
    setName(`${p.id}-connection`);
    setFiles({});
    setError("");
    setStatus("idle");
    const schema = schemas[p.id] || p.schema || [];
    const defaults: Record<string, unknown> = {};
    schema.forEach((f) => {
      if (f.default) defaults[f.key] = f.default;
      if (f.type === "boolean" && !f.default) defaults[f.key] = false;
    });
    setValues(defaults);
    setStep(2);
  }

  async function handleSubmit() {
    if (!selected) return;
    setError("");
    try {
      setStatus("verifying");
      const result = await verifyConnectionInput(
        selected.id,
        fields,
        values,
        files,
      );
      if (!result.verified) {
        setStatus("error");
        setError(result.error || "Credentials could not be verified.");
        return;
      }

      setStatus("saving");
      let conn: ProviderConnection;
      if (isEdit && connectionId) {
        conn = await updateConnection(
          connectionId,
          selected.id,
          name.trim(),
          fields,
          values,
          files,
        );
        // Mandatory re-verify after a save so the stored status is always fresh.
        await reverifyConnection(connectionId);
        conn = { ...conn, Status: "verified" };
      } else {
        conn = await createConnection(
          selected.id,
          name.trim(),
          fields,
          values,
          files,
        );
      }
      setCreated(conn);
      setStatus("success");
      setStep(3);
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to save provider.");
    }
  }

  const busy = status === "verifying" || status === "saving";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-light)]">
        <button
          type="button"
          onClick={() => router.push("/providers")}
          className="transition-colors hover:text-[var(--dm-text-3)]"
        >
          Providers
        </button>
        <span>/</span>
        <span className="text-[var(--dm-text-3)]">
          {isEdit ? "Edit Provider" : "Add Provider"}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() =>
            step > 1 && !busy ? setStep(step - 1) : router.push("/providers")
          }
          disabled={busy}
          title={step > 1 ? "Back" : "Back to providers"}
          className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-main)] disabled:opacity-50"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
            {isEdit ? "Edit Provider" : "Add Provider"}
          </h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {step === 1
              ? "Select a cloud or compute provider to connect to ORCN."
              : step === 2
                ? isEdit
                  ? "Update the credentials and configuration, then save to re-verify."
                  : "Enter your provider credentials and configuration details."
                : "Your provider has been connected to ORCN."}
          </p>
        </div>
      </div>

      <StepDots
        current={step}
        onStepClick={(s) => s < step && !busy && setStep(s)}
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-xs text-[var(--text-muted)]">
          <Loader2 className="size-4 animate-spin" />
          Loading providers…
        </div>
      ) : step === 1 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {available.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => chooseProvider(p)}
              className="group relative flex flex-col rounded-2xl border border-[var(--dm-card-border)] bg-[var(--dm-card)] p-5 text-left transition-all duration-150 hover:border-blue-500/50 hover:bg-[var(--dm-card-hover)] hover:shadow-[0_0_18px_rgba(59,130,246,0.12)]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--dm-inset)] p-3">
                  <Logo name={p.id} size={30} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-[var(--text-main)]">
                    {p.name}
                  </div>
                  <span className="mt-1 inline-block rounded bg-[var(--dm-chip)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    {p.type}
                  </span>
                </div>
              </div>

              {p.description && (
                <p className="mt-4 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
                  {p.description}
                </p>
              )}

              {(p.features?.length ?? 0) > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--dm-divider)] pt-3">
                  {p.features!.map((feat) => (
                    <span
                      key={feat}
                      className="rounded-md border border-[var(--dm-chip-border)] bg-[var(--dm-inset)] px-2 py-1 text-[10px] text-[var(--text-muted)]"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
          {available.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              No connectable providers available.
            </p>
          )}
        </div>
      ) : step === 2 && selected ? (
        <div className="rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card)] p-5">
          <div className="flex items-center justify-center gap-3 border-b border-[var(--dm-divider)] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--dm-inset)] p-2">
              <Logo name={selected.id} size={22} />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-[var(--text-main)]">
                {selected.name}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {isEdit ? "Update connection" : "Configure connection"}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--dm-text-3)]">
                Connection Name <span className="text-red-400">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${selected.id}-connection`}
                className={`h-9 w-full rounded-lg border bg-[var(--dm-inset)] px-3 text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:outline-none ${
                  nameTaken
                    ? "border-red-500/50 focus:border-red-500"
                    : "border-[var(--border)] focus:border-blue-500"
                }`}
              />
              {nameTaken && (
                <p className="text-[10px] text-red-400">
                  A {providerLabel(selected.id)} connection with this name
                  already exists.
                </p>
              )}
            </div>

            {fields.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                This provider does not require any credentials.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="block text-xs font-medium text-[var(--dm-text-3)]">
                      {field.name}
                      {field.required && (
                        <span className="ml-0.5 text-red-400">*</span>
                      )}
                    </label>
                    <ProviderFieldInput
                      field={field}
                      value={values[field.key]}
                      file={files[field.key] || null}
                      onChange={(key, value) =>
                        setValues((v) => ({ ...v, [key]: value }))
                      }
                      onFileChange={(key, file) =>
                        setFiles((f) => {
                          const next = { ...f };
                          if (file) next[key] = file;
                          else delete next[key];
                          return next;
                        })
                      }
                    />
                    {field.description && (
                      <p className="text-[10px] text-[var(--text-light)]">
                        {field.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-[var(--dm-divider)] pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => (isEdit ? router.push("/providers") : setStep(1))}
              disabled={busy}
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canConnect || busy}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  {status === "verifying" ? "Verifying…" : "Saving…"}
                </>
              ) : isEdit ? (
                "Save & Verify"
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card)] p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
            <Check className="size-6 text-emerald-400" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[var(--text-main)]">
            {isEdit ? "Provider Updated" : "Provider Connected"}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {providerLabel(created?.Provider || selected?.id || "")} has been
            successfully {isEdit ? "updated" : "connected"}.
          </p>

          <div className="mx-auto mt-5 max-w-md space-y-2 rounded-lg border border-[var(--dm-divider)] bg-[var(--dm-inset)] p-4 text-left text-xs">
            <Row label="Connection" value={created?.Name || name} />
            <Row
              label="Provider"
              value={providerLabel(created?.Provider || selected?.id || "")}
            />
            <Row label="Status" value={created?.Status || "verified"} success />
          </div>

          <div className="mt-6 flex justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push("/providers")}
            >
              Done
            </Button>
            {!isEdit && (
              <Button
                size="sm"
                onClick={() => {
                  setStep(1);
                  setSelected(null);
                  setCreated(null);
                  setStatus("idle");
                  setError("");
                }}
              >
                Add Another Provider
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  success,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="flex items-center gap-1.5 font-medium text-[var(--text-main)]">
        {success && <span className="size-1.5 rounded-full bg-emerald-400" />}
        {value}
      </span>
    </div>
  );
}

function StepDots({
  current,
  onStepClick,
}: {
  current: number;
  onStepClick?: (step: number) => void;
}) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = current > step;
        const active = current === step;
        const clickable = step < current;
        return (
          <div key={label} className="flex items-center">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStepClick?.(step)}
              className={`flex items-center gap-2.5 ${
                clickable ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <span
                className={`flex size-4 items-center justify-center rounded-[4px] border text-[10px] ${
                  done || active
                    ? "border-blue-500 bg-blue-500/10 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                    : "border-[var(--border)] bg-[var(--dm-tag)] text-[var(--text-light)]"
                }`}
              >
                {done ? (
                  <Check className="size-2.5 stroke-[3] text-blue-400" />
                ) : active ? (
                  <span className="size-1.5 rounded-[1px] bg-blue-400" />
                ) : null}
              </span>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  active
                    ? "text-[var(--text-main)]"
                    : done
                      ? "text-[var(--dm-text-3)]"
                      : "text-[var(--text-light)]"
                }`}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-4 h-px w-12 shrink-0 ${
                  current > step ? "bg-zinc-600" : "bg-[var(--border)]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
