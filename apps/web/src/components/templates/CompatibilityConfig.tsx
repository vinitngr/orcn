export function CompatibilityConfig({ data, updateData }: any) {
  const isCpu = data.computeType === 'CPU';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: isCpu ? 0.5 : 1, pointerEvents: isCpu ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
        {isCpu && (
          <div style={{ padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.5)', borderRadius: '0', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            GPU limits are disabled because this is a CPU-only template.
          </div>
        )}
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Minimum VRAM (GB)</label>
          <input 
            type="number" 
            value={data.minVram || ''} 
            onChange={(e) => updateData({ minVram: e.target.value })}
            style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0' }}
            placeholder="e.g. 16"
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Minimum GPU Memory required to run this template.</p>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Preferred GPU Models</label>
          <input 
            type="text" 
            value={data.gpuModel || ''} 
            onChange={(e) => updateData({ gpuModel: e.target.value })}
            style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0' }}
            placeholder="e.g. RTX 4090, A100 (Optional)"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Required CUDA Version</label>
          <input 
            type="text" 
            value={data.cudaVersion || ''} 
            onChange={(e) => updateData({ cudaVersion: e.target.value })}
            style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0' }}
            placeholder="e.g. 12.0"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Min Cores</label>
          <input 
            type="number" 
            value={data.minCores || ''} 
            onChange={(e) => updateData({ minCores: e.target.value })}
            style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0' }}
            placeholder="e.g. 4"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Min RAM (GB)</label>
          <input 
            type="number" 
            value={data.minRam || ''} 
            onChange={(e) => updateData({ minRam: e.target.value })}
            style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0' }}
            placeholder="e.g. 16"
          />
        </div>
      </div>
      
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Architecture Constraint</label>
        <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: '0', overflow: 'hidden' }}>
          <button 
            onClick={() => updateData({ arch: 'any' })}
            style={{ 
              padding: '0.35rem 1rem', border: 'none', 
              background: (!data.arch || data.arch === 'any') ? 'var(--text-main)' : 'var(--surface)', 
              color: (!data.arch || data.arch === 'any') ? 'var(--bg-color)' : 'var(--text-main)', 
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, borderRight: '1px solid var(--border)'
            }}>
            Any
          </button>
          <button 
            onClick={() => updateData({ arch: 'amd64' })}
            style={{ 
              padding: '0.35rem 1rem', border: 'none', 
              background: data.arch === 'amd64' ? 'var(--text-main)' : 'var(--surface)', 
              color: data.arch === 'amd64' ? 'var(--bg-color)' : 'var(--text-main)', 
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, borderRight: '1px solid var(--border)'
            }}>
            x86 / AMD64
          </button>
          <button 
            onClick={() => updateData({ arch: 'arm64' })}
            style={{ 
              padding: '0.35rem 1rem', border: 'none', 
              background: data.arch === 'arm64' ? 'var(--text-main)' : 'var(--surface)', 
              color: data.arch === 'arm64' ? 'var(--bg-color)' : 'var(--text-main)', 
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500
            }}>
            ARM64
          </button>
        </div>
      </div>
    </div>
  );
}
