"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { StepIndicator } from "@/components/deploy-model/StepIndicator";
import { ModelSearchPanel } from "@/components/deploy-model/ModelSearchPanel";
import { ComputePanel } from "@/components/deploy-model/ComputePanel";
import { DeployConfigPanel } from "@/components/deploy-model/DeployConfigPanel";
import { DeploySummary } from "@/components/deploy-model/DeploySummary";
import { useDeployModel } from "./use-deploy-model";

export default function DeployAIModelPage() {
  const {
    step,
    setStep,
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
              advancedSchema={advancedSchema}
              advancedConfig={advancedConfig}
              onAdvancedChange={(key, value) =>
                updateData({
                  advanced_config: { ...data.advanced_config, [key]: value },
                })
              }
              showAdvanced={showAdvanced}
              onToggleAdvanced={() => setShowAdvanced((v) => !v)}
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
