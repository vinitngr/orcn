"use client";

import React from 'react';

export function Modal({ isOpen, onClose, title, children, maxWidth = '700px' }: { isOpen: boolean, onClose: () => void, title?: string, children: React.ReactNode, maxWidth?: string }) {
  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '2rem'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: maxWidth,
          minHeight: '300px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
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
        
        <div className="orcn-modal-scroll" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .orcn-modal-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .orcn-modal-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .orcn-modal-scroll::-webkit-scrollbar-thumb {
            background-color: var(--border);
            border-radius: 10px;
          }
          .orcn-modal-scroll::-webkit-scrollbar-thumb:hover {
            background-color: var(--text-muted);
          }
        `}} />
      </div>
    </div>
  );
}
