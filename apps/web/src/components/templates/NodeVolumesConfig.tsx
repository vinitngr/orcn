import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

export function NodeVolumesConfig({ data, updateData }: any) {
  const volumes = data.volumes || [];

  const addVolume = () => {
    updateData({ volumes: [...volumes, { name: `vol-${volumes.length}`, type: 'persistent', size: '', hostPath: '' }] });
  };
  
  const updateVolume = (index: number, field: string, val: string) => {
    const newVols = [...volumes];
    newVols[index][field] = val;
    updateData({ volumes: newVols });
  };

  const removeVolume = (index: number) => {
    const newVols = volumes.filter((_: any, i: number) => i !== index);
    updateData({ volumes: newVols });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Node Storage Volumes</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Define persistent disks (like EBS) allocated on the host node.</p>
          </div>
          <Button variant="outline" size="sm" onClick={addVolume}>+ Add Disk</Button>
        </div>
        
        {volumes.length === 0 ? (
          <div style={{ padding: '2rem', border: '1px dashed var(--border)', borderRadius: '0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--surface)' }}>
            No physical volumes defined. Only ephemeral storage will be used.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {volumes.map((vol: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={vol.name} 
                  onChange={(e) => updateVolume(i, 'name', e.target.value)}
                  placeholder="Name (e.g. cache)"
                  style={{ flex: 1, padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0', fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
                
                <div style={{ flex: 1 }}>
                  <Select
                    value={vol.type || 'persistent'}
                    onChange={(val: string) => updateVolume(i, 'type', val)}
                    options={[
                      { value: 'persistent', label: 'Persistent Disk (Cloud/EBS)' },
                      { value: 'docker', label: 'Docker Managed Volume' },
                      { value: 'bind', label: 'Host Path (Bind)' }
                    ]}
                  />
                </div>

                {vol.type === 'bind' ? (
                  <input 
                    type="text" 
                    value={vol.hostPath || ''} 
                    onChange={(e) => updateVolume(i, 'hostPath', e.target.value)}
                    placeholder="Host Path (e.g. /home/ubuntu)"
                    style={{ flex: 1.5, padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0', fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                ) : vol.type === 'persistent' ? (
                  <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid var(--border)' }}>
                    <input 
                      type="number" 
                      value={vol.size || ''} 
                      onChange={(e) => updateVolume(i, 'size', e.target.value)}
                      placeholder="Size"
                      style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                    />
                    <span style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.875rem', borderLeft: '1px solid var(--border)' }}>GB</span>
                  </div>
                ) : (
                  <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', padding: '0 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                    Stored on VM's default root disk
                  </div>
                )}
                
                <button 
                  onClick={() => removeVolume(i)} 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }} 
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
    </div>
  );
}
