"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function NodeDetailPage(props: { params: Promise<{ id: string, nodeId: string }> }) {
  const params = use(props.params);
  const [activeTab, setActiveTab] = useState("Overview");
  const [deployment, setDeployment] = useState<any>(null);
  const [node, setNode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let intervalId: any;

    const fetchNode = () => {
      fetch(`/api/v1/deployments/${params.id}`)
        .then(res => {
          if (!res.ok) throw new Error("Deployment not found");
          return res.json();
        })
        .then(data => {
          setDeployment(data);
          const foundNode = (data.Nodes || []).find((n: any) => n.ID === params.nodeId);
          if (foundNode) {
            setNode(foundNode);
          } else {
            setError("Node not found within this deployment");
          }
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    };

    fetchNode();
    
    // Poll every 3 seconds to get endpoints quickly when node spins up
    intervalId = setInterval(fetchNode, 3000);

    return () => clearInterval(intervalId);
  }, [params.id, params.nodeId]);

  const tabs = ["Overview", "Container", "Network", "Logs"];

  const statusVariant = (s: string) => {
    if (s === "RUNNING" || s === "COMPLETED" || s === "READY") return "success";
    if (s === "PARTIAL" || s === "PENDING") return "warning";
    return "default";
  };

  const InfoRow = ({ label, value, monospace = false, highlight = false }: any) => (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0.875rem 0', alignItems: 'center' }}>
      <div style={{ width: '240px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{label}</div>
      <div style={{ flex: 1, fontWeight: highlight ? 500 : 400, fontSize: '0.875rem', fontFamily: monospace ? 'monospace' : 'inherit', color: highlight ? 'var(--accent)' : 'var(--text-main)' }}>{value}</div>
    </div>
  );

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading node details...</div>;
  }

  if (error || !node || !deployment) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>{error || "Node not found."}</div>;
  }

  const createdAt = node.CreatedAt ? new Date(node.CreatedAt).toLocaleString() : "-";
  const updatedAt = node.UpdatedAt ? new Date(node.UpdatedAt).toLocaleString() : "-";

  let parsedSpec: any = null;
  try {
    parsedSpec = deployment.JobSpecJSON ? JSON.parse(deployment.JobSpecJSON) : null;
  } catch { parsedSpec = null; }

  const endpoints: any[] = [];
  if (node.EndpointsJSON) {
    try {
      const eps = JSON.parse(node.EndpointsJSON);
      eps.forEach((ep: any) => endpoints.push(ep));
    } catch {}
  }
  if (node.NodeURL) {
    endpoints.push({ base_url: node.NodeURL, port: "-", protocol: "http" });
  }

  return (
    <div style={{ width: '100%', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href={`/deployments/${params.id}`} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '0', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{deployment.Name}</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontFamily: 'monospace', fontSize: '1.25rem' }}>{node.ID}</span>
        </h1>
        <Badge variant={statusVariant(node.InfraStatus)}>{node.InfraStatus}</Badge>
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
      </div>

      {activeTab === "Overview" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '0 1.5rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 500, padding: '1.25rem 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Node Metadata</h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <InfoRow label="Node/Job ID" value={node.ID} monospace highlight />
              <InfoRow label="Parent Deployment" value={deployment.Name} />
              <InfoRow label="Status" value={<Badge variant={statusVariant(node.InfraStatus)}>{node.InfraStatus}</Badge>} />
              <InfoRow label="Provider" value={node.ProviderID} />
              <InfoRow label="Market" value={deployment.MarketID || "-"} monospace />
              <InfoRow label="Created At" value={createdAt} />
              <InfoRow label="Last Updated" value={updatedAt} />
            </div>
            <div style={{ paddingBottom: '1.5rem' }} />
          </div>
        </div>
      )}

      {activeTab === "Container" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Containers</h2>
            {(parsedSpec && parsedSpec.containers && parsedSpec.containers.length > 0) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {parsedSpec.containers.map((c: any, index: number) => (
                  <div key={index} style={{ border: '1px solid var(--border)', padding: '1.5rem', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>
                            {c.id || `CONTAINER_${index + 1}`}
                          </h3>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.args?.image}</p>
                        </div>
                      </div>
                      <Badge variant={statusVariant(node.InfraStatus)}>{node.InfraStatus}</Badge>
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {c.args?.expose && c.args.expose.map((p: any, i: number) => (
                        <div key={i} style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          <strong style={{ color: 'var(--text-main)' }}>Exposed Port:</strong> {p.port}/{p.protocol || 'http'}
                        </div>
                      ))}
                      {c.args?.gpu && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          <strong style={{ color: 'var(--text-main)' }}>Hardware Requirement:</strong> GPU Enabled
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No containers specified in the job definition.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "Network" && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Node Endpoints</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Direct access to the exposed ports on this specific node.</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {endpoints.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
                No endpoints resolved yet. The node may still be starting up.
              </div>
            ) : endpoints.map((p, i) => (
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

      {activeTab === "Logs" && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Container Logs</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Live stdout/stderr stream from the container.</p>
            </div>
            <Button variant="secondary" size="sm" disabled>Stream Logs (Coming Soon)</Button>
          </div>
          <div style={{ 
            backgroundColor: '#0a0a0a', 
            padding: '1.5rem', 
            borderRadius: '0',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            color: '#00ff00',
            minHeight: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
          }}>
            Waiting for log stream... (Feature in development)
          </div>
        </div>
      )}
    </div>
  );
}
