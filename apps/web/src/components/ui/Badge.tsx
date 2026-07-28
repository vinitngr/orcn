import { ReactNode } from 'react';

export function Badge({ children, variant = 'default' }: { children: ReactNode, variant?: 'default' | 'success' | 'warning' | 'error' }) {
  const styles = {
    default: { bg: 'var(--surface-hover)', color: 'var(--text-muted)', border: 'var(--border)' },
    success: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
    warning: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    error: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
  };

  const s = styles[variant];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.125rem 0.5rem',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.75rem',
      fontWeight: 500,
      backgroundColor: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`
    }}>
      {children}
    </span>
  );
}
