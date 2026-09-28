"use client";

import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

export function AppShell({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarWidth = isCollapsed ? 72 : 240;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <TopHeader sidebarWidth={sidebarWidth} />
      <main style={{ 
        flex: 1, 
        padding: 'calc(56px + 1.5rem) 1.5rem 2rem calc(' + sidebarWidth + 'px + 1.5rem)',
        width: '100%',
        margin: '0',
        transition: 'padding-left 0.2s ease'
      }}>
        {children}
      </main>
    </div>
  );
}
