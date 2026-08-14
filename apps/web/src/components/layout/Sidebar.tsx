"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Zap, Blocks, KeyRound, ChevronLeft, Boxes } from 'lucide-react';

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
           <ChevronLeft size={18} style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} /> 
        </button>
      </div>
      
      <nav style={{ flex: 1, padding: isCollapsed ? '0 0.5rem' : '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', transition: 'padding 0.2s ease' }}>
        
        <div style={{ marginTop: '0.5rem', marginBottom: '0.25rem', padding: '0 0.75rem', display: isCollapsed ? 'none' : 'block' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deploy</span>
        </div>

        <Link href="/" style={navItemStyle(pathname === '/' || pathname.startsWith('/deployments') || pathname.startsWith('/workloads'))}>
          <LayoutGrid size={18} strokeWidth={2.2} />
          {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Deployments</span>}
        </Link>
        <Link href="/workloads/create" style={navItemStyle(pathname === '/workloads/create')}>
          <Boxes size={18} strokeWidth={2.2} />
          {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Create Workload</span>}
        </Link>
        <Link href="/models/deploy" style={navItemStyle(pathname === '/models/deploy')}>
          <Zap size={18} strokeWidth={2.2} />
          {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Deploy AI Model</span>}
        </Link>

        <div style={{ marginTop: '1.5rem', marginBottom: '0.25rem', padding: '0 0.75rem', display: isCollapsed ? 'none' : 'block' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configuration</span>
        </div>

        <Link href="/templates" style={navItemStyle(pathname.startsWith('/templates'))}>
          <Blocks size={18} strokeWidth={2.2} />
          {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Templates</span>}
        </Link>
        <Link href="/secrets" style={navItemStyle(pathname.startsWith('/secrets'))}>
          <KeyRound size={18} strokeWidth={2.2} />
          {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Secrets</span>}
        </Link>
      </nav>
    </div>
  );
}
