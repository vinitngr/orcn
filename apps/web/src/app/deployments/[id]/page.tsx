"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function DeploymentDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [deployment, setDeployment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      if (action === "restart") {
        await fetch(`/api/v1/deployments/${deployment.ID}/action`, { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "stop" }) });
        await new Promise(r => setTimeout(r, 2000));
        await fetch(`/api/v1/deployments/${deployment.ID}/action`, { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "start" }) });
      } else {
        await fetch(`/api/v1/deployments/${deployment.ID}/action`, { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      }
      setMenuOpen(false);
      window.location.reload();
    } catch (e) {
      alert("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetch(`/api/v1/deployments/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error("Deployment not found");
        return res.json();
      })
      .then(data => setDeployment(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const tabs = ["Overview", "Nodes", "Network", "Configuration"];

  const statusVariant = (s: string) => {
    if (s === "RUNNING" || s === "READY") return "success";
    if (s === "PARTIAL") return "warning";
    return "default";
  };

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
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-main)',
    cursor: 'pointer'
  };

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading deployment...</div>;
  }

  if (error || !deployment) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Deployment not found.</div>;
  }

  const nodes = deployment.Nodes || [];
  const createdAt = deployment.CreatedAt ? new Date(deployment.CreatedAt).toLocaleString() : "-";

  let parsedSpec: any = null;
  try {
    parsedSpec = deployment.JobSpecJSON ? JSON.parse(deployment.JobSpecJSON) : null;
  } catch { parsedSpec = null; }

  // Parse endpoints from nodes
  const allEndpoints: any[] = [];
  nodes.forEach((n: any) => {
    if (n.EndpointsJSON) {
      try {
        const eps = JSON.parse(n.EndpointsJSON);
        eps.forEach((ep: any) => allEndpoints.push({ ...ep, nodeId: n.ID }));
      } catch {}
    }
    if (n.NodeURL) {
      allEndpoints.push({ base_url: n.NodeURL, port: "-", protocol: "http", nodeId: n.ID });
    }
  });

  return (
    <div style={{ width: '100%', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '0', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-0.025em' }}>
          {deployment.Name}
        </h1>
        <Badge variant={statusVariant(deployment.Status)}>{deployment.Status}</Badge>
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
                <button disabled={actionLoading} onClick={() => handleAction('restart')} style={{...actionButtonStyle, borderBottom: '1px solid var(--border)'}} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>{actionLoading ? "Processing..." : "Restart"}</button>
                {deployment.Status !== "STOPPED" && (
                  <button disabled={actionLoading} onClick={() => handleAction('stop')} style={{...actionButtonStyle}} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>Stop</button>
                )}
                {deployment.Status === "STOPPED" && (
                  <button disabled={actionLoading} onClick={() => handleAction('start')} style={{...actionButtonStyle}} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>Start</button>
                )}
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
              <InfoRow label="Deployment Name" value={deployment.Name} highlight />
              <InfoRow label="Deployment ID" value={deployment.ID} monospace />
              <InfoRow label="Status" value={<Badge variant={statusVariant(deployment.Status)}>{deployment.Status}</Badge>} />
              <InfoRow label="Type" value={deployment.WorkloadType || "model_inference"} />
              <InfoRow label="Model" value={deployment.ModelID || "-"} />
              <InfoRow label="Runtime" value={deployment.RuntimeID || "-"} />
              <InfoRow label="Provider" value={deployment.ProviderID || "-"} />
              <InfoRow label="Market" value={deployment.MarketID || "-"} monospace />
              <InfoRow label="Nodes (Active / Desired)" value={`${nodes.length} / ${deployment.Replicas}`} />
              <InfoRow label="Estimated Cost" value="-" />
              <InfoRow label="Created At" value={createdAt} />
            </div>
            <div style={{ paddingBottom: '1.5rem' }} />
          </div>
        </div>
      )}

      {activeTab === "Nodes" && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Node ID</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Provider</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {nodes.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No nodes found.</td></tr>
              ) : nodes.map((n: any) => (
                <tr 
                  key={n.ID} 
                  onClick={() => router.push(`/deployments/${params.id}/nodes/${n.ID}`)}
                  style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem', cursor: 'pointer', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--accent)', fontFamily: 'monospace' }}>{n.ID}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <Badge variant={statusVariant(n.Status)}>{n.Status}</Badge>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>{n.ProviderID}</td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      View Details
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </span>
                  </td>
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
          </div>
          
          <h3 style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>Gateway Endpoint (Primary)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                backgroundColor: 'var(--bg-color)', 
                border: '1px solid var(--border)', 
                borderRadius: '0', 
                padding: '1rem 1.25rem' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '0.25rem 0.5rem', borderRadius: '0', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                    PORT 80
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>ORCN PROXY</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.25rem' }}>http://llm.localhost/v1/chat/completions</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Use this in your OpenAI client (Model: {deployment.Name})</div>
                  </div>
                </div>
              </div>
          </div>

          <h3 style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>Direct Node Endpoints (Internal)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {allEndpoints.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
                No direct endpoints resolved yet. Endpoints will appear once nodes are RUNNING.
              </div>
            ) : allEndpoints.map((p, i) => (
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
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{p.protocol?.toUpperCase() || "HTTP"}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.25rem' }}>{p.base_url}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Node: {p.nodeId}</div>
                  </div>
                </div>
                {p.base_url && (
                  <a href={p.base_url} target="_blank" rel="noreferrer" style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem', 
                    fontSize: '0.75rem', color: 'var(--accent)',
                    backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '0.5rem 0.75rem', borderRadius: '0',
                    transition: 'all 0.15s ease'
                  }}>
                    Open Link
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </a>
                )}
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
            <Button variant="secondary" size="sm" onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(parsedSpec, null, 2));
            }}>Copy JSON</Button>
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
            {parsedSpec ? JSON.stringify(parsedSpec, null, 2) : "No configuration stored."}
          </pre>
        </div>
      )}
    </div>
  );
}
