"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { FaDocker } from "react-icons/fa";

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8080/api/v1/templates')
      .then(res => res.json())
      .then(data => setTemplates(data || []))
      .catch(e => console.error(e));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-main)' }}>Templates</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Manage your container templates and deployments.</p>
        </div>
        <Button size="sm" onClick={() => router.push("/templates/create")}>New Template</Button>
      </div>
      
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)' }}>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Template</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Image</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Compute</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Created</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                    <span style={{ fontSize: '0.875rem' }}>No templates found. Create your first template to get started.</span>
                  </div>
                </td>
              </tr>
            ) : (
              templates.map((tpl: any) => (
                <tr 
                  key={tpl.id} 
                  onClick={() => router.push(`/templates/${tpl.id}`)}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s', cursor: 'pointer' }} 
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} 
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FaDocker size={22} color="#2496ED" />
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-main)', fontWeight: 500, fontSize: '0.95rem' }}>{tpl.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.25rem' }}>ID: {tpl.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-main)' }}>{tpl.image}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      background: 'var(--bg-color)', 
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      color: 'var(--text-main)'
                    }}>
                      {tpl.computeType}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {tpl.CreatedAt ? new Date(tpl.CreatedAt).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center', height: '72px' }}>
                    <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/workloads/create?template=${tpl.id}`); }}>Deploy</Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={async (e) => { 
                        e.stopPropagation(); 
                        if (confirm('Delete this template?')) {
                          await fetch(`http://localhost:8080/api/v1/templates/${tpl.id}`, { method: 'DELETE' });
                          setTemplates(templates.filter(t => t.id !== tpl.id));
                        }
                      }}
                      style={{ color: '#ef4444', borderColor: '#fee2e2' }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
