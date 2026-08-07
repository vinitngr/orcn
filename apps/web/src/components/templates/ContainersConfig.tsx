import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

export function ContainersConfig({ data, updateData }: any) {
  const containers = data.containers || [];
  const nodeVolumes = data.volumes || [];
  const [showAdvanced, setShowAdvanced] = useState(false);

  const addContainer = () => {
    updateData({ 
      containers: [...containers, { id: `container-${containers.length + 1}`, image: '', entrypoint: '', cmd: '', gpu: true, envVars: [], ports: [], mounts: [] }] 
    });
  };

  const updateContainer = (index: number, field: string, val: any) => {
    const newContainers = [...containers];
    newContainers[index][field] = val;
    updateData({ containers: newContainers });
  };

  const removeContainer = (index: number) => {
    updateData({ containers: containers.filter((_: any, i: number) => i !== index) });
  };

  const addArrayItem = (cIndex: number, field: string, defaultItem: any) => {
    const newArr = [...(containers[cIndex][field] || []), defaultItem];
    updateContainer(cIndex, field, newArr);
  };

  const updateArrayItem = (cIndex: number, field: string, iIndex: number, itemField: string, val: any) => {
    const newArr = [...containers[cIndex][field]];
    if (itemField) newArr[iIndex][itemField] = val;
    else newArr[iIndex] = val;
    updateContainer(cIndex, field, newArr);
  };

  const removeArrayItem = (cIndex: number, field: string, iIndex: number) => {
    updateContainer(cIndex, field, containers[cIndex][field].filter((_: any, i: number) => i !== iIndex));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Containers</label>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Define one or multiple containers to run inside this deployment.</p>
        </div>
        <Button variant="outline" size="sm" onClick={addContainer}>+ Add Container</Button>
      </div>

      {containers.length === 0 ? (
        <div style={{ padding: '3rem', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--surface)' }}>
          No containers defined. Add a container to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {containers.map((container: any, cIndex: number) => (
            <div key={cIndex} style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                <div style={{ flex: 1, maxWidth: '300px' }}>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Container ID (Name)</label>
                  <input 
                    type="text" 
                    value={container.id} 
                    onChange={(e) => updateContainer(cIndex, 'id', e.target.value)}
                    placeholder="e.g. ai-master"
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }}
                  />
                </div>
                <button onClick={() => removeContainer(cIndex)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'transparent', border: '1px solid transparent', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = 'var(--surface)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }} title="Remove Container">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Image</label>
                <input type="text" value={container.image} onChange={(e) => updateContainer(cIndex, 'image', e.target.value)} placeholder="e.g. ubuntu:latest" style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Entrypoint (Optional)</label>
                  <input type="text" value={container.entrypoint || ''} onChange={(e) => updateContainer(cIndex, 'entrypoint', e.target.value)} placeholder="e.g. /bin/sh -c" style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem', fontFamily: 'monospace' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Command / Args</label>
                  <input type="text" value={container.cmd} onChange={(e) => updateContainer(cIndex, 'cmd', e.target.value)} placeholder="e.g. --port 8000" style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem', fontFamily: 'monospace' }} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                >
                  <span>Advanced Configuration</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{showAdvanced ? '−' : '+'}</span>
                </button>
              </div>

              {showAdvanced && <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Volume Mounts</label>
                  <button onClick={() => addArrayItem(cIndex, 'mounts', { volumeName: '', mountPath: '' })} style={{ color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>+ Add Mount</button>
                </div>
                {(container.mounts || []).map((m: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <Select 
                        value={m.volumeName} 
                        onChange={(val: string) => updateArrayItem(cIndex, 'mounts', i, 'volumeName', val)} 
                        options={nodeVolumes.map((v: any) => ({ value: v.name, label: `${v.name} (${v.size}GB)` }))}
                        placeholder="Select Disk..."
                      />
                    </div>
                    <input type="text" value={m.mountPath} onChange={(e) => updateArrayItem(cIndex, 'mounts', i, 'mountPath', e.target.value)} placeholder="Container Path (e.g. /data)" style={{ flex: 2, padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)' }} />
                    <button onClick={() => removeArrayItem(cIndex, 'mounts', i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border)' }}>
                <div style={{ flex: 1, paddingRight: '1.5rem', borderRight: '1px dashed var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Exposed Ports</label>
                    <button onClick={() => addArrayItem(cIndex, 'ports', '')} style={{ color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>+ Add Port</button>
                  </div>
                  {(container.ports || []).map((p: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input type="number" value={p} onChange={(e) => updateArrayItem(cIndex, 'ports', i, '', e.target.value)} placeholder="Port (e.g. 8000)" style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)' }} />
                      <button onClick={() => removeArrayItem(cIndex, 'ports', i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ flex: 1, paddingLeft: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Environment Variables</label>
                    <button onClick={() => addArrayItem(cIndex, 'envVars', { key: '', value: '' })} style={{ color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>+ Add Env</button>
                  </div>
                  {(container.envVars || []).map((env: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input type="text" value={env.key} onChange={(e) => updateArrayItem(cIndex, 'envVars', i, 'key', e.target.value)} placeholder="KEY (e.g. HF_TOKEN)" style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontFamily: 'monospace' }} />
                      <input type="text" value={env.value} onChange={(e) => updateArrayItem(cIndex, 'envVars', i, 'value', e.target.value)} placeholder="VALUE (e.g. hf_abc...)" style={{ flex: 1.5, padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontFamily: 'monospace' }} />
                      <button onClick={() => removeArrayItem(cIndex, 'envVars', i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>External Resources (Models, LoRAs, Configs)</label>
                  <button onClick={() => addArrayItem(cIndex, 'resources', { type: 'HF', url: '', target: '' })} style={{ color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>+ Add Resource</button>
                </div>
                {(container.resources || []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(container.resources || []).map((res: any, i: number) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 1fr 36px', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div>
                          <Select 
                            value={res.type} 
                            onChange={(val: string) => updateArrayItem(cIndex, 'resources', i, 'type', val)} 
                            options={[
                              { value: 'HF', label: 'Hugging Face' },
                              { value: 'S3', label: 'S3 Compatible' },
                              { value: 'HTTP', label: 'HTTP Direct URL' },
                              { value: 'GIT', label: 'Git Repository' },
                            ]}
                          />
                        </div>
                        <input 
                          type="text" 
                          value={res.url} 
                          onChange={(e) => updateArrayItem(cIndex, 'resources', i, 'url', e.target.value)} 
                          placeholder={
                            res.type === 'HF' ? 'Org/Repo (e.g. runwayml/stable-diffusion-v1-5)' :
                            res.type === 'S3' ? 's3://... or https://... (S3 Endpoint)' :
                            res.type === 'GIT' ? 'https://github.com/org/repo.git' :
                            'URL (e.g. https://...)'
                          } 
                          style={{ padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.75rem' }} 
                        />
                        <input 
                          type="text" 
                          value={res.target} 
                          onChange={(e) => updateArrayItem(cIndex, 'resources', i, 'target', e.target.value)} 
                          placeholder="Target Path (e.g. /models/unet)" 
                          style={{ padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.75rem' }} 
                        />
                        <button 
                          onClick={() => removeArrayItem(cIndex, 'resources', i)} 
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }} 
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }} 
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              </>}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
