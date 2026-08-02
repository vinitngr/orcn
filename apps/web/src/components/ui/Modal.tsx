"use client";

import React from 'react';

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title?: string, children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '2rem',
        width: '100%',
        maxWidth: '550px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {title && <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-main)', fontWeight: 500 }}>{title}</h3>}
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s', padding: '0.25rem' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}
