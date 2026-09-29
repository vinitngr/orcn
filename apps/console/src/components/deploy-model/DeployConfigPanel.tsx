"use client";

import { useState } from "react";
import { Sparkles, Shield, Clock, RotateCcw, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

interface DeployConfigPanelProps {
  name: string;
  onNameChange: (val: string) => void;
  replicas: number;
  onReplicasChange: (val: number) => void;
  strategy: string;
  onStrategyChange: (val: string) => void;
  timeoutMinutes: number;
  onTimeoutMinutesChange: (val: number) => void;
  apiKey: string;
  onApiKeyChange: (val: string) => void;
  selectedModel: string;
}

export function DeployConfigPanel({
  name,
  onNameChange,
  replicas,
  onReplicasChange,
  strategy,
  onStrategyChange,
  timeoutMinutes,
  onTimeoutMinutesChange,
  apiKey,
  onApiKeyChange,
  selectedModel,
}: DeployConfigPanelProps) {
  const [requireAuth, setRequireAuth] = useState(!!apiKey);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);

  const handleGenerateName = () => {
    const modelPrefix = (selectedModel.split("/").pop() || "model")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 16);
    const rand = Math.random().toString(36).substring(2, 6);
    onNameChange(`${modelPrefix}-${rand}`);
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: "", value: "" }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: "key" | "value", val: string) => {
    const updated = [...envVars];
    updated[index][field] = val;
    setEnvVars(updated);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--dm-panel)] p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
          Deployment Configuration
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Configure deployment orchestration, execution lifecycle, and access
          parameters.
        </p>
      </div>

      {/* 1. Deployment Name */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[var(--dm-text-2)]">
            Deployment Identifier <span className="text-red-400">*</span>
          </label>
          <button
            type="button"
            onClick={handleGenerateName}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Sparkles className="size-3" />
            <span>Generate random</span>
          </button>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) =>
            onNameChange(
              e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
            )
          }
          placeholder="e.g. prod-llama-endpoint"
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--dm-card)] px-3.5 text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:border-[var(--border-hover)] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
        />
        <p className="text-[11px] text-[var(--text-light)]">
          Unique service subdomain and DNS prefix for this model endpoint.
        </p>
      </div>

      {/* 2. Replicas & Strategy */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Replicas */}
        <div className="space-y-2 rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-[var(--dm-text-2)]">
                Worker Replicas
              </label>
              <p className="text-[11px] text-[var(--text-light)]">
                Number of dedicated instances
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onReplicasChange(Math.max(1, replicas - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--dm-inset)] text-xs text-[var(--dm-text-3)] hover:bg-[var(--dm-inset-hover)] disabled:opacity-40"
                disabled={replicas <= 1}
              >
                -
              </button>
              <span className="w-6 text-center text-xs font-semibold text-[var(--text-main)]">
                {replicas}
              </span>
              <button
                type="button"
                onClick={() => onReplicasChange(replicas + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--dm-inset)] text-xs text-[var(--dm-text-3)] hover:bg-[var(--dm-inset-hover)]"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Strategy */}
        <div className="space-y-2 rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card)] p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--dm-text-2)]">
            <RotateCcw className="size-3.5 text-[var(--text-muted)]" />
            <span>Restart & Recovery Strategy</span>
          </div>
          <Select
            value={strategy}
            onValueChange={(val: string | null) => val && onStrategyChange(val)}
          >
            <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--dm-inset)] text-xs text-[var(--dm-text-2)]">
              <SelectValue placeholder="Strategy" />
            </SelectTrigger>
            <SelectContent className="border-[var(--border)] bg-[var(--dm-select-content)] text-[var(--dm-text-2)]">
              <SelectItem value="EXTEND">Extend Lease (Recommended)</SelectItem>
              <SelectItem value="RESTART">Restart on Node Failure</SelectItem>
              <SelectItem value="MANUAL">Manual Control Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Timeout / Lifecycle */}
      <div className="space-y-2 rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--dm-text-2)]">
            <Clock className="size-3.5 text-[var(--text-muted)]" />
            <span>Execution Lease Timeout</span>
          </div>
          <span className="text-[11px] text-[var(--text-light)]">
            {timeoutMinutes === 0 ? "Continuous" : `${timeoutMinutes} minutes`}
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-light)]">
          Automatically spin down nodes after duration to prevent unexpected
          compute costs.
        </p>
        <Select
          value={String(timeoutMinutes)}
          onValueChange={(val: string | null) =>
            val && onTimeoutMinutesChange(parseInt(val, 10))
          }
        >
          <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--dm-inset)] text-xs text-[var(--dm-text-2)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[var(--border)] bg-[var(--dm-select-content)] text-[var(--dm-text-2)]">
            <SelectItem value="60">1 Hour (60m)</SelectItem>
            <SelectItem value="180">3 Hours (180m)</SelectItem>
            <SelectItem value="720">12 Hours (720m)</SelectItem>
            <SelectItem value="1440">24 Hours (1440m)</SelectItem>
            <SelectItem value="0">Unlimited / Manual Termination</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 4. Security & API Protection */}
      <div className="space-y-3 rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--dm-text-2)]">
            <Shield className="size-3.5 text-blue-400" />
            <span>Endpoint Access Protection</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={requireAuth}
              onChange={(e) => {
                setRequireAuth(e.target.checked);
                if (!e.target.checked) onApiKeyChange("");
              }}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-[11px] text-[var(--text-light)]">
          Enforce Authorization header token check on gateway proxy endpoints.
        </p>
        {requireAuth && (
          <input
            type="text"
            placeholder="Enter custom API Bearer Token (or leave empty to auto-generate)"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--dm-inset)] px-3 text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:border-[var(--border-hover)] focus:outline-none"
          />
        )}
      </div>

      {/* 5. Environment Variables (Custom Config) */}
      <div className="space-y-3 rounded-xl border border-[var(--dm-divider)] bg-[var(--dm-card)] p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-[var(--dm-text-2)]">
            Environment Variables & Annotations
          </div>
          <button
            type="button"
            onClick={addEnvVar}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus className="size-3" />
            <span>Add Variable</span>
          </button>
        </div>

        {envVars.length === 0 ? (
          <p className="text-[11px] text-[var(--text-light)]">
            No custom environment variables set. Click Add Variable to inject
            environment parameters.
          </p>
        ) : (
          <div className="space-y-2">
            {envVars.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="KEY"
                  value={item.key}
                  onChange={(e) => updateEnvVar(idx, "key", e.target.value)}
                  className="h-8 flex-1 rounded-lg border border-[var(--border)] bg-[var(--dm-inset)] px-3 font-mono text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:border-[var(--border-hover)] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="VALUE"
                  value={item.value}
                  onChange={(e) => updateEnvVar(idx, "value", e.target.value)}
                  className="h-8 flex-1 rounded-lg border border-[var(--border)] bg-[var(--dm-inset)] px-3 font-mono text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:border-[var(--border-hover)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeEnvVar(idx)}
                  className="p-1.5 text-[var(--text-light)] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="size, p-1" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
