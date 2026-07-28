"use client";

import { useState } from "react";
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { useRouter } from "next/navigation";

export function DeploymentTable() {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState("all");

  const deployments = [
    { id: 'dep-xyz123', name: 'prod-qwen-coder', provider: 'Nosana', status: 'RUNNING', jobs: 3, updated: 'Just now', model: 'Qwen/Qwen2.5-Coder-7B-Instruct' },
    { id: 'dep-abc456', name: 'staging-llama-3', provider: 'Nosana', status: 'RUNNING', jobs: 1, updated: '2 hours ago', model: 'meta-llama/Llama-3.1-8B-Instruct' },
    { id: 'dep-def789', name: 'test-sarvam-moe', provider: 'AWS EC2', status: 'STOPPED', jobs: 0, updated: '1 day ago', model: 'sarvamai/sarvam-105b' },
  ];

  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '0', 
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface)' }}>
        <input 
          type="text" 
          placeholder="Search deployments..."
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid var(--border)',
            borderRadius: '0',
            width: '320px',
            fontSize: '0.875rem',
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-main)',
            outline: 'none'
          }}
        />
        <div style={{ display: 'flex', gap: '0.75rem', width: '180px' }}>
          <Select 
            value={statusFilter}
            onChange={(val: string) => setStatusFilter(val)}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "running", label: "Running" },
              { value: "stopped", label: "Stopped" }
            ]}
          />
        </div>
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', backgroundColor: '#f5f5f5' }}>
            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Deployment</th>
            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Status</th>
            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Provider</th>
            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Model</th>
            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Active Jobs</th>
            <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {deployments.map(d => (
            <tr 
              key={d.id} 
              onClick={() => router.push(`/deployments/${d.id}`)}
              style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <td style={{ padding: '1rem 1.5rem' }}>
                <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{d.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'monospace' }}>{d.id}</div>
              </td>
              <td style={{ padding: '1rem 1.5rem' }}>
                <Badge variant={d.status === 'RUNNING' ? 'success' : 'default'}>
                  <span style={{ 
                    width: '6px', height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: d.status === 'RUNNING' ? 'var(--success)' : 'var(--text-muted)',
                    display: 'inline-block',
                    marginRight: '6px'
                  }} />
                  {d.status}
                </Badge>
              </td>
              <td style={{ padding: '1rem 1.5rem', fontWeight: 400, color: 'var(--text-main)' }}>{d.provider}</td>
              <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{d.model}</td>
              <td style={{ padding: '1rem 1.5rem' }}>
                <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{d.jobs}</span> <span style={{ color: 'var(--text-muted)' }}>Nodes</span>
              </td>
              <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{d.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
