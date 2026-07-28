"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar({ isCollapsed, setIsCollapsed }: any) {
  const pathname = usePathname();
  const width = isCollapsed ? 72 : 240;

  const navItemStyle = (isActive: boolean) => ({
    padding: isCollapsed ? '0.75rem' : '0.6rem 0.8rem',
    borderRadius: '0',
    backgroundColor: isActive ? 'var(--surface-hover)' : 'transparent',
    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
    fontWeight: 500,
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: isCollapsed ? 'center' : 'flex-start',
    gap: '0.75rem',
    transition: 'all 0.2s ease',
  });

  return (
    <div style={{
      width: `${width}px`,
      height: '100vh',
      backgroundColor: '#f4f4f5',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      transition: 'width 0.2s ease',
      overflowX: 'hidden'
    }}>
      <div style={{ padding: isCollapsed ? '2rem 0' : '2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', transition: 'all 0.2s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
          
          <span style={{ 
            fontSize: '1.25rem', 
            fontWeight: 700, 
            letterSpacing: '-0.05em', 
            fontFamily: '"Space Grotesk", sans-serif',
            color: 'var(--text-main)',
            display: isCollapsed ? 'none' : 'block'
          }}>
            ORCN
          </span>
          
        </div>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0.25rem'
          }}
        >
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
             <path d="M15 18l-6-6 6-6"/>
           </svg> 
        </button>
      </div>
      
      <nav style={{ flex: 1, padding: isCollapsed ? '0 0.5rem' : '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'padding 0.2s ease' }}>
        <Link href="/" style={navItemStyle(pathname === '/' || pathname.startsWith('/deployments'))}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Deployments</span>}
        </Link>
        <Link href="/create" style={navItemStyle(pathname === '/create')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Deploy AI Model</span>}
        </Link>
      </nav>
    </div>
  );
}
