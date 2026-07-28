export function MarketCard({ name, price, vram_gb, selected, disabled, warning, onClick }: any) {
  const isAvailable = !disabled;
  return (
    <div 
      onClick={isAvailable ? onClick : undefined}
      style={{
        border: `1px solid ${selected ? 'var(--text-main)' : 'var(--border)'}`,
        borderRadius: '0',
        backgroundColor: 'var(--surface)',
        cursor: isAvailable ? 'pointer' : 'not-allowed',
        opacity: isAvailable ? 1 : 0.4,
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseEnter={(e) => {
        if (!selected && isAvailable) e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
      }}
      onMouseLeave={(e) => {
        if (!selected && isAvailable) e.currentTarget.style.backgroundColor = 'var(--surface)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500, fontSize: '0.875rem', padding: '1rem' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: isAvailable ? 'grayscale(0%)' : 'grayscale(100%)' }}>
          <rect width="24" height="24" rx="0" fill="#E8F5E9"/>
          <path d="M7 8H17L12 16L7 8Z" fill="#4CAF50"/>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>{name}</div>
          {vram_gb && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>{vram_gb} GB VRAM</div>}
        </div>
      </div>
      
      {warning && (
        <div style={{ padding: '0.5rem 1rem', backgroundColor: '#fef3c7', borderTop: '1px solid #fde68a', fontSize: '0.75rem', color: '#92400e', fontWeight: 500 }}>
          {warning}
        </div>
      )}
      
      <div style={{ 
        borderTop: '1px solid var(--border)', 
        padding: '1rem',
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.5rem', 
        fontSize: '0.875rem' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Price</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>${price}/h</span>
        </div>
      </div>
    </div>
  );
}
