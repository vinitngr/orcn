"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MarketCard } from "@/components/create/MarketCard";

import { NodeVolumesConfig } from "@/components/templates/NodeVolumesConfig";
import { ContainersConfig } from "@/components/templates/ContainersConfig";
import { DiDocker } from "react-icons/di";
import { FaDocker } from "react-icons/fa6";

export default function CreateDeploymentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateTab, setTemplateTab] = useState('my-templates');
  
  const [formData, setFormData] = useState<any>({
    workloadName: "",
    replicas: 1,
    templateId: "",
    provider: "nosana",
    market: null as any,
    volumes: [],
    containers: []
  });

  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    let urlTemplateId = "";
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      urlTemplateId = params.get('template') || "";
      if (urlTemplateId) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    fetch('/api/v1/templates')
      .then(res => res.json())
      .then(json => {
        if (Array.isArray(json)) {
          setTemplates(json);
          if (urlTemplateId) {
            const t = json.find(x => x.id === urlTemplateId);
            if (t) {
              let parsed: any = {};
              try { parsed = JSON.parse(t.data); } catch(e) {}
              setFormData((prev: any) => ({
                ...prev,
                templateId: urlTemplateId,
                volumes: (parsed.volumes || []).map((v: any) => ({
                  name: v.name,
                  type: v.type || "persistent",
                  size: v.size_gb?.toString() || "10",
                  hostPath: v.host_path || ""
                })),
                containers: (parsed.containers || []).map((c: any) => {
                  const args = c.args || {};
                  return {
                    id: c.id || "",
                    image: args.image || "",
                    gpu: args.gpu || false,
                    cmd: (args.cmd || []).join(" "),
                    entrypoint: (args.entrypoint || []).join(" "),
                    envVars: Object.entries(args.env || {}).map(([key, value]) => ({ key, value })),
                    ports: (args.expose || []).map((p: any) => p?.port ? p.port.toString() : ""),
                    mounts: (args.volume_mounts || []).map((m: any) => ({
                      volumeName: m.volume_name || "",
                      mountPath: m.mount_path || ""
                    })),
                    resources: (args.resources || []).map((r: any) => ({
                      type: r.type || "HF",
                      url: r.url || "",
                      target: r.target || ""
                    }))
                  };
                })
              }));
            } else {
              setFormData((prev: any) => ({ ...prev, templateId: urlTemplateId }));
            }
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`/api/v1/markets?provider=${formData.provider}`)
      .then(res => res.json())
      .then(json => {
        if (json.markets && Array.isArray(json.markets)) {
          const mapped = json.markets.map((m: any) => ({
            id: m.address,
            name: m.name,
            tag: m.tag || m.type,
            price: (m.usd_reward_per_hour || 0).toFixed(3),
            available: (m.nodes && m.nodes.length > 0) ? m.nodes.length : 0,
            vram_gb: 24 // Placeholder for deployment UI unless we compute it
          }));
          setMarkets(mapped);
        }
      })
      .catch(console.error);
  }, [formData.provider]);

  const handleTemplateSelect = (id: string) => {
    if (!id) {
      setFormData({
        ...formData,
        templateId: "",
        volumes: [],
        containers: []
      });
      return;
    }

    const t = templates.find(x => x.id === id);
    if (!t) return;
    
    let parsed: any = {};
    try {
      parsed = JSON.parse(t.data);
    } catch(e) {}

    setFormData({
      ...formData,
      templateId: id,
      volumes: (parsed.volumes || []).map((v: any) => ({
        name: v.name,
        type: v.type || "persistent",
        size: v.size_gb?.toString() || "10",
        hostPath: v.host_path || ""
      })),
      containers: (parsed.containers || []).map((c: any) => {
        const args = c.args || {};
        return {
          id: c.id || "",
          image: args.image || "",
          gpu: args.gpu || false,
          cmd: (args.cmd || []).join(" "),
          entrypoint: (args.entrypoint || []).join(" "),
          envVars: Object.entries(args.env || {}).map(([key, value]) => ({ key, value })),
          ports: (args.expose || []).map((p: any) => p?.port ? p.port.toString() : ""),
          mounts: (args.volume_mounts || []).map((m: any) => ({
            volumeName: m.volume_name || "",
            mountPath: m.mount_path || ""
          })),
          resources: (args.resources || []).map((r: any) => ({
            type: r.type || "HF",
            url: r.url || "",
            target: r.target || ""
          }))
        };
      })
    });
  };

  const updateData = (newData: any) => {
    setFormData({ ...formData, ...newData });
  };

  const handleDeploy = async () => {
    if (!formData.workloadName || !formData.templateId || !formData.market) return;
    setIsDeploying(true);
    
    const parseCommand = (str: string) => {
      if (!str) return [];
      const matches = str.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
      return matches.map(s => {
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
          return s.slice(1, -1);
        }
        return s;
      });
    };

    const originalTemplate = templates.find(t => t.id === formData.templateId);
    let originalData: any = {};
    try {
      if (originalTemplate) originalData = JSON.parse(originalTemplate.data);
    } catch(e) {}

    const storageVolumes = (formData.volumes || []).map((s: any) => ({
      name: s.name,
      type: s.type || "persistent",
      size_gb: parseInt(s.size) || 10,
      ...(s.type === 'bind' && s.hostPath ? { host_path: s.hostPath } : {})
    }));

    const finalSpec: any = {
      name: formData.workloadName,
      computeType: originalData.computeType || "CPU",
      version: "v2",
      type: "container",
      meta: originalData.meta || { trigger: "dashboard" },
      ...(storageVolumes.length > 0 ? { volumes: storageVolumes } : {}),
      containers: (formData.containers || []).map((c: any) => {
        const entrypoint = parseCommand((c.entrypoint || "").trim());
        
        let cmd: string[] = [];
        const rawCmd = (c.cmd || "").trim();
        if (rawCmd) {
          if (entrypoint.includes("-c")) {
            cmd = [rawCmd];
          } else {
            cmd = parseCommand(rawCmd);
          }
        }

        const env = (c.envVars || []).reduce((acc: any, env: any) => {
          if (env.key) acc[env.key] = env.value;
          return acc;
        }, {});

        const mounts = (c.mounts || []).filter((m: any) => m.volumeName && m.mountPath).map((m: any) => ({
          volume_name: m.volumeName,
          mount_path: m.mountPath
        }));

        const expose = (c.ports || []).filter((p: any) => parseInt(p)).map((p: any) => ({
          port: parseInt(p),
          protocol: "tcp",
          is_public: true
        }));

        const resources = (c.resources || []).filter((r: any) => r.url && r.target).map((r: any) => ({
          type: r.type,
          url: r.url,
          target: r.target
        }));

        const args: any = {
          image: c.image || "ubuntu:latest",
          gpu: c.gpu,
        };

        if (cmd.length > 0) args.cmd = cmd;
        if (entrypoint.length > 0) args.entrypoint = entrypoint;
        if (Object.keys(env).length > 0) args.env = env;
        if (mounts.length > 0) args.volume_mounts = mounts;
        if (expose.length > 0) args.expose = expose;
        if (resources.length > 0) args.resources = resources;

        return {
          id: c.id || "master",
          args
        };
      })
    };

    try {
      const payload = {
        name: formData.workloadName,
        template_id: formData.templateId,
        provider_id: formData.provider,
        instance_type_id: formData.market.id,
        instance_name: formData.market.name,
        replicas: formData.replicas,
        spec: finalSpec
      };

      const res = await fetch('/api/v1/workloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        if (data.warning) alert(data.warning);
        router.push('/');
      } else {
        alert(data.error || "Failed to deploy workload");
        if (data.details) console.error("Validation Errors:", data.details);
      }
    } catch (e) {
      console.error(e);
      alert("Network error while deploying");
    } finally {
      setIsDeploying(false);
    }
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => router.push("/")} 
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)' }}>Create Deployment</h1>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
        
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '2rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 500, letterSpacing: '-0.025em' }}>
              {step === 1 && "1. Workload & Compute"}
              {step === 2 && "2. Storage Volumes"}
              {step === 3 && "3. Containers"}
            </h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', backgroundColor: step === 1 ? 'var(--bg-color)' : 'var(--surface)', color: step === 1 ? 'var(--text-muted)' : 'var(--text-main)', cursor: step === 1 ? 'not-allowed' : 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              </button>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, padding: '0 0.5rem' }}>Step {step} of 3</span>
              <button onClick={() => setStep(Math.min(3, step + 1))} disabled={step === 3} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', backgroundColor: step === 3 ? 'var(--bg-color)' : 'var(--surface)', color: step === 3 ? 'var(--text-muted)' : 'var(--text-main)', cursor: step === 3 ? 'not-allowed' : 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
            </div>
          </div>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Workload Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. prod-backend-api"
                    value={formData.workloadName}
                    onChange={e => setFormData({...formData, workloadName: e.target.value})}
                    style={InputStyle} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Replicas</label>
                  <input type="number" value={formData.replicas} onChange={e => setFormData({...formData, replicas: parseInt(e.target.value) || 1})} style={InputStyle} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Template</label>
                </div>
                
                {formData.templateId ? (() => {
                  const t = templates.find(x => x.id === formData.templateId);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)', padding: '0.75rem 1rem', backgroundColor: 'var(--surface)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <FaDocker size={40}/>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-main)' }}>{t?.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t?.compute_type || "CPU"} Compute</div>
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setIsTemplateModalOpen(true)}>Change</Button>
                    </div>
                  );
                })() : (
                  <div 
                    onClick={() => setIsTemplateModalOpen(true)}
                    style={{ border: '1px dashed var(--border)', padding: '2rem', textAlign: 'center', cursor: 'pointer', backgroundColor: 'var(--surface)', color: 'var(--text-muted)', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-main)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 0.5rem auto' }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                    <div style={{ fontWeight: 500 }}>Select a Template</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Choose from Hub or Your Templates</div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                  <div 
                    onClick={() => setFormData({...formData, provider: 'nosana'})}
                    style={{ fontWeight: 500, fontSize: '0.875rem', color: formData.provider === 'nosana' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', borderBottom: formData.provider === 'nosana' ? '2px solid var(--text-main)' : 'none', paddingBottom: '0.75rem', marginBottom: '-0.75rem' }}
                  >
                    Nosana Network
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  {markets.map(m => (
                    <MarketCard 
                      key={m.id} 
                      {...m} 
                      selected={formData.market?.id === m.id}
                      onClick={() => setFormData({...formData, market: m})}
                    />
                  ))}
                  {markets.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Loading markets...
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <Button size="sm" variant="primary" style={{ borderRadius: '0' }} onClick={() => setStep(2)} disabled={!formData.workloadName || !formData.templateId || !formData.market}>
                  Continue to Containers
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <NodeVolumesConfig data={formData} updateData={updateData} />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <Button size="sm" variant="secondary" onClick={() => setStep(1)}>Back</Button>
                <Button size="sm" variant="primary" onClick={() => setStep(3)}>Continue to Containers</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <ContainersConfig data={formData} updateData={updateData} />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <Button size="sm" variant="secondary" onClick={() => setStep(2)}>Back</Button>
              </div>
            </div>
          )}
          
        </div>

        {/* Right Side Summary Panel */}
        <div style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)', border: '1px solid var(--text-main)', borderRadius: '0', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '0.75rem' }}>
              Deployment Summary
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Workload</span>
                <span style={{ fontWeight: 500 }}>{formData.workloadName || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Template</span>
                <span style={{ fontWeight: 500 }}>{templates.find(t => t.id === formData.templateId)?.name || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Replicas</span>
                <span style={{ fontWeight: 500 }}>{formData.replicas}</span>
              </div>
              
              <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0.5rem 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Provider</span>
                <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{formData.provider}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Instance</span>
                <span style={{ fontWeight: 500 }}>{formData.market?.name || '-'}</span>
              </div>
              
              <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0.5rem 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Volumes</span>
                <span style={{ fontWeight: 500 }}>{formData.volumes.length} Configured</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Containers</span>
                <span style={{ fontWeight: 500 }}>{formData.containers.length} Configured</span>
              </div>
            </div>

            <Button 
              size="sm" 
              style={{ 
                width: '100%', 
                marginTop: '2rem', 
                borderRadius: '0', 
                backgroundColor: 'var(--primary)',
                color: '#000',
                fontWeight: 600,
                border: 'none'
              }}
              disabled={!formData.workloadName || !formData.templateId || !formData.market || isDeploying}
              onClick={handleDeploy}
            >
              {isDeploying ? 'Deploying...' : 'Deploy Workload'}
            </Button>
          </div>
        </div>
      </div>
      
      {isTemplateModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-color)', width: '1200px', maxWidth: '95vw', height: '650px', maxHeight: '90vh',
            border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0.75rem 1.5rem', backgroundColor: 'var(--bg-color)', gap: '2rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, flex: 1, color: 'var(--text-main)' }}>Select a template</h2>
              
              <div style={{ flex: 2, display: 'flex', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '0.4rem 0.75rem', width: '100%', maxWidth: '400px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ marginRight: '0.5rem' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input type="text" placeholder="Search templates" style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-main)', fontSize: '0.8125rem', width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, justifyContent: 'flex-end' }}>
                <a href="/templates/create" style={{ 
                  textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600, color: 'var(--bg-color)', 
                  backgroundColor: 'var(--text-main)', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Create Template
                </a>
                <button onClick={() => setIsTemplateModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', display: 'flex' }}>✕</button>
              </div>
            </div>

            {/* Runpod Style Compact Tabs Row */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0.5rem 1.5rem', gap: '1.5rem', backgroundColor: 'var(--surface)' }}>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  onClick={() => setTemplateTab('my-templates')}
                  style={{ 
                    padding: '0.35rem 0.75rem', border: '1px solid transparent', background: templateTab === 'my-templates' ? 'var(--text-main)' : 'transparent',
                    color: templateTab === 'my-templates' ? 'var(--bg-color)' : 'var(--text-muted)', 
                    cursor: 'pointer', fontWeight: 500, fontSize: '0.75rem', borderRadius: '2px', transition: 'all 0.1s'
                  }}
                >
                  My templates
                </button>
                <button 
                  onClick={() => setTemplateTab('hub')}
                  style={{ 
                    padding: '0.35rem 0.75rem', border: '1px solid transparent', background: templateTab === 'hub' ? 'var(--text-main)' : 'transparent',
                    color: templateTab === 'hub' ? 'var(--bg-color)' : 'var(--text-muted)', 
                    cursor: 'pointer', fontWeight: 500, fontSize: '0.75rem', borderRadius: '2px', transition: 'all 0.1s'
                  }}
                >
                  Public
                </button>
              </div>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-color)' }}>
              {templateTab === 'hub' ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '6rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5, marginBottom: '1rem' }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                  <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Public Templates empty</h3>
                  <p style={{ fontSize: '0.875rem' }}>Curated templates will be available here soon.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                  {templates.map(t => {
                    let parsed: any = {};
                    try { parsed = JSON.parse(t.data); } catch(e) {}
                    const image = parsed.containers?.[0]?.args?.image || "N/A";
                    const containerCount = parsed.containers?.length || 1;
                    const createdAt = t.created_at ? new Date(t.created_at).toLocaleDateString() : "Just now";
                    
                    return (
                    <div 
                      key={t.id} 
                      onClick={() => { handleTemplateSelect(t.id); setIsTemplateModalOpen(false); }}
                      style={{
                        border: '1px solid var(--border)', padding: '1rem', cursor: 'pointer',
                        backgroundColor: 'var(--surface)', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', minHeight: '140px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--text-main)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <FaDocker size={40} />
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0.15rem 0.35rem', backgroundColor: 'var(--bg-color)' }}>
                          ID: {t.id.substring(0, 8)}
                        </div>
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{t.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {image}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                          {containerCount} Container{containerCount !== 1 ? 's' : ''}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {t.compute_type || "CPU"} • {createdAt}
                        </div>
                      </div>
                    </div>
                  )})}
                  {templates.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      You don't have any templates yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
