"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfigOption } from "@/components/deploy-model/AdvancedConfigSection";
import { ModelItem } from "@/components/deploy-model/ModelCard";
import {
  ModelDetails,
  ModelSearchApiResult,
} from "@/components/deploy-model/model-types";
import {
  RuntimeCapability,
  RuntimeTask,
} from "@/components/deploy-model/ModelSearchPanel";
import {
  mapInstance,
  ComputeInstance,
} from "@/components/create/instance-utils";

interface DeployModelData {
  name: string;
  modality: string;
  runtime: string;
  replicas: number;
  provider: string;
  provider_connection_id: string;
  model: string;
  /** Hidden container image override from the curated catalog (falls back to runtime default). */
  image: string;
  instance: ComputeInstance | null;
  hf_token: string;
  strategy: string;
  timeout_minutes: number;
  api_key: string;
  volume_size_gb: number;
  provider_config: Record<string, string>;
  advanced_config: Record<string, string>;
}

function applyDetectedParsers(
  config: Record<string, string>,
  modality: string,
  modelDetails: ModelDetails | null,
  schema: ConfigOption[],
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
    tool_parser:
      metadata.tool_parser ?? modelDetails.recommended_tool_parser ?? "",
    reasoning_parser:
      metadata.reasoning_parser ??
      modelDetails.recommended_reasoning_parser ??
      "",
  };
  const nextConfig = { ...config };
  for (const key of ["tool_parser", "reasoning_parser"] as const) {
    const option = schema.find((opt) => opt.key === key);
    const value = detected[key];
    if (!option?.options?.includes(value)) continue;
    const current = nextConfig[key];
    if (!current || current === option.default) {
      nextConfig[key] = value;
    }
  }
  return nextConfig;
}

/** Bytes per param guessed from quantization hints in the model id. */
function bytesPerParamFromId(modelId: string): number {
  const idL = modelId.toLowerCase();
  if (
    idL.includes("fp8") ||
    idL.includes("int8") ||
    idL.includes("8bit") ||
    idL.includes("q8")
  )
    return 1;
  else if (
    idL.includes("awq") ||
    idL.includes("gptq") ||
    idL.includes("int4") ||
    idL.includes("4bit") ||
    idL.includes("q4")
  )
    return 0.5;
  else if (idL.includes("fp32")) return 4;
  return 2;
}

/**
 * VRAM estimate for search results, where only the id + param count are
 * known (no full model details yet). Applies the same per-quantization
 * bytes/param as the full estimator so cards agree with the summary.
 */
function estimateSearchVram(modelId: string, paramsB: number): number {
  const overhead = paramsB > 50 ? 8 : paramsB > 20 ? 4 : 2;
  return paramsB * bytesPerParamFromId(modelId) + overhead;
}

function estimateVramNeeded(
  modelId: string,
  modelDetails?: ModelDetails | null,
): number {
  let paramsB = 0;
  let regexParams = 0;
  const match = modelId.match(/(\d+(?:\.\d+)?)b/i);
  if (match) regexParams = parseFloat(match[1]);

  if (modelDetails?.safetensors?.total) {
    paramsB = modelDetails.safetensors.total / 1e9;
    if (regexParams > 0 && paramsB < regexParams * 0.5) paramsB = regexParams;
  } else if (
    typeof modelDetails?.parameters === "number" &&
    modelDetails.parameters > 0
  ) {
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
    bytesPerParam = bytesPerParamFromId(modelId);
  }

  let overhead = paramsB > 50 ? 8 : paramsB > 20 ? 4 : 2;
  if (modelDetails?.quantization) overhead += 1;
  return paramsB * bytesPerParam + overhead;
}

export function useDeployModel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [isPreselected, setIsPreselected] = useState(false);

  const [data, setData] = useState<DeployModelData>({
    name: "",
    modality: "",
    runtime: "",
    replicas: 1,
    provider: "",
    provider_connection_id: "",
    model: "",
    image: "",
    instance: null,
    hf_token: "",
    strategy: "EXTEND",
    timeout_minutes: 60,
    api_key: "",
    volume_size_gb: 50,
    provider_config: {},
    advanced_config: {},
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ModelItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Generic capability facets (tools / thinking / vision). Sent to the
  // backend on search; each runtime filters on the ones it supports.
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [runtimes, setRuntimes] = useState<RuntimeCapability[]>([]);
  const [modalities, setModalities] = useState<RuntimeTask[]>([]);
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(true);
  const [instances, setInstances] = useState<ComputeInstance[]>([]);
  const [modelDetails, setModelDetails] = useState<ModelDetails | null>(null);
  const [advancedSchema, setAdvancedSchema] = useState<ConfigOption[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  // Load runtime & modality capabilities from the backend registry (single source of truth)
  // If the page was opened from the curated catalog (?model=&runtime=&task=&image=),
  // preselect everything and jump straight to step 2 (Select Compute).
  useEffect(() => {
    const preselectedModel = searchParams.get("model") || "";
    const preselectedRuntime = searchParams.get("runtime") || "";
    const preselectedTask =
      searchParams.get("task") || searchParams.get("modality") || "";
    const preselectedImage = searchParams.get("image") || "";
    const fromCatalog =
      searchParams.get("from") === "catalog" || !!preselectedModel;

    fetch("/api/v1/runtimes")
      .then((r) => r.json())
      .then((json) => {
        const caps: RuntimeCapability[] = Array.isArray(json.runtimes)
          ? json.runtimes
          : [];
        const tasks: RuntimeTask[] = Array.isArray(json.tasks)
          ? json.tasks
          : [];
        setRuntimes(caps);
        setModalities(tasks);
        setData((d) => {
          if (fromCatalog && preselectedModel) {
            const modality = tasks.some((t) => t.id === preselectedTask)
              ? preselectedTask
              : tasks.some((t) => t.id === d.modality)
                ? d.modality
                : (tasks[0]?.id ?? "");
            const runtimeIds = caps
              .filter((c) => c.tasks.some((t) => t.id === modality))
              .map((c) => c.id);
            const runtime = preselectedRuntime && runtimeIds.includes(preselectedRuntime)
              ? preselectedRuntime
              : runtimeIds.includes(d.runtime)
                ? d.runtime
                : (runtimeIds[0] ?? "");
            return {
              ...d,
              model: preselectedModel,
              modality,
              runtime,
              image: preselectedImage,
              advanced_config: {
                ...d.advanced_config,
                ...(preselectedImage ? { image: preselectedImage } : {}),
              },
            };
          }
          const modality = tasks.some((t) => t.id === d.modality)
            ? d.modality
            : (tasks[0]?.id ?? "");
          const runtimeIds = caps
            .filter((c) => c.tasks.some((t) => t.id === modality))
            .map((c) => c.id);
          const runtime = runtimeIds.includes(d.runtime)
            ? d.runtime
            : (runtimeIds[0] ?? "");
          return { ...d, modality, runtime };
        });
        if (fromCatalog && preselectedModel) {
          setIsPreselected(true);
          setStep(2);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingCapabilities(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load runtime schema
  useEffect(() => {
    if (!data.runtime || !data.modality) return;
    fetch(
      `/api/v1/runtimes/schema?runtime=${data.runtime}&task=${encodeURIComponent(data.modality)}`,
    )
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
      `/api/v1/models/details?runtime=${data.runtime}&task=${encodeURIComponent(data.modality)}&model=${encodeURIComponent(data.model)}`,
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
        advancedSchema,
      ),
    [data.advanced_config, data.modality, modelDetails, advancedSchema],
  );

  const handleSearch = async () => {
    if (!searchQuery || !data.runtime || !data.modality) return;
    setIsSearching(true);
    try {
      const caps =
        capabilities.length > 0
          ? `&capabilities=${encodeURIComponent(capabilities.join(","))}`
          : "";
      const res = await fetch(
        `/api/v1/models/search?runtime=${data.runtime}&task=${encodeURIComponent(data.modality)}&q=${encodeURIComponent(searchQuery)}${caps}`,
      );
      const json = await res.json();
      if (json.results) {
        setSearchResults(
          (json.results as ModelSearchApiResult[]).map((r) => {
            const params =
              typeof r.Parameters === "number" && r.Parameters > 0
                ? r.Parameters
                : undefined;
            return {
              id: r.ID,
              name: r.ID.split("/").pop() || r.ID,
              org: r.Author || r.ID.split("/")[0] || "model",
              downloads: r.Downloads,
              likes: r.Likes,
              parameters: params,
              vram: params
                ? `~${Math.ceil(estimateSearchVram(r.ID, params))} GB`
                : undefined,
              tags: Array.isArray(r.Tags) ? r.Tags : [],
              pipelineTag: r.PipelineTag,
            };
          }),
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
    setCapabilities([]);
    setData((d) => {      const runtimeIds = runtimes
        .filter((c) => c.tasks.some((t) => t.id === val))
        .map((c) => c.id);
      const runtime = runtimeIds.includes(d.runtime)
        ? d.runtime
        : (runtimeIds[0] ?? "");
      // Drop any catalog image override: it belongs to the previous
      // runtime's default and must never leak into another runtime.
      return { ...d, modality: val, runtime, model: "", image: "", advanced_config: {} };
    });
  };

  const handleRuntimeChange = (val: string) => {
    setSearchResults([]);
    setModelDetails(null);
    setCapabilities([]);
    setData((d) => ({ ...d, runtime: val, model: "", image: "", advanced_config: {} }));
  };

  // Selecting a (different) model drops the catalog image override, so a
  // stale ollama/vLLM default can never leak into the deploy payload.
  const handleSelectModel = (id: string) => {
    setModelDetails(null);
    setData((d) => (d.model === id ? d : { ...d, model: id, image: "" }));
  };

  const toggleCapability = (id: string) => {
    setCapabilities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
    setSearchResults([]);
    setModelDetails(null);
    setData((d) => ({ ...d, model: "" }));
  };

  const handleDeploy = async () => {
    if (!data.name || !data.model || !data.instance || !data.provider_connection_id) return;
    setIsDeploying(true);
    try {
      const res = await fetch("/api/v1/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          provider_id: data.provider,
          provider_connection_id: data.provider_connection_id,
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
            ...(data.image ? { image: data.image } : {}),
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

  const requiredVram = data.model
    ? estimateVramNeeded(data.model, modelDetails)
    : 16;
  const taskLabel = modalities.find((t) => t.id === data.modality)?.name;

  const canNext =
    step === 1
      ? !!data.model && (!modelDetails?.gated || !!data.hf_token)
      : step === 2
        ? !!data.instance && !!data.provider_connection_id
        : step === 3
          ? !!data.name && !!data.model && !!data.instance
          : false;

  const nextStep = () => setStep((s) => Math.min(3, s + 1));

  const updateData = (updates: Partial<DeployModelData>) => {
    setData((d) => ({ ...d, ...updates }));
  };

  return {
    router,
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
    capabilities,
    toggleCapability,
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
    handleSelectModel,
    handleDeploy,
    requiredVram,
    taskLabel,
    canNext,
    nextStep,
  };
}
