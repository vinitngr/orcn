import { ReactNode } from 'react';

export function Card({ children, style, className }: { children: ReactNode, style?: any, className?: string }) {
  return (
    <div 
      className={className}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-card)',
        ...style
      }}
    >
      {children}
    </div>
  );
}
