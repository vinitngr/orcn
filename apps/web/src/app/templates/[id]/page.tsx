"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

import { BasicConfig } from "@/components/templates/BasicConfig";
import { CompatibilityConfig } from "@/components/templates/CompatibilityConfig";
import { NodeVolumesConfig } from "@/components/templates/NodeVolumesConfig";
import { ContainersConfig } from "@/components/templates/ContainersConfig";
import { ReadmeConfig } from "@/components/templates/ReadmeConfig";
import { TemplateSummary } from "@/components/templates/TemplateSummary";

const STEPS = ["General Setup", "Node Requirements", "Node Storage Volumes", "Containers", "Documentation"];

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({ computeType: 'GPU', envVars: [] });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'wizard' | 'spec'>('wizard');
  const [rawSpec, setRawSpec] = useState<string>('');

  useEffect(() => {
    if (!params?.id) return;

    fetch(`http://localhost:8080/api/v1/templates/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        let nested: any = {};
        try {
          if (data.data) nested = JSON.parse(data.data);
        } catch (e) {}

        const meta = nested.meta || {};
        const sys = meta.system_requirements || {};
        const master = (nested.containers || [])[0] || { args: {} };
        const args = master.args || {};

        setFormData({
          id: data.id,
          name: data.name,
          computeType: data.computeType,
          
          readme: meta.description || "",
          minVram: sys.min_vram_gb || "",
          minCores: sys.min_cores || "",
          minRam: sys.min_ram_gb || "",
          cudaVersion: sys.cuda_version || "",
          arch: sys.arch || "any",
          gpuModel: sys.gpu_model || "",
          
          volumes: (nested.volumes || []).map((v: any) => ({
            name: v.name,
            type: v.type || "persistent",
            size: v.size_gb?.toString() || "",
            hostPath: v.host_path || ""
          })),

          containers: (nested.containers || []).map((c: any) => {
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
              }))
            };
          })
        });
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        router.push('/templates');
      });
  }, [params.id, router]);

  const updateData = (newData: any) => {
    setFormData({ ...formData, ...newData });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const generateSpec = (data: any) => {
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

    const storageVolumes = (data.volumes || []).map((s: any) => ({
      name: s.name,
      type: s.type || "persistent",
      size_gb: parseInt(s.size) || 10,
      ...(s.type === 'bind' && s.hostPath ? { host_path: s.hostPath } : {})
    }));

    const systemReqs: any = {};
    if (parseInt(data.minVram)) systemReqs.min_vram_gb = parseInt(data.minVram);
    if (parseInt(data.minCores)) systemReqs.min_cores = parseInt(data.minCores);
    if (parseInt(data.minRam)) systemReqs.min_ram_gb = parseInt(data.minRam);
    if (data.cudaVersion) systemReqs.cuda_version = data.cudaVersion;
    if (data.arch && data.arch !== "any") systemReqs.arch = data.arch;
    if (data.gpuModel) systemReqs.gpu_model = data.gpuModel;

    const meta: any = { trigger: "dashboard" };
    if (data.readme) meta.description = data.readme;
    if (Object.keys(systemReqs).length > 0) meta.system_requirements = systemReqs;

    return {
      name: data.name || "untitled-template",
      computeType: data.computeType || "CPU",
      version: "v2",
      type: "container",
      meta,
      ...(storageVolumes.length > 0 ? { volumes: storageVolumes } : {}),
      containers: (data.containers || []).map((c: any) => {
        const entrypoint = parseCommand((c.entrypoint || "").trim());
        
        let cmd = [];
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

        const args: any = {
          image: c.image || "ubuntu:latest",
          gpu: data.computeType === 'GPU',
        };

        if (cmd.length > 0) args.cmd = cmd;
        if (entrypoint.length > 0) args.entrypoint = entrypoint;
        if (Object.keys(env).length > 0) args.env = env;
        if (mounts.length > 0) args.volume_mounts = mounts;
        if (expose.length > 0) args.expose = expose;

        return {
          id: c.id || "master",
          args
        };
      })
    };
  };

  const handleSave = async () => {
    try {
      let spec;
      if (viewMode === 'spec') {
        try {
          spec = JSON.parse(rawSpec);
        } catch (e) {
          alert("Invalid JSON format in the Spec editor.");
          return;
        }
      } else {
        spec = generateSpec(formData);
      }

      const res = await fetch(`http://localhost:8080/api/v1/templates/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spec)
      });
      if (res.ok) {
        router.push("/templates");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading template...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => router.push("/templates")} 
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)' }}>Edit Template</h1>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
        
        <div>
          <div style={{ display: 'flex', gap: '0', marginBottom: '-1px', position: 'relative', zIndex: 1 }}>
            <button 
              onClick={() => setViewMode('wizard')}
              style={{ padding: '0.75rem 2rem', fontSize: '0.875rem', fontWeight: 500, background: viewMode === 'wizard' ? 'var(--surface)' : 'var(--bg-color)', color: viewMode === 'wizard' ? 'var(--text-main)' : 'var(--text-muted)', border: '1px solid var(--border)', borderBottom: viewMode === 'wizard' ? '1px solid transparent' : '1px solid var(--border)', cursor: 'pointer' }}
            >Builder</button>
            <button 
              onClick={() => { setRawSpec(JSON.stringify(generateSpec(formData), null, 2)); setViewMode('spec'); }}
              style={{ padding: '0.75rem 2rem', fontSize: '0.875rem', fontWeight: 500, background: viewMode === 'spec' ? 'var(--surface)' : 'var(--bg-color)', color: viewMode === 'spec' ? 'var(--text-main)' : 'var(--text-muted)', border: '1px solid var(--border)', borderLeft: 'none', borderBottom: viewMode === 'spec' ? '1px solid transparent' : '1px solid var(--border)', cursor: 'pointer' }}
            >JSON Spec</button>
          </div>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '2rem' }}>
          {viewMode === 'wizard' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 500, letterSpacing: '-0.025em' }}>
                  {currentStep + 1}. {STEPS[currentStep]}
                </h2>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button 
                    onClick={handleBack} 
                    disabled={currentStep === 0}
                    style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', backgroundColor: currentStep === 0 ? 'var(--bg-color)' : 'var(--surface)', color: currentStep === 0 ? 'var(--text-muted)' : 'var(--text-main)', cursor: currentStep === 0 ? 'not-allowed' : 'pointer', borderRadius: '0' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  </button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, padding: '0 0.5rem' }}>Step {currentStep + 1} of {STEPS.length}</span>
                  <button 
                    onClick={handleNext} 
                    disabled={currentStep === STEPS.length - 1}
                    style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', backgroundColor: currentStep === STEPS.length - 1 ? 'var(--bg-color)' : 'var(--surface)', color: currentStep === STEPS.length - 1 ? 'var(--text-muted)' : 'var(--text-main)', cursor: currentStep === STEPS.length - 1 ? 'not-allowed' : 'pointer', borderRadius: '0' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </button>
                </div>
              </div>
              <div style={{ minHeight: '400px' }}>
                {currentStep === 0 && <BasicConfig data={formData} updateData={updateData} />}
                {currentStep === 1 && <CompatibilityConfig data={formData} updateData={updateData} />}
                {currentStep === 2 && <NodeVolumesConfig data={formData} updateData={updateData} />}
                {currentStep === 3 && <ContainersConfig data={formData} updateData={updateData} />}
                {currentStep === 4 && <ReadmeConfig data={formData} updateData={updateData} />}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <Button size="sm" variant="secondary" onClick={handleBack} style={{ opacity: currentStep === 0 ? 0 : 1, pointerEvents: currentStep === 0 ? 'none' : 'auto' }}>
                  Back
                </Button>
                
                <Button size="sm" onClick={handleNext} disabled={currentStep === STEPS.length - 1} style={{ opacity: currentStep === STEPS.length - 1 ? 0.5 : 1 }}>
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <div style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 500 }}>Raw JSON Spec</h2>
              </div>
              <textarea 
                value={rawSpec}
                onChange={(e) => setRawSpec(e.target.value)}
                style={{ flex: 1, width: '100%', fontFamily: 'monospace', fontSize: '0.875rem', padding: '1rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', resize: 'vertical', outline: 'none' }}
                spellCheck={false}
              />
            </div>
          )}
          </div>
        </div>
        
      <TemplateSummary data={formData} onSave={handleSave} />
    </div>
  </div>
  );
}
