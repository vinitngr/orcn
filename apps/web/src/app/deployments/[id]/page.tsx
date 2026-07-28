"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function DeploymentDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = ["Overview", "Jobs", "Network", "Configuration"];

  const payload = {
    "name": "prod-llama-inference",
    "workload_type": "model",
    "runtime_id": "vllm",
    "model_id": "meta-llama/Llama-3.1-8B-Instruct",
    "provider_id": "nosana",
    "market_id": "market-xyz",
    "replicas": 2,
    "timeout_minutes": 120,
    "strategy": "EXTEND"
  };

  const networkEndpoints = [
    { type: "HTTP Ingress", port: 80, url: "http://prod-llama.orcn.network" },
    { type: "Direct Node Port", port: 8000, url: "http://node-1.nosana.network:8000" }
  ];

  const jobs = [
    { id: "job-8f92bd", status: "RUNNING", node: "NVIDIA Pro 6000 Server Edition", region: "EU-West", uptime: "2h 15m" },
    { id: "job-3a11fc", status: "RUNNING", node: "NVIDIA Pro 6000 Server Edition", region: "US-East", uptime: "2h 14m" }
  ];

  const InfoRow = ({ label, value, monospace = false, highlight = false }: any) => (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0.875rem 0', alignItems: 'center' }}>
      <div style={{ width: '240px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{label}</div>
      <div style={{ flex: 1, fontWeight: highlight ? 500 : 400, fontSize: '0.875rem', fontFamily: monospace ? 'monospace' : 'inherit', color: highlight ? 'var(--accent)' : 'var(--text-main)' }}>{value}</div>
    </div>
  );

  const actionButtonStyle = {
    display: 'block',
    width: '100%',
    textAlign: 'left' as const,
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-main)',
    cursor: 'pointer'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '0', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-0.025em' }}>
          {payload.name}
        </h1>
        <Badge variant="success">RUNNING</Badge>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid var(--border)',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '0.5rem 0',
                fontSize: '0.875rem',
                fontWeight: activeTab === t ? 500 : 400,
                color: activeTab === t ? 'var(--text-main)' : 'var(--text-muted)',
                borderBottom: `2px solid ${activeTab === t ? 'var(--text-main)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '-1px'
              }}
            >
              {t}
            </button>
          ))}
        </div>
        
        <div style={{ position: 'relative' }}>
          <Button variant="secondary" size="sm" onClick={() => setMenuOpen(!menuOpen)}>
            Actions
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
          </Button>
          
          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setMenuOpen(false)} />
              <div style={{ 
                position: 'absolute', top: '100%', right: 0, marginTop: '0.25rem', width: '180px', 
                backgroundColor: 'var(--bg-color)', border: '1px solid var(--border)', 
                borderRadius: '0', zIndex: 10,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                overflow: 'hidden', display: 'flex', flexDirection: 'column'
              }}>
                <button style={{...actionButtonStyle, borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem'}} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>Restart</button>
                <button style={{...actionButtonStyle, borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem'}} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>Stop/Start</button>
                <button style={{...actionButtonStyle, borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem'}} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>Update Replica</button>
                <button style={{...actionButtonStyle, padding: '0.75rem 1rem'}} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>Update Timeout</button>
              </div>
            </>
          )}
        </div>
      </div>

      {activeTab === "Overview" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '0 1.5rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 500, padding: '1.25rem 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Deployment Metadata</h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <InfoRow label="Deployment Name" value={payload.name} highlight />
              <InfoRow label="Deployment ID" value={params.id} monospace highlight />
              <InfoRow label="Status" value={<Badge variant="success">RUNNING</Badge>} />
              <InfoRow label="Type" value="Model Inference" />
              <InfoRow label="Model" value={payload.model_id} />
              <InfoRow label="Provider" value="Nosana" />
              <InfoRow label="Instance" value="NVIDIA Pro 6000 Server Edition" />
              <InfoRow label="Replicas (Active / Desired)" value="2 / 2" />
              <InfoRow label="Strategy" value="EXTEND" />
              <InfoRow label="Estimated Cost" value="$2.20 / hour" />
              <InfoRow label="Created At" value="2026-07-27 23:23:20 UTC" />
            </div>
            <div style={{ paddingBottom: '1.5rem' }} />
          </div>
        </div>
      )}

      {activeTab === "Jobs" && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Job ID</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Compute Node</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Region</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Uptime</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr 
                  key={j.id} 
                  onClick={() => router.push(`/deployments/${params.id}/jobs/${j.id}`)}
                  style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--accent)', fontFamily: 'monospace' }}>{j.id}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <Badge variant={j.status === 'RUNNING' ? 'success' : 'default'}>{j.status}</Badge>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>{j.node}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{j.region}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{j.uptime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "Network" && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Network & Endpoints</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Manage ingress routing and direct node access.</p>
            </div>
            <Button variant="secondary" size="sm">Add Custom Domain</Button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {networkEndpoints.map((p, i) => (
              <div key={i} style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                backgroundColor: 'var(--bg-color)', 
                border: '1px solid var(--border)', 
                borderRadius: '0', 
                padding: '1rem 1.25rem' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '0.25rem 0.5rem', borderRadius: '0', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                    PORT {p.port}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{p.type}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.25rem' }}>{p.url}</div>
                  </div>
                </div>
                <a href={p.url} target="_blank" rel="noreferrer" style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', 
                  fontSize: '0.75rem', color: 'var(--accent)',
                  backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '0.5rem 0.75rem', borderRadius: '0',
                  transition: 'all 0.15s ease'
                }}>
                  Open Link
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Configuration" && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Raw Configuration</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>The immutable JSON payload deployed to the cluster.</p>
            </div>
            <Button variant="secondary" size="sm">Copy JSON</Button>
          </div>
          <pre style={{ 
            backgroundColor: 'var(--bg-color)', 
            padding: '1.5rem', 
            borderRadius: '0',
            fontSize: '0.875rem',
            overflowX: 'auto',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)'
          }}>
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
