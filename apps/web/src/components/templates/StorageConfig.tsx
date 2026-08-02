import { Button } from "@/components/ui/Button";

export function StorageConfig({ data, updateData }: any) {
  const volumes = data.storage || [];

  const addVolume = () => updateData({ storage: [...volumes, { type: 'persistent', size: '', mountPath: '' }] });
  
  const updateVolume = (index: number, field: string, val: string) => {
    const newVols = [...volumes];
    newVols[index][field] = val;
    updateData({ storage: newVols });
  };

  const removeVolume = (index: number) => {
    const newVols = volumes.filter((_: any, i: number) => i !== index);
    updateData({ storage: newVols });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Persisted Storage Volumes</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Attach one or multiple storage volumes to the container.</p>
          </div>
          <Button variant="outline" size="sm" onClick={addVolume}>+ Add Volume</Button>
        </div>
        
        {volumes.length === 0 ? (
          <div style={{ padding: '2rem', border: '1px dashed var(--border)', borderRadius: '0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--surface)' }}>
            No storage volumes configured. Ephemeral storage will be used.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {volumes.map((vol: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid var(--border)' }}>
                  <input 
                    type="number" 
                    value={vol.size || ''} 
                    onChange={(e) => updateVolume(i, 'size', e.target.value)}
                    placeholder="Size"
                    style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none' }}
                  />
                  <span style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.875rem', borderLeft: '1px solid var(--border)' }}>GB</span>
                </div>
                <input 
                  type="text" 
                  value={vol.mountPath || ''} 
                  onChange={(e) => updateVolume(i, 'mountPath', e.target.value)}
                  placeholder="Mount Path (e.g. /data)"
                  style={{ flex: 2, padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0', fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
                <button 
                  onClick={() => removeVolume(i)} 
                  style={{ 
                    padding: '0 1rem', background: 'var(--surface)', border: '1px solid var(--border)', 
                    color: 'var(--text-main)', cursor: 'pointer', borderRadius: '0',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
