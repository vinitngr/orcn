import { Button } from "@/components/ui/Button";

export function NetworkConfig({ data, updateData }: any) {
  const envVars = data.envVars || [];
  const ports = data.ports || [];

  const addPort = () => updateData({ ports: [...ports, ''] });
  const updatePort = (index: number, val: string) => {
    const newPorts = [...ports];
    newPorts[index] = val;
    updateData({ ports: newPorts });
  };
  const removePort = (index: number) => {
    const newPorts = ports.filter((_: any, i: number) => i !== index);
    updateData({ ports: newPorts });
  };

  const addEnv = () => updateData({ envVars: [...envVars, { key: '', value: '' }] });
  
  const updateEnv = (index: number, field: string, val: string) => {
    const newEnv = [...envVars];
    newEnv[index][field] = val;
    updateData({ envVars: newEnv });
  };

  const removeEnv = (index: number) => {
    const newEnv = envVars.filter((_: any, i: number) => i !== index);
    updateData({ envVars: newEnv });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Exposed Ports</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Internal ports your application listens on.</p>
          </div>
          <Button variant="outline" size="sm" onClick={addPort}>+ Add Port</Button>
        </div>
        
        {ports.length === 0 ? (
          <div style={{ padding: '2rem', border: '1px dashed var(--border)', borderRadius: '0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--surface)' }}>
            No ports exposed.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ports.map((port: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  value={port} 
                  onChange={(e) => updatePort(i, e.target.value)}
                  placeholder="e.g. 8080"
                  style={{ flex: 1, padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0', fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
                <button 
                  onClick={() => removePort(i)} 
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

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Environment Variables</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Configure environment variables. Use <code style={{ color: 'var(--primary)', background: 'var(--surface-hover)', padding: '0.1rem 0.3rem' }}>%Secrets.SECRET_NAME%</code> to inject values securely from the Secrets tab.</p>
          </div>
          <Button variant="outline" size="sm" onClick={addEnv}>+ Add Variable</Button>
        </div>
        
        {envVars.length === 0 ? (
          <div style={{ padding: '2rem', border: '1px dashed var(--border)', borderRadius: '0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--surface)' }}>
            No environment variables configured.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {envVars.map((env: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={env.key} 
                  onChange={(e) => updateEnv(i, 'key', e.target.value)}
                  placeholder="KEY"
                  style={{ flex: 1, padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0', fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
                <input 
                  type="text" 
                  value={env.value} 
                  onChange={(e) => updateEnv(i, 'value', e.target.value)}
                  placeholder="VALUE"
                  style={{ flex: 2, padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0', fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
                <button 
                  onClick={() => removeEnv(i)} 
                  style={{ 
                    padding: '0 1rem', background: 'var(--surface)', border: '1px solid var(--border)', 
                    color: 'var(--text-main)', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
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
