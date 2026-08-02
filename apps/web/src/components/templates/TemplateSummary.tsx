import { Button } from "@/components/ui/Button";

export function TemplateSummary({ data, onSave }: any) {
  const volumes = data.volumes || [];
  const containers = data.containers || [];
  const hasCompat = data.computeType === 'GPU' && (data.minVram || data.minRam || data.cudaVersion || data.gpuModel);

  return (
    <div style={{ backgroundColor: '#09090b', color: '#f4f4f5', border: '1px solid #27272a', borderRadius: '0', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 500, margin: '0 0 0.5rem 0' }}>Template Summary</h3>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Review your configuration before saving.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Basic Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Name</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{data.name || 'Unnamed Template'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Compute</span>
            <span style={{ fontSize: '0.75rem', background: '#27272a', border: '1px solid #3f3f46', padding: '0.1rem 0.4rem', fontWeight: 600 }}>{data.computeType || 'GPU'}</span>
          </div>
        </div>

        <div style={{ height: '1px', background: '#27272a', width: '100%' }}></div>

        {/* Resources & Network */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Node Volumes</span>
            <span style={{ fontSize: '0.875rem' }}>{volumes.length} defined</span>
          </div>
          {volumes.length > 0 && (
            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', marginTop: '-0.25rem' }}>
              Total: {volumes.reduce((acc: number, v: any) => acc + (parseInt(v.size) || 0), 0)} GB
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Containers</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{containers.length}</span>
          </div>
          {containers.map((c: any, i: number) => (
             <div key={i} style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between', marginTop: '-0.25rem' }}>
               <span>- {c.id || 'unnamed'}</span>
               <span style={{ wordBreak: 'break-all', maxWidth: '60%', textAlign: 'right' }}>{c.image || 'no image'}</span>
             </div>
          ))}
        </div>

        {/* Compatibility indicator */}
        {hasCompat && (
          <>
            <div style={{ height: '1px', background: '#27272a', width: '100%' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>HARDWARE LIMITS APPLIED</span>
              {data.minVram && <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,0.6)' }}>Min VRAM</span><span>{data.minVram} GB</span></div>}
              {data.minCores && <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(255,255,255,0.6)' }}>Min Cores</span><span>{data.minCores}</span></div>}
            </div>
          </>
        )}
      </div>
      
      <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <Button size="sm" onClick={onSave} style={{ width: '100%', borderRadius: '0', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none' }} disabled={!data.name || containers.length === 0}>
          {data.id ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </div>
  );
}
