"use client";

import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarWidth = isCollapsed ? 72 : 240;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <main style={{ 
        flex: 1, 
        padding: '2rem 3rem',
        maxWidth: '1400px',
        margin: '0 auto',
        paddingLeft: `calc(${sidebarWidth}px + 3rem)`,
        transition: 'padding-left 0.2s ease'
      }}>
        {children}
      </main>
    </div>
  );
}
