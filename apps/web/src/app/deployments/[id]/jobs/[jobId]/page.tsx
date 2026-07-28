"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function JobDetailPage(props: { params: Promise<{ id: string, jobId: string }> }) {
  const params = use(props.params);
  const [activeTab, setActiveTab] = useState("Overview");
  
  const tabs = ["Overview", "Containers", "Environment", "Logs"];

  const InfoRow = ({ label, value, monospace = false, highlight = false }: any) => (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0.875rem 0', alignItems: 'center' }}>
      <div style={{ width: '240px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{label}</div>
      <div style={{ flex: 1, fontWeight: highlight ? 500 : 400, fontSize: '0.875rem', fontFamily: monospace ? 'monospace' : 'inherit', color: highlight ? 'var(--accent)' : 'var(--text-main)' }}>{value}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href={`/deployments/${params.id}`} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '0', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-0.025em' }}>
            Job {params.jobId}
          </h1>
          <Badge variant="success">RUNNING</Badge>
        </div>
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" size="sm">Restart Job</Button>
          <Button variant="outline" size="sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Kill Job</Button>
        </div>
      </div>

      {activeTab === "Overview" && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '0 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 0 0.5rem 0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Execution Details</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <InfoRow label="Job ID" value={params.jobId} monospace highlight />
              <InfoRow label="Status" value={<Badge variant="success">RUNNING</Badge>} />
              <InfoRow label="Provider" value="Nosana" />
              <InfoRow label="Started At" value="2026-07-28 15:42:01 UTC" />
              <InfoRow label="Uptime" value="2h 15m" />
              <InfoRow label="Region" value="EU-West (Frankfurt)" />
            </div>
            <div style={{ paddingBottom: '1.5rem' }} />
          </div>

          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '0 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 0 0.5rem 0' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Hardware Specifications</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <InfoRow label="Instance" value="1x NVIDIA Pro 6000 Server Edition" />
              <InfoRow label="VRAM" value="24 GB GDDR6" />
              <InfoRow label="CPU" value="16 Cores (AMD EPYC)" />
              <InfoRow label="System Memory" value="64 GB DDR5" />
              <InfoRow label="Disk Storage" value="250 GB NVMe SSD" />
            </div>
            <div style={{ paddingBottom: '1.5rem' }} />
          </div>

        </div>
      )}

      {activeTab === "Containers" && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Running Containers</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Docker containers currently executing on this node.</p>
            </div>
          </div>
          
          <div style={{ border: '1px solid var(--border)', borderRadius: '0', padding: '1.25rem', backgroundColor: 'var(--bg-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>vllm-inference-server</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace', marginTop: '0.25rem' }}>docker.io/vllm/vllm-openai:v0.16.0</div>
              </div>
            </div>
            <Badge variant="success">HEALTHY</Badge>
          </div>
        </div>
      )}

      {activeTab === "Environment" && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', padding: '0 1.5rem' }}>
          <div style={{ padding: '1.5rem 0 0.5rem 0' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Environment Variables</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <InfoRow label="MODEL_ID" value="meta-llama/Llama-3.1-8B-Instruct" monospace />
            <InfoRow label="PORT" value="8000" monospace />
            <InfoRow label="HUGGING_FACE_HUB_TOKEN" value="hf_***************************" monospace />
          </div>
          <div style={{ paddingBottom: '1.5rem' }} />
        </div>
      )}

      {activeTab === "Logs" && (
        <div style={{ backgroundColor: '#0a0a0a', color: '#e5e5e5', border: '1px solid var(--border)', borderRadius: '0', padding: '1.5rem', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a3a3a3' }}>Node Console</h2>
            <Button variant="secondary" size="sm" style={{ backgroundColor: '#262626', color: '#fff', border: 'none', borderRadius: '0' }}>Download Logs</Button>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem', lineHeight: '1.5', flex: 1 }}>
            <div style={{ color: '#737373' }}>[2026-07-28 15:42:01] Loading vLLM engine...</div>
            <div style={{ color: '#737373' }}>[2026-07-28 15:42:03] Model meta-llama/Llama-3.1-8B-Instruct loaded successfully.</div>
            <div style={{ color: '#22c55e' }}>[2026-07-28 15:42:04] HTTP server started on port 8000.</div>
            <div style={{ color: '#737373' }}>[2026-07-28 15:43:12] POST /v1/chat/completions 200 OK</div>
            <div style={{ color: '#737373' }}>[2026-07-28 15:45:00] POST /v1/chat/completions 200 OK</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: '#525252' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '12px', backgroundColor: '#737373', animation: 'blink 1s step-end infinite' }} />
              Waiting for new logs...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
