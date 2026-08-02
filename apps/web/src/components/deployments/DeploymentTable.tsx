"use client";

import { useState, useEffect } from "react";
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { useRouter } from "next/navigation";

export function DeploymentTable() {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState("all");
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/deployments")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDeployments(data.map(d => ({
            id: d.ID,
            name: d.Name,
            provider: d.ProviderID,
            status: d.Status,
            nodes: d.Nodes ? d.Nodes.length : 0,
            updated: new Date(d.UpdatedAt).toLocaleString(),
            model: d.ModelID
          })));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
          {loading ? (
            <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading deployments...</td></tr>
          ) : deployments.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>
                  <span style={{ fontSize: '0.875rem' }}>No deployments running. Launch a deployment from your templates.</span>
                </div>
              </td>
            </tr>
          ) : deployments.filter(d => statusFilter === "all" || d.status.toLowerCase() === statusFilter.toLowerCase()).map(d => (
            <tr 
              key={d.id} 
              onClick={() => router.push(`/deployments/${d.name}`)}
              style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <td style={{ padding: '1rem 1.5rem' }}>
                <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{d.name}</div>
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
                <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{d.nodes}</span> <span style={{ color: 'var(--text-muted)' }}>Nodes</span>
              </td>
              <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{d.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
