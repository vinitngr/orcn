import { ReactNode } from 'react';

export function PageHeader({ 
  title, 
  description, 
  action 
}: { 
  title: string; 
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start',
      marginBottom: '2rem'
    }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.025em', marginBottom: '0.25rem' }}>
          {title}
        </h1>
        {description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {description}
          </p>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ 
          width: '32px', height: '32px', 
          backgroundColor: 'var(--surface-hover)', 
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>
        {action}
      </div>
    </div>
  );
}
