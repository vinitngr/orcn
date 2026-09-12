"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MarketCard } from "@/components/create/MarketCard";
import { DeploymentSummary } from "@/components/create/DeploymentSummary";
import { AdvancedConfiguration } from "@/components/create/AdvancedConfiguration";
import { mapMarket } from "@/components/create/market-utils";

import { Logo } from "@/components/ui/Logos";
import { Select } from "@/components/ui/Select";
import { useRouter } from "next/navigation";
import { Download, Heart, HardDrive, Cpu, Calendar, Lock, Box, Info, Layers } from 'lucide-react';

function estimateVramNeeded(modelId: string, modelDetails?: any) {
  // 1. Get TOTAL parameters (in billions)
  let paramsB = 0;
  let regexParams = 0;
  const match = modelId.match(/(\d+(?:\.\d+)?)b/i);
  if (match) regexParams = parseFloat(match[1]);

  if (modelDetails?.safetensors?.total) {
    paramsB = modelDetails.safetensors.total / 1000000000;
    // HF API often miscalculates packed INT32 quantizations. If the name says 30B but HF says 6B, trust the name.
    if (regexParams > 0 && paramsB < (regexParams * 0.5)) {
       paramsB = regexParams;
    }
  } else {
    if (regexParams > 0) paramsB = regexParams;
    else paramsB = 7;
  }

  // 2. Determine bytes per parameter (default FP16 = 2)
  let bytesPerParam = 2; 
  
  // Priority 1: Quantization Config
  const quantConfig = modelDetails?.config?.quantization_config;
  if (quantConfig) {
    let bits = quantConfig.bits || quantConfig.weight_bits;
    // Check nested structures like modelopt FP8
    if (!bits && quantConfig.config_groups?.group_0?.weights?.num_bits) {
      bits = quantConfig.config_groups.group_0.weights.num_bits;
    }
    
    if (bits === 4) bytesPerParam = 0.5;
    else if (bits === 8) bytesPerParam = 1;
    else if (quantConfig.quant_method === 'awq' || quantConfig.quant_method === 'gptq' || quantConfig.quant_method === 'exl2') {
       if (modelId.toLowerCase().includes('8bit') || modelId.toLowerCase().includes('w8')) bytesPerParam = 1;
       else bytesPerParam = 0.5;
    }
  } 
  // Priority 2: torch_dtype
  else if (modelDetails?.config?.torch_dtype) {
    const dtype = modelDetails.config.torch_dtype.toLowerCase();
    if (dtype.includes('int8') || dtype.includes('fp8')) bytesPerParam = 1;
    else if (dtype.includes('float32')) bytesPerParam = 4;
    else if (dtype.includes('float16') || dtype.includes('bfloat16')) bytesPerParam = 2;
  }
  // Priority 3: Ollama Quantization (GGUF)
  else if (modelDetails?.quantization) {
    const q = modelDetails.quantization.toLowerCase();
    if (q.includes('fp16')) bytesPerParam = 2;
    else if (q.includes('q8')) bytesPerParam = 1;
    else if (q.includes('q6')) bytesPerParam = 0.75;
    else if (q.includes('q5')) bytesPerParam = 0.625;
    else if (q.includes('q4')) bytesPerParam = 0.5;
    else if (q.includes('q3')) bytesPerParam = 0.375;
    else if (q.includes('q2')) bytesPerParam = 0.25;
  }
  // Priority 4: Name Parsing fallback
  else {
    const idLower = modelId.toLowerCase();
    if (idLower.includes('fp8') || idLower.includes('int8') || idLower.includes('8bit') || idLower.includes('w8') || idLower.includes('q8')) {
      bytesPerParam = 1;
    } else if (idLower.includes('q6')) {
      bytesPerParam = 0.75;
    } else if (idLower.includes('q5')) {
      bytesPerParam = 0.625;
    } else if (idLower.includes('awq') || idLower.includes('gptq') || idLower.includes('int4') || idLower.includes('4bit') || idLower.includes('nf4') || idLower.includes('q4')) {
      bytesPerParam = 0.5;
    } else if (idLower.includes('q3')) {
      bytesPerParam = 0.375;
    } else if (idLower.includes('q2')) {
      bytesPerParam = 0.25;
    } else if (idLower.includes('fp32')) {
      bytesPerParam = 4;
    }
  }

  // 3. Formula: (params * bytesPerParam) + overhead (KV cache, context, etc)
  let overhead = 2; // Default for context window / KV Cache
  if (paramsB > 50) overhead = 8;
  else if (paramsB > 20) overhead = 4;
  
  // GGUF/Ollama models have a slight packing overhead compared to raw safetensors
  if (modelDetails?.quantization) {
    overhead += 1;
  }

  return (paramsB * bytesPerParam) + overhead;
}

export default function CreateDeploymentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name: "",
    modality: "text-generation",
    runtime: "vllm",
    timeout_minutes: 60,
    replicas: 1,
    strategy: "EXTEND",
    model: "",
    provider: "nosana",
    market: null as any,
    hf_token: "",
    advanced_config: {} as Record<string, string>,
    resources: [] as { type: string, url: string, target: string }[]
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([
    { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 (8B)', org: 'meta', downloads: 12500000 },
    { id: 'Qwen/Qwen2.5-Coder-7B-Instruct', name: 'Qwen 2.5 Coder (7B)', org: 'qwen', downloads: 8520000 },
    { id: 'deepseek-ai/deepseek-coder-33b-instruct', name: 'DeepSeek Coder (33B)', org: 'deepseek', downloads: 3500000 },
    { id: 'sarvamai/sarvam-105b', name: 'Sarvam (105B)', org: 'sarvamai', downloads: 120000 }
  ]);
  const [isSearching, setIsSearching] = useState(false);

  const [markets, setMarkets] = useState<any[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [modelDetails, setModelDetails] = useState<any>(null);

  const [advancedSchema, setAdvancedSchema] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/runtimes/schema?runtime=${data.runtime}&task=${encodeURIComponent(data.modality)}`)
      .then(res => res.json())
      .then(json => {
        if (json.schema) {
          setAdvancedSchema(json.schema);
          const defaults: Record<string, string> = {};
          json.schema.forEach((opt: any) => {
            defaults[opt.key] = opt.default;
          });
          setData(d => ({ ...d, advanced_config: defaults }));
        }
      })
      .catch(console.error);
  }, [data.runtime, data.modality]);

  useEffect(() => {
    if (data.model) {
      setModelDetails(null);
      fetch(`/api/v1/models/details?runtime=${data.runtime}&task=${encodeURIComponent(data.modality)}&model=${encodeURIComponent(data.model)}`)
        .then(res => res.json())
        .then(json => {
          if (json.details) {
            setModelDetails(json.details);
          }
        })
        .catch(console.error);
    }
  }, [data.model, data.runtime, data.modality]);

  // Apply detector output only after the schema is loaded. This avoids the
  // schema request overwriting the model detail request with its defaults.
  useEffect(() => {
    if ((data.modality !== 'text-generation' && data.modality !== 'multimodal') || !modelDetails || advancedSchema.length === 0) return;

    const metadata = modelDetails.metadata || {};
    const detected = {
      tool_parser: metadata.tool_parser ?? modelDetails.recommended_tool_parser ?? "",
      reasoning_parser: metadata.reasoning_parser ?? modelDetails.recommended_reasoning_parser ?? ""
    };
    const nextConfig = { ...data.advanced_config };

    for (const key of ["tool_parser", "reasoning_parser"]) {
      const option = advancedSchema.find(opt => opt.key === key);
      const value = detected[key as keyof typeof detected];
      nextConfig[key] = option?.options?.includes(value) ? value : "";
    }

    setData(d => ({ ...d, advanced_config: nextConfig }));
  }, [data.modality, modelDetails, advancedSchema]);

  useEffect(() => {
    if (step === 3) {
      fetch(`/api/v1/markets?provider=${data.provider}`)
        .then(res => res.json())
        .then(json => {
          if (json.markets && Array.isArray(json.markets)) {
            const mapped = json.markets.map(mapMarket);
            setMarkets(mapped);
          }
        })
        .catch(console.error);
    }
  }, [step, data.provider]);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/v1/models/search?runtime=${data.runtime}&task=${encodeURIComponent(data.modality)}&q=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      if (json.results) {
        const mapped = json.results.map((r: any) => ({
          id: r.ID,
          name: r.ID.split('/').pop(),
          org: r.Author,
          downloads: r.Downloads,
          tags: r.Tags,
          pipelineTag: r.PipelineTag
        }));
        setSearchResults(mapped);
      }
    } catch (e) {
      console.error(e);
    }
    setIsSearching(false);
  };

  const handleDeploy = async () => {
    if (!data.name || !data.model || !data.market) return;
    setIsDeploying(true);
    try {
      const res = await fetch('/api/v1/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          provider_id: data.provider,
          instance_type_id: data.market.id,
          instance_name: data.market.name,
          runtime_id: data.runtime,
          task: data.modality,
          model_id: data.model,
          replicas: data.replicas,
          hf_token: data.hf_token,
          advanced_config: data.advanced_config,
          resources: data.resources
        })
      });
      const json = await res.json();
      if (res.ok && json.deployment_id) {
        if (json.warning) {
          alert(json.warning);
        }
        router.push('/');
      } else {
        alert(json.error || "Failed to deploy");
      }
    } catch (e) {
      console.error(e);
      alert("Error deploying");
    }
    setIsDeploying(false);
  };

  const InputStyle = {
    width: '100%', padding: '0.75rem 1rem', 
    borderRadius: '0', 
    border: '1px solid var(--border)',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-color)',
    outline: 'none',
    color: 'var(--text-main)',
    fontFamily: 'inherit'
  };

  const nextStep = () => setStep(s => Math.min(3, s + 1));
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const WizardNavigation = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button 
        onClick={prevStep} 
        disabled={step === 1}
        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', backgroundColor: step === 1 ? 'var(--bg-color)' : 'var(--surface)', color: step === 1 ? 'var(--text-muted)' : 'var(--text-main)', cursor: step === 1 ? 'not-allowed' : 'pointer', borderRadius: '0' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
      </button>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, padding: '0 0.5rem' }}>Step {step} of 3</span>
      <button 
        onClick={nextStep} 
        disabled={step === 3}
        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', backgroundColor: step === 3 ? 'var(--bg-color)' : 'var(--surface)', color: step === 3 ? 'var(--text-muted)' : 'var(--text-main)', cursor: step === 3 ? 'not-allowed' : 'pointer', borderRadius: '0' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      </button>
    </div>
  );

  const requiredVram = data.model ? estimateVramNeeded(data.model, modelDetails) : 0;

  return (
    <div>
      <PageHeader 
        title="Deploy AI Model" 
        description="Launch an LLM endpoint instantly via the network."
      />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
        
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '2rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 500, letterSpacing: '-0.025em' }}>
              {step === 1 && "1. Basic Configuration"}
              {step === 2 && "2. Select Modality & Model"}
              {step === 3 && "3. Select Compute Instance"}
            </h2>
            <WizardNavigation />
          </div>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Deployment Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. prod-llama-inference"
                  value={data.name}
                  onChange={e => setData({...data, name: e.target.value.replace(/\//g, '')})}
                  style={InputStyle} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Replicas</label>
                  <input type="number" value={data.replicas || ''} onChange={e => setData({...data, replicas: e.target.value ? parseInt(e.target.value) : 0})} style={InputStyle} />
                </div>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <Button size="sm" variant="primary" style={{ borderRadius: '0' }} onClick={nextStep} disabled={!data.name}>Continue to Model Selection</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', zIndex: 10 }}>
                <div style={{ zIndex: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Modality</label>
                  <Select 
                    value={data.modality} 
                    onChange={(val: string) => { setSearchResults([]); setData({...data, modality: val, runtime: 'vllm', model: '', advanced_config: {}}); }}
                    options={[
                      { value: "text-generation", label: "Text Generation (LLMs)" },
                      { value: "multimodal", label: "Multimodal (Vision/Audio)" },
                      { value: "embedding", label: "Text Embeddings" },
                      { value: "score", label: "Scoring / Rerankers" }
                    ]}
                  />
                </div>

                <div style={{ zIndex: 10 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Runtime</label>
                  <Select 
                    value={data.runtime} 
                    onChange={(val: string) => setData({...data, runtime: val})} 
                    options={(() => {
                      switch (data.modality) {
                        case 'text-generation':
                        case 'multimodal':
                          return [
                            { value: "vllm", label: "vLLM Inference Server" },
                            { value: "ollama", label: "Ollama" }
                          ];
                        case 'embedding':
                        case 'score':
                          return [
                            { value: "vllm", label: "vLLM Inference Server" }
                          ];
                        default:
                          return [];
                      }
                    })()}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Search Hub</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input 
                    type="text" 
                    placeholder="Search for models (e.g. meta-llama/Llama-3.1-8B-Instruct)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    style={InputStyle} 
                  />
                  <Button variant="secondary" style={{ borderRadius: '0' }} onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Models</label>
                <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    {searchResults.map(m => (
                      <div 
                        key={m.id}
                        onClick={() => setData({...data, model: m.id})}
                        style={{ 
                          border: '1px solid var(--border)', 
                          padding: '1rem', 
                          cursor: 'pointer',
                          backgroundColor: data.model === m.id ? 'var(--surface-hover)' : 'var(--bg-color)',
                          boxShadow: data.model === m.id ? 'inset 0 0 0 1px var(--text-main)' : 'none',
                          display: 'flex', alignItems: 'center', gap: '1rem',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ width: '32px', height: '32px', backgroundColor: '#fff', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', flexShrink: 0 }}>
                          <Logo name={m.org} size={16} />
                        </div>
                        <div style={{ overflow: 'hidden', minWidth: 0, flex: 1, position: 'relative' }}>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', paddingRight: '4rem' }} title={m.name}>{m.name}</div>
                          {m.pipelineTag && (
                            <div style={{ position: 'absolute', top: 0, right: 0, fontSize: '0.65rem', backgroundColor: 'var(--surface)', padding: '0.1rem 0.4rem', border: '1px solid var(--border)', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                              {m.pipelineTag}
                            </div>
                          )}
                          {m.id !== m.name && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace', marginTop: '0.1rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={m.id}>{m.id}</div>
                          )}
                          {m.downloads > 0 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                              {Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(m.downloads)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {searchResults.length === 0 && !isSearching && (
                      <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', border: '1px dashed var(--border)' }}>
                        No models found. Try searching for a different model.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {data.model && (
                <div style={{ padding: '1.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', fontSize: '0.875rem' }}>
                  {modelDetails ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '48px', backgroundColor: '#fff', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', flexShrink: 0, fontSize: '1.5rem' }}>
                          <Logo name={modelDetails.author || data.model.split('/')[0]} size={24} />
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, fontSize: '1.125rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{data.model.split('/').pop()}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>by {modelDetails.author || data.model.split('/')[0]}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Cpu size={14} /> Params</div>
                          <div style={{ fontWeight: 500 }}>
                            {modelDetails.safetensors?.total 
                              ? `${(modelDetails.safetensors.total / 1000000000).toFixed(1)}B` 
                              : modelDetails.parameters 
                                ? `${modelDetails.parameters}B` 
                                : 'Unknown'}
                          </div>
                        </div>
                        {modelDetails.downloads !== undefined && (
                          <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Download size={14} /> Pulls</div>
                            <div style={{ fontWeight: 500 }}>{Intl.NumberFormat('en-US', { notation: "compact" }).format(modelDetails.downloads || 0)}</div>
                          </div>
                        )}
                        {modelDetails.likes !== undefined && (
                          <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Heart size={14} /> Likes</div>
                            <div style={{ fontWeight: 500 }}>{Intl.NumberFormat('en-US', { notation: "compact" }).format(modelDetails.likes || 0)}</div>
                          </div>
                        )}
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><HardDrive size={14} /> VRAM</div>
                          <div style={{ fontWeight: 500 }}>~{Math.ceil(requiredVram)} GB</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                        {(modelDetails.config?.architectures || modelDetails.family) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', rowGap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', width: '130px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Box size={14} /> Architecture:</span>
                            <span style={{ fontWeight: 500 }}>
                              {modelDetails.config?.architectures ? modelDetails.config.architectures.join(', ') : modelDetails.family}
                            </span>
                          </div>
                        )}
                        {(modelDetails.config?.model_type || modelDetails.quantization) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', rowGap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', width: '130px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Info size={14} /> Model Type:</span>
                            <span style={{ fontWeight: 500 }}>
                              {modelDetails.config?.model_type || modelDetails.quantization}
                            </span>
                          </div>
                        )}
                        {modelDetails.lastModified && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', rowGap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', width: '130px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} /> Updated:</span>
                            <span style={{ fontWeight: 500 }}>
                              {new Date(modelDetails.lastModified).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {modelDetails.safetensors?.parameters && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', rowGap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', width: '130px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Layers size={14} /> dtype:</span>
                            <span style={{ fontWeight: 500 }}>
                              {Object.entries(modelDetails.safetensors.parameters).map(([dtype, count]) => {
                                const c = count as number;
                                const formattedCount = c >= 1000000000 ? `${(c / 1000000000).toFixed(1)}B` : c >= 1000000 ? `${(c / 1000000).toFixed(1)}M` : c;
                                return `${dtype} (${formattedCount})`;
                              }).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {modelDetails.metadata && Object.keys(modelDetails.metadata).some((key: string) => key !== 'tool_parser' && key !== 'reasoning_parser') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                          {Object.entries(modelDetails.metadata)
                            .filter(([key]) => key !== 'tool_parser' && key !== 'reasoning_parser')
                            .map(([key, value]) => (
                              <div key={key} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', rowGap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-muted)', width: '180px', flexShrink: 0, whiteSpace: 'nowrap' }}>{key}:</span>
                                <span style={{ fontWeight: 500 }}>
                                  {Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {modelDetails.pipeline_tag && (
                          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--text-main)', border: '1px solid var(--text-main)', fontSize: '0.75rem', color: 'var(--bg-color)', fontWeight: 500 }}>
                            {modelDetails.pipeline_tag}
                          </span>
                        )}
                        {modelDetails.library_name && (
                          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                            {modelDetails.library_name}
                          </span>
                        )}
                        {modelDetails.tags && modelDetails.tags.filter((t: string) => t !== modelDetails.pipeline_tag && t !== modelDetails.library_name).slice(0, 10).map((t: string) => (
                          <span key={t} style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-color)', border: '1px dashed var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {t}
                          </span>
                        ))}
                        {modelDetails.private && (
                          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                            Private
                          </span>
                        )}
                        {modelDetails.disabled && (
                          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', fontSize: '0.75rem', color: '#991b1b' }}>
                            Disabled
                          </span>
                        )}
                      </div>

                      {modelDetails.gated && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#b45309', fontWeight: 500, marginBottom: '0.5rem' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            Gated Model (Requires Hugging Face Token)
                          </label>
                          <input 
                            type="password" 
                            placeholder="hf_..."
                            value={data.hf_token}
                            onChange={e => setData({...data, hf_token: e.target.value})}
                            style={InputStyle} 
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      Loading rich model details...
                    </div>
                  )}
                </div>
              )}

              {data.model && (
                <AdvancedConfiguration 
                  schema={advancedSchema}
                  data={data.advanced_config}
                  onChange={(key, value) => setData(d => ({ ...d, advanced_config: { ...d.advanced_config, [key]: value } }))}
                  show={showAdvanced}
                  onToggle={() => setShowAdvanced(!showAdvanced)}
                />
              )}

              <div style={{ marginTop: '1rem' }}>
                <Button 
                  size="sm"
                  variant="primary" 
                  style={{ borderRadius: '0' }} 
                  onClick={nextStep} 
                  disabled={!data.model || (modelDetails?.gated && !data.hf_token)}
                >
                  Continue to Compute Selection
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <div 
                  onClick={() => setData({...data, provider: 'nosana'})}
                  style={{ fontWeight: 500, fontSize: '0.875rem', color: data.provider === 'nosana' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', borderBottom: data.provider === 'nosana' ? '2px solid var(--text-main)' : 'none', paddingBottom: '0.75rem', marginBottom: '-0.75rem' }}
                >
                  Nosana Network
                </div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600 }}>Model Requirement:</span> Estimated ~{Math.ceil(requiredVram)}GB VRAM needed for <span style={{ fontFamily: 'monospace' }}>{data.model.split('/').pop()}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {markets.map(m => {
                  const hasEnoughVram = m.vram_gb === undefined ? true : m.vram_gb >= requiredVram;
                  const isEligible = hasEnoughVram;
                  
                  let warning = "";
                  if (!hasEnoughVram) {
                    warning = "VRAM too low to run model safely.";
                  }

                  return (
                    <MarketCard 
                      key={m.id} 
                      {...m} 
                      selected={data.market?.id === m.id}
                      disabled={!isEligible}
                      warning={warning}
                      onClick={() => isEligible && setData({...data, market: m})}
                    />
                  );
                })}
                {markets.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Loading markets...
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Ineligible instances are grayed out. Ensure you select an instance with sufficient VRAM.
              </div>
            </div>
          )}
          
        </div>

        <DeploymentSummary data={data} onDeploy={handleDeploy} isDeploying={isDeploying} />
      </div>
    </div>
  );
}
