"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, HelpCircle, BookOpen } from "lucide-react";

import { StepIndicator } from "@/components/deploy-model/StepIndicator";
import {
  ModelSearchPanel,
  RuntimeCapability,
  RuntimeTask,
} from "@/components/deploy-model/ModelSearchPanel";
import { ComputePanel } from "@/components/deploy-model/ComputePanel";
import { DeployConfigPanel } from "@/components/deploy-model/DeployConfigPanel";
import { DeploySummary } from "@/components/deploy-model/DeploySummary";
import { ConfigOption } from "@/components/deploy-model/AdvancedConfigSection";
import { ModelItem } from "@/components/deploy-model/ModelCard";
import {
  ModelDetails,
  ModelSearchApiResult,
} from "@/components/deploy-model/model-types";
import { mapInstance, ComputeInstance } from "@/components/create/instance-utils";

function applyDetectedParsers(
  config: Record<string, string>,
  modality: string,
  modelDetails: ModelDetails | null,
  schema: ConfigOption[]
): Record<string, string> {
  if (
    !["text-generation", "multimodal"].includes(modality) ||
    !modelDetails ||
    schema.length === 0
  ) {
    return config;
  }
  const metadata = modelDetails.metadata || {};
  const detected = {
    tool_parser: metadata.tool_parser ?? modelDetails.recommended_tool_parser ?? "",
    reasoning_parser:
      metadata.reasoning_parser ?? modelDetails.recommended_reasoning_parser ?? "",
  };
  const nextConfig = { ...config };
  for (const key of ["tool_parser", "reasoning_parser"] as const) {
    const option = schema.find((opt) => opt.key === key);
    const value = detected[key];
    if (!option?.options?.includes(value)) continue;
    const current = nextConfig[key];
    // Only auto-fill when unset or still at the schema default so user edits stick.
    if (!current || current === option.default) {
      nextConfig[key] = value;
    }
  }
  return nextConfig;
}

function estimateVramNeeded(modelId: string, modelDetails?: ModelDetails | null): number {
  let paramsB = 0;
  let regexParams = 0;
  const match = modelId.match(/(\d+(?:\.\d+)?)b/i);
  if (match) regexParams = parseFloat(match[1]);

  if (modelDetails?.safetensors?.total) {
    paramsB = modelDetails.safetensors.total / 1e9;
    if (regexParams > 0 && paramsB < regexParams * 0.5) paramsB = regexParams;
  } else if (typeof modelDetails?.parameters === "number" && modelDetails.parameters > 0) {
    paramsB = modelDetails.parameters;
  } else {
    paramsB = regexParams > 0 ? regexParams : 8;
  }

  let bytesPerParam = 2;
  const quantConfig = modelDetails?.config?.quantization_config;
  if (quantConfig) {
    let bits = quantConfig.bits || quantConfig.weight_bits;
    if (!bits && quantConfig.config_groups?.group_0?.weights?.num_bits)
      bits = quantConfig.config_groups.group_0.weights.num_bits;
    if (bits === 4) bytesPerParam = 0.5;
    else if (bits === 8) bytesPerParam = 1;
    else if (["awq", "gptq", "exl2"].includes(quantConfig.quant_method ?? ""))
      bytesPerParam = modelId.toLowerCase().includes("8bit") ? 1 : 0.5;
  } else if (modelDetails?.config?.torch_dtype) {
    const dtype = modelDetails.config.torch_dtype.toLowerCase();
    if (dtype.includes("int8") || dtype.includes("fp8")) bytesPerParam = 1;
    else if (dtype.includes("float32")) bytesPerParam = 4;
  } else if (modelDetails?.quantization) {
    const q = modelDetails.quantization.toLowerCase();
    if (q.includes("fp16")) bytesPerParam = 2;
    else if (q.includes("q8")) bytesPerParam = 1;
    else if (q.includes("q6")) bytesPerParam = 0.75;
    else if (q.includes("q5")) bytesPerParam = 0.625;
    else if (q.includes("q4")) bytesPerParam = 0.5;
    else if (q.includes("q3")) bytesPerParam = 0.375;
    else if (q.includes("q2")) bytesPerParam = 0.25;
  } else {
    const idL = modelId.toLowerCase();
    if (idL.includes("fp8") || idL.includes("int8") || idL.includes("8bit") || idL.includes("q8")) bytesPerParam = 1;
    else if (idL.includes("awq") || idL.includes("gptq") || idL.includes("int4") || idL.includes("4bit") || idL.includes("q4")) bytesPerParam = 0.5;
    else if (idL.includes("fp32")) bytesPerParam = 4;
  }

  let overhead = paramsB > 50 ? 8 : paramsB > 20 ? 4 : 2;
  if (modelDetails?.quantization) overhead += 1;
  return paramsB * bytesPerParam + overhead;
}

export default function DeployAIModelPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [data, setData] = useState({
    name: "",
    modality: "",
    runtime: "",
    replicas: 1,
    provider: "",
    model: "",
    instance: null as ComputeInstance | null,
    hf_token: "",
    strategy: "EXTEND",
    timeout_minutes: 60,
    api_key: "",
    volume_size_gb: 50,
    provider_config: {} as Record<string, string>,
    advanced_config: {} as Record<string, string>,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ModelItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [runtimes, setRuntimes] = useState<RuntimeCapability[]>([]);
  const [modalities, setModalities] = useState<RuntimeTask[]>([]);
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(true);
  const [instances, setInstances] = useState<ComputeInstance[]>([]);
  const [modelDetails, setModelDetails] = useState<ModelDetails | null>(null);
  const [advancedSchema, setAdvancedSchema] = useState<ConfigOption[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  // Load runtime & modality capabilities from the backend registry (single source of truth)
  useEffect(() => {
    fetch("/api/v1/runtimes")
      .then((r) => r.json())
      .then((json) => {
        const caps: RuntimeCapability[] = Array.isArray(json.runtimes) ? json.runtimes : [];
        const tasks: RuntimeTask[] = Array.isArray(json.tasks) ? json.tasks : [];
        setRuntimes(caps);
        setModalities(tasks);
        setData((d) => {
          const modality = tasks.some((t) => t.id === d.modality) ? d.modality : tasks[0]?.id ?? "";
          const runtimeIds = caps.filter((c) => c.tasks.some((t) => t.id === modality)).map((c) => c.id);
          const runtime = runtimeIds.includes(d.runtime) ? d.runtime : runtimeIds[0] ?? "";
          return { ...d, modality, runtime };
        });
      })
      .catch(console.error)
      .finally(() => setIsLoadingCapabilities(false));
  }, []);

  // Load runtime schema
  useEffect(() => {
    if (!data.runtime || !data.modality) return;
    fetch(`/api/v1/runtimes/schema?runtime=${data.runtime}&task=${encodeURIComponent(data.modality)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.schema) {
          const schema = json.schema as ConfigOption[];
          setAdvancedSchema(schema);
          const defaults: Record<string, string> = {};
          schema.forEach((opt) => {
            defaults[opt.key] = opt.default;
          });
          setData((d) => ({
            ...d,
            advanced_config: { ...defaults, ...d.advanced_config },
          }));
        }
      })
      .catch(console.error);
  }, [data.runtime, data.modality]);

  // Load model details
  useEffect(() => {
    if (!data.model || !data.runtime) return;
    fetch(
      `/api/v1/models/details?runtime=${data.runtime}&task=${encodeURIComponent(data.modality)}&model=${encodeURIComponent(data.model)}`
    )
      .then((r) => r.json())
      .then((json) => {
        if (json.details) {
          setModelDetails(json.details as ModelDetails);
        }
      })
      .catch(console.error);
  }, [data.model, data.runtime, data.modality]);

  // Load instance types for active provider – make sure we have a provider selected (nosana is default)
  useEffect(() => {
    fetch(`/api/v1/instances?provider=${data.provider}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.instances && Array.isArray(json.instances)) {
          setInstances(json.instances.map(mapInstance));
        } else {
          setInstances([]);
        }
      })
      .catch(console.error);
  }, [data.provider]);

  const advancedConfig = useMemo(
    () =>
      applyDetectedParsers(
        data.advanced_config,
        data.modality,
        modelDetails,
        advancedSchema
      ),
    [data.advanced_config, data.modality, modelDetails, advancedSchema]
  );

  const handleSearch = async () => {
    if (!searchQuery || !data.runtime || !data.modality) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/v1/models/search?runtime=${data.runtime}&task=${encodeURIComponent(data.modality)}&q=${encodeURIComponent(searchQuery)}`
      );
      const json = await res.json();
      if (json.results) {
        setSearchResults(
          (json.results as ModelSearchApiResult[]).map((r) => {
            const params =
              typeof r.Parameters === "number" && r.Parameters > 0 ? r.Parameters : undefined;
            return {
              id: r.ID,
              name: r.ID.split("/").pop() || r.ID,
              org: r.Author || r.ID.split("/")[0] || "model",
              downloads: r.Downloads,
              likes: r.Likes,
              parameters: params,
              vram: params ? `~${Math.ceil(params * 2 + 2)} GB` : undefined,
              tags: Array.isArray(r.Tags) ? r.Tags : [],
              pipelineTag: r.PipelineTag,
            };
          })
        );
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  const handleModalityChange = (val: string) => {
    setSearchQuery("");
    setSearchResults([]);
    setModelDetails(null);
    setData((d) => {
      const runtimeIds = runtimes
        .filter((c) => c.tasks.some((t) => t.id === val))
        .map((c) => c.id);
      const runtime = runtimeIds.includes(d.runtime) ? d.runtime : runtimeIds[0] ?? "";
      return { ...d, modality: val, runtime, model: "", advanced_config: {} };
    });
  };

  const handleRuntimeChange = (val: string) => {
    setSearchResults([]);
    setModelDetails(null);
    setData((d) => ({ ...d, runtime: val, model: "", advanced_config: {} }));
  };

  const handleDeploy = async () => {
    if (!data.name || !data.model || !data.instance) return;
    setIsDeploying(true);
    try {
      const res = await fetch("/api/v1/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          provider_id: data.provider,
          instance_type_id: data.instance.id,
          instance_name: data.instance.name,
          runtime_id: data.runtime,
          task: data.modality,
          model_id: data.model,
          replicas: data.replicas,
          hf_token: data.hf_token,
          timeout_minutes: data.timeout_minutes,
          strategy: data.strategy,
          volume_size_gb: data.volume_size_gb,
          provider_config: data.provider_config,
          advanced_config: {
            ...advancedConfig,
            ...(data.api_key ? { api_key: data.api_key } : {}),
          },
        }),
      });
      const json = await res.json();
      if (res.ok && json.deployment_id) {
        if (json.warning) alert(json.warning);
        router.push("/deployments");
      } else {
        alert(json.error || "Failed to deploy model");
      }
    } catch {
      alert("Error deploying model");
    }
    setIsDeploying(false);
  };

  const requiredVram = data.model ? estimateVramNeeded(data.model, modelDetails) : 16;
  const taskLabel = modalities.find((t) => t.id === data.modality)?.name;

  const canNext =
    step === 1 ? !!data.model && (!modelDetails?.gated || !!data.hf_token) :
    step === 2 ? !!data.instance :
    step === 3 ? !!data.name && !!data.model && !!data.instance :
    false;

  const nextStep = () => setStep((s) => Math.min(3, s + 1));

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Link href="/deployments" className="hover:text-zinc-300 transition-colors">
            Deployments
          </Link>
          <ChevronRight className="size-3.5 text-zinc-600" />
          <span className="text-zinc-300">Create Deployment</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <button type="button" className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors">
            <HelpCircle className="size-3.5" />
            <span>Help</span>
          </button>
          <button type="button" className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors">
            <BookOpen className="size-3.5" />
            <span>Docs</span>
          </button>
        </div>
      </div>

      {/* Main Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Deploy AI Model</h1>
        <p className="mt-1 text-xs text-zinc-400">
          Launch an LLM endpoint instantly via the network.
        </p>
      </div>

      {/* 3-Step Indicator */}
      <div className="pt-1 pb-2">
        <StepIndicator currentStep={step} onStepClick={(s) => s <= step && setStep(s)} />
      </div>

      {/* Two-column layout: Form / Panels on left, Deployment Summary on right */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left Column Content */}
        <div className="space-y-6">
          {step === 1 && (
            <ModelSearchPanel
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSearch={handleSearch}
              isSearching={isSearching}
              searchResults={searchResults}
              selectedModel={data.model}
              onSelectModel={(id) => setData((d) => ({ ...d, model: id }))}
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
              onHfTokenChange={(token) => setData((d) => ({ ...d, hf_token: token }))}
              advancedSchema={advancedSchema}
              advancedConfig={advancedConfig}
              onAdvancedChange={(key, value) =>
                setData((d) => ({ ...d, advanced_config: { ...d.advanced_config, [key]: value } }))
              }
              showAdvanced={showAdvanced}
              onToggleAdvanced={() => setShowAdvanced((v) => !v)}
            />
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Select Compute</h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Select a provider and dedicated hardware instance to host your model.
                </p>
              </div>
              <ComputePanel
                selectedProvider={data.provider}
                onSelectProvider={(pid) =>
                  setData((d) => ({ ...d, provider: pid, instance: null, provider_config: {} }))
                }
                instances={instances}
                selectedInstance={data.instance}
                onSelectInstance={(i) => setData((d) => ({ ...d, instance: i }))}
                requiredVram={requiredVram}
                selectedModel={data.model}
                providerConfig={data.provider_config}
                onProviderConfigChange={(key, val) =>
                  setData((d) => ({
                    ...d,
                    provider_config: { ...d.provider_config, [key]: val },
                  }))
                }
                volumeSizeGb={data.volume_size_gb}
                onVolumeSizeGbChange={(size) => setData((d) => ({ ...d, volume_size_gb: size }))}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <DeployConfigPanel
                name={data.name}
                onNameChange={(val) => setData((d) => ({ ...d, name: val }))}
                replicas={data.replicas}
                onReplicasChange={(val) => setData((d) => ({ ...d, replicas: val }))}
                strategy={data.strategy}
                onStrategyChange={(val) => setData((d) => ({ ...d, strategy: val }))}
                timeoutMinutes={data.timeout_minutes}
                onTimeoutMinutesChange={(val) => setData((d) => ({ ...d, timeout_minutes: val }))}
                apiKey={data.api_key}
                onApiKeyChange={(val) => setData((d) => ({ ...d, api_key: val }))}
                selectedModel={data.model}
                onDeploy={handleDeploy}
                isDeploying={isDeploying}
                canDeploy={canNext}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar: Deployment Summary */}
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
