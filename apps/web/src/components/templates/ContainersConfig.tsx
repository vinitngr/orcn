import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";

const DashedAddButton = ({ onClick, text }: { onClick: () => void, text: string }) => (
  <button 
    onClick={onClick}
    style={{
      width: '100%', padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
      background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-muted)', cursor: 'pointer',
      fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s', marginTop: '0.5rem'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--surface)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
    {text}
  </button>
);

const SettingsButton = ({ title, count, onClick, icon }: any) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem',
      background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)',
      cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {icon}
      <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{title}</span>
      <span style={{ background: 'var(--surface)', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{count}</span>
    </div>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
  </button>
);

export function ContainersConfig({ data, updateData }: any) {
  const containers = data.containers || [];
  const nodeVolumes = data.volumes || [];
  const [activeModal, setActiveModal] = useState<{type: string, containerIndex: number} | null>(null);

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
            <div key={cIndex} style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                  <input 
                    type="text" 
                    value={container.id} 
                    onChange={(e) => updateContainer(cIndex, 'id', e.target.value)}
                    placeholder="Container ID (e.g. ai-master)"
                    style={{ width: '100%', maxWidth: '300px', padding: '0.4rem 0.6rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }}
                  />
                </div>
                <button onClick={() => removeContainer(cIndex)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'transparent', border: '1px solid transparent', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'var(--surface)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }} title="Remove Container">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Image</label>
                <input type="text" value={container.image} onChange={(e) => updateContainer(cIndex, 'image', e.target.value)} placeholder="e.g. ubuntu:latest" style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                <SettingsButton 
                  title="Startup Command" 
                  count={(container.cmd || container.entrypoint) ? 'Configured' : 'Default'} 
                  onClick={() => setActiveModal({type: 'startup', containerIndex: cIndex})} 
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>}
                />
                <SettingsButton 
                  title="Volume Mounts" 
                  count={(container.mounts || []).length} 
                  onClick={() => setActiveModal({type: 'mounts', containerIndex: cIndex})} 
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>}
                />
                <SettingsButton 
                  title="Exposed Ports" 
                  count={(container.ports || []).length} 
                  onClick={() => setActiveModal({type: 'ports', containerIndex: cIndex})} 
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>}
                />
                <SettingsButton 
                  title="Environment Variables" 
                  count={(container.envVars || []).length} 
                  onClick={() => setActiveModal({type: 'env', containerIndex: cIndex})} 
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>}
                />
                <SettingsButton 
                  title="External Resources" 
                  count={(container.resources || []).length} 
                  onClick={() => setActiveModal({type: 'resources', containerIndex: cIndex})} 
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>}
                />
              </div>

            </div>
          ))}
        </div>
      )}

      {activeModal && (() => {
        const cIndex = activeModal.containerIndex;
        const container = containers[cIndex];
        return (
          <Modal 
            isOpen={true} 
            onClose={() => setActiveModal(null)} 
            title={
              activeModal.type === 'mounts' ? 'Volume Mounts' :
              activeModal.type === 'ports' ? 'Exposed Ports' :
              activeModal.type === 'env' ? 'Environment Variables' :
              activeModal.type === 'startup' ? 'Startup Command' :
              'External Resources'
            }
            maxWidth={activeModal.type === 'resources' ? '700px' : '550px'}
          >
            {activeModal.type === 'startup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '-0.5rem' }}>Override the default entrypoint or command arguments for the Docker container.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>Entrypoint</label>
                  <input type="text" value={container.entrypoint || ''} onChange={(e) => updateContainer(cIndex, 'entrypoint', e.target.value)} placeholder="e.g. /bin/sh -c" style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem', fontFamily: 'monospace' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Leave blank to use the image's default entrypoint.</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>Command (Args)</label>
                  <textarea 
                    value={container.cmd || ''} 
                    onChange={(e) => updateContainer(cIndex, 'cmd', e.target.value)} 
                    placeholder="e.g. --listen 0.0.0.0 --port 8188\n--highvram" 
                    rows={4}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem', fontFamily: 'monospace', resize: 'vertical' }} 
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Passed as arguments to the entrypoint. Newlines and spaces are preserved.</span>
                </div>
              </div>
            )}

            {activeModal.type === 'mounts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Mount persistent storage volumes to specific paths inside the container.</p>
                {(container.mounts || []).length === 0 ? (
                  <div style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    <span>No volume mounts configured.</span>
                  </div>
                ) : (
                  (container.mounts || []).map((m: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--bg-color)', padding: '0.75rem', border: '1px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <Select 
                          value={m.volumeName} 
                          onChange={(val: string) => updateArrayItem(cIndex, 'mounts', i, 'volumeName', val)} 
                          options={nodeVolumes.map((v: any) => ({ value: v.name, label: `${v.name} (${v.size}GB)` }))}
                          placeholder="Select Disk..."
                        />
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      <input type="text" value={m.mountPath} onChange={(e) => updateArrayItem(cIndex, 'mounts', i, 'mountPath', e.target.value)} placeholder="Container Path (e.g. /data)" style={{ flex: 1, padding: '0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }} />
                      <button onClick={() => removeArrayItem(cIndex, 'mounts', i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  ))
                )}
                <DashedAddButton onClick={() => addArrayItem(cIndex, 'mounts', { volumeName: '', mountPath: '' })} text="Add Volume Mount" />
              </div>
            )}

            {activeModal.type === 'ports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Expose container ports to the node or the public internet.</p>
                {(container.ports || []).length === 0 ? (
                  <div style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                    <span>No exposed ports configured.</span>
                  </div>
                ) : (
                  (container.ports || []).map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--bg-color)', padding: '0.75rem', border: '1px solid var(--border)' }}>
                      <input type="number" value={p.port || ''} onChange={(e) => updateArrayItem(cIndex, 'ports', i, 'port', e.target.value)} placeholder="Port (e.g. 8000)" style={{ flex: 1, padding: '0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }} />
                      <div style={{ width: '130px' }}>
                        <Select 
                          value={(p.is_public ?? true) ? 'public' : 'internal'} 
                          onChange={(val: string) => updateArrayItem(cIndex, 'ports', i, 'is_public', val === 'public')} 
                          options={[{ value: 'public', label: 'Public' }, { value: 'internal', label: 'Internal' }]}
                        />
                      </div>
                      <button onClick={() => removeArrayItem(cIndex, 'ports', i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  ))
                )}
                <DashedAddButton onClick={() => addArrayItem(cIndex, 'ports', { port: '', is_public: true })} text="Add Port" />
              </div>
            )}

            {activeModal.type === 'env' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Inject configuration directly into the container's environment.</p>
                {(container.envVars || []).length === 0 ? (
                  <div style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
                    <span>No environment variables configured.</span>
                  </div>
                ) : (
                  (container.envVars || []).map((env: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--bg-color)', padding: '0.75rem', border: '1px solid var(--border)' }}>
                      <input type="text" value={env.key} onChange={(e) => updateArrayItem(cIndex, 'envVars', i, 'key', e.target.value)} placeholder="KEY (e.g. TOKEN)" style={{ flex: 1, padding: '0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.875rem' }} />
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>=</span>
                      <input type="text" value={env.value} onChange={(e) => updateArrayItem(cIndex, 'envVars', i, 'value', e.target.value)} placeholder="VALUE" style={{ flex: 1.5, padding: '0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.875rem' }} />
                      <button onClick={() => removeArrayItem(cIndex, 'envVars', i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  ))
                )}
                <DashedAddButton onClick={() => addArrayItem(cIndex, 'envVars', { key: '', value: '' })} text="Add Environment Variable" />
              </div>
            )}

            {activeModal.type === 'resources' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Auto-download models, LoRAs, or config files before the container starts.</p>
                {(container.resources || []).length === 0 ? (
                  <div style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>No external resources configured.</span>
                  </div>
                ) : (
                  (container.resources || []).map((res: any, i: number) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-color)', padding: '1.25rem', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                        <div style={{ width: '180px' }}>
                          <Select 
                            value={res.type} 
                            onChange={(val: string) => updateArrayItem(cIndex, 'resources', i, 'type', val)} 
                            options={[{ value: 'HF', label: 'Hugging Face' }, { value: 'S3', label: 'S3 Compatible' }, { value: 'HTTP', label: 'HTTP Direct URL' }, { value: 'GIT', label: 'Git Repository' }]}
                          />
                        </div>
                        <button onClick={() => removeArrayItem(cIndex, 'resources', i)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resource Source</label>
                        <input type="text" value={res.url} onChange={(e) => updateArrayItem(cIndex, 'resources', i, 'url', e.target.value)} placeholder="URL or Repo ID" style={{ padding: '0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Mount Path</label>
                        <input type="text" value={res.target} onChange={(e) => updateArrayItem(cIndex, 'resources', i, 'target', e.target.value)} placeholder="e.g. /opt/comfyui/models/checkpoints/" style={{ padding: '0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Files Filter (Optional)</label>
                        <input type="text" value={res.filesFilter || ''} onChange={(e) => updateArrayItem(cIndex, 'resources', i, 'filesFilter', e.target.value)} placeholder="e.g. model.safetensors, config.json" style={{ padding: '0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }} />
                      </div>
                    </div>
                  ))
                )}
                <DashedAddButton onClick={() => addArrayItem(cIndex, 'resources', { type: 'HF', url: '', target: '' })} text="Add Resource" />
              </div>
            )}
          </Modal>
        );
      })()}

    </div>
  );
}
