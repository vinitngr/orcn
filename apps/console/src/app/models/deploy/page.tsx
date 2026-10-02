"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Box, ChevronDown, ChevronRight } from "lucide-react";

import { StepIndicator } from "@/components/deploy-model/StepIndicator";
import { ModelSearchPanel } from "@/components/deploy-model/ModelSearchPanel";
import { ComputePanel } from "@/components/deploy-model/ComputePanel";
import { DeployConfigPanel } from "@/components/deploy-model/DeployConfigPanel";
import { DeploySummary } from "@/components/deploy-model/DeploySummary";
import { AdvancedConfigSection } from "@/components/deploy-model/AdvancedConfigSection";
import { DEFAULT_VLLM_IMAGE } from "@/data/curated-models";
import { useDeployModel } from "./use-deploy-model";

function DeployAIModelContent() {
  const {
    step,
    setStep,
    isPreselected,
    data,
    updateData,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    runtimes,
    modalities,
    isLoadingCapabilities,
    instances,
    modelDetails,
    advancedSchema,
    advancedConfig,
    showAdvanced,
    setShowAdvanced,
    isDeploying,
    handleSearch,
    handleModalityChange,
    handleRuntimeChange,
    handleDeploy,
    requiredVram,
    taskLabel,
    canNext,
    nextStep,
  } = useDeployModel();
  const [showImageOverride, setShowImageOverride] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-light)]">
          <Link
            href="/deployments"
            className="hover:text-[var(--dm-text-3)] transition-colors"
          >
            Deployments
          </Link>
          <ChevronRight className="size-3.5 text-zinc-600" />
          <Link
            href="/models"
            className="hover:text-[var(--dm-text-3)] transition-colors"
          >
            AI Models
          </Link>
          <ChevronRight className="size-3.5 text-zinc-600" />
          <span className="text-[var(--dm-text-3)]">Create Deployment</span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
          Deploy AI Model
        </h1>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Launch an LLM endpoint instantly via the network.
        </p>
      </div>

      {isPreselected && data.model && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="font-mono text-[var(--dm-text-3)]">
            {data.model}
          </span>
          <span className="text-[var(--text-light)]">
            {data.runtime} · {data.modality}
          </span>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-white underline decoration-dashed underline-offset-4 transition-opacity hover:opacity-80"
          >
            Change
          </button>
        </div>
      )}

      <div className="pt-1 pb-2">
        <StepIndicator
          currentStep={step}
          onStepClick={(s) => s <= step && setStep(s)}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {step === 1 && (
            <ModelSearchPanel
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSearch={handleSearch}
              isSearching={isSearching}
              searchResults={searchResults}
              selectedModel={data.model}
              onSelectModel={(id) => updateData({ model: id })}
              modality={data.modality}
              onModalityChange={handleModalityChange}
              runtime={data.runtime}
              onRuntimeChange={handleRuntimeChange}
              modalities={modalities}
              runtimes={runtimes}
              isLoadingCapabilities={isLoadingCapabilities}
              modelDetails={modelDetails}
              requiredVram={requiredVram}
              hfToken={data.hf_token}
              onHfTokenChange={(token) => updateData({ hf_token: token })}
            />
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
                  Select Compute
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Select a provider and dedicated hardware instance to host your
                  model.
                </p>
              </div>
              <ComputePanel
                selectedProvider={data.provider}
                onSelectProvider={(pid) =>
                  updateData({ provider: pid, instance: null, provider_config: {} })
                }
                selectedConnectionId={data.provider_connection_id}
                onSelectConnection={(conn) =>
                  updateData({
                    provider: conn.Provider,
                    provider_connection_id: conn.ID,
                    instance: null,
                    provider_config: {},
                  })
                }
                instances={instances}
                selectedInstance={data.instance}
                onSelectInstance={(i) => updateData({ instance: i })}
                requiredVram={requiredVram}
                selectedModel={data.model}
                providerConfig={data.provider_config}
                onProviderConfigChange={(key, val) =>
                  updateData({
                    provider_config: { ...data.provider_config, [key]: val },
                  })
                }
                volumeSizeGb={data.volume_size_gb}
                onVolumeSizeGbChange={(size) =>
                  updateData({ volume_size_gb: size })
                }
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <DeployConfigPanel
                name={data.name}
                onNameChange={(val) => updateData({ name: val })}
                replicas={data.replicas}
                onReplicasChange={(val) => updateData({ replicas: val })}
                strategy={data.strategy}
                onStrategyChange={(val) => updateData({ strategy: val })}
                timeoutMinutes={data.timeout_minutes}
                onTimeoutMinutesChange={(val) =>
                  updateData({ timeout_minutes: val })
                }
                apiKey={data.api_key}
                onApiKeyChange={(val) => updateData({ api_key: val })}
                selectedModel={data.model}
              />
              <AdvancedConfigSection
                schema={advancedSchema}
                data={advancedConfig}
                onChange={(key, value) =>
                  updateData({
                    advanced_config: { ...data.advanced_config, [key]: value },
                  })
                }
                isOpen={showAdvanced}
                onToggle={() => setShowAdvanced((v) => !v)}
              />
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--dm-panel-alt)] shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowImageOverride((v) => !v)}
                  className="flex w-full items-center justify-between p-5 text-left transition hover:bg-[var(--dm-hover-soft)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--dm-logo)] text-[var(--text-muted)]">
                      <Box className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-main)]">
                        Container Image{" "}
                        <span className="font-normal text-[var(--text-light)]">
                          (Optional)
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-light)]">
                        Override the default runtime image.
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`size-4 text-[var(--text-muted)] transition-transform duration-200 ${
                      showImageOverride ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showImageOverride && (
                  <div className="border-t border-[var(--dm-divider)] p-6">
                    <input
                      type="text"
                      value={data.image}
                      onChange={(e) => updateData({ image: e.target.value })}
                      placeholder={DEFAULT_VLLM_IMAGE}
                      spellCheck={false}
                      className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--dm-input)] px-3 font-mono text-xs text-[var(--text-main)] placeholder:text-[var(--text-light)] focus:border-[var(--border-hover)] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                    />
                    <p className="mt-1.5 text-[11px] text-[var(--text-light)]">
                      Leave empty to use the runtime default.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DeploySummary
          data={data}
          modelDetails={modelDetails}
          taskLabel={taskLabel}
          requiredVram={requiredVram}
          currentStep={step}
          onDeploy={handleDeploy}
          isDeploying={isDeploying}
          onNext={nextStep}
          canNext={canNext}
        />
      </div>
    </div>
  );
}

export default function DeployAIModelPage() {
  return (
    <Suspense>
      <DeployAIModelContent />
    </Suspense>
  );
}
