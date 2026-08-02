export function ReadmeConfig({ data, updateData }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div>
        <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Template Documentation (README)</label>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Write markdown instructions on how users should interact with this container.</p>
      </div>
      
      <textarea 
        value={data.readme || ''} 
        onChange={(e) => updateData({ readme: e.target.value })}
        style={{ 
          width: '100%', 
          height: '300px', 
          padding: '1rem', 
          background: 'var(--bg-color)', 
          border: '1px solid var(--border)', 
          color: 'var(--text-main)', 
          borderRadius: '0',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          resize: 'vertical',
          lineHeight: '1.5'
        }}
        placeholder="# My Custom Template&#10;&#10;This template deploys a standard environment...&#10;&#10;## Usage&#10;1. Expose port 8080&#10;2. Connect via SSH"
      />
    </div>
  );
}
