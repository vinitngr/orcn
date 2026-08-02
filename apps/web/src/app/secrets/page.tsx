"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export default function SecretsPage() {
  const [secrets, setSecrets] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: '', value: '', description: '' });

  const fetchSecrets = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/v1/secrets');
      if (res.ok) {
        const data = await res.json();
        setSecrets(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSecrets();
  }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.value) return;
    try {
      const res = await fetch('http://localhost:8080/api/v1/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowCreate(false);
        setFormData({ name: '', value: '', description: '' });
        fetchSecrets();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-main)' }}>Secrets</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Manage your environment variables, credentials, and API keys.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>New Secret</Button>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Secret">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Secret Name (ID)</label>
              <input 
                type="text" 
                placeholder="e.g. HF_TOKEN"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Description</label>
              <input 
                type="text" 
                placeholder="e.g. Hugging Face Read Token"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Secret Value</label>
            <input 
              type="password" 
              placeholder="Raw secret value"
              value={formData.value}
              onChange={e => setFormData({...formData, value: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button onClick={() => setShowCreate(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
            <button onClick={handleSave} disabled={!formData.name || !formData.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--text-main)', border: 'none', color: 'var(--bg-color)', cursor: 'pointer', fontSize: '0.875rem', opacity: (!formData.name || !formData.value) ? 0.5 : 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              Save Secret
            </button>
          </div>
        </div>
      </Modal>
      
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)' }}>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Name</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Description</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Created</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Last Used</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Updated</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {secrets.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    <span style={{ fontSize: '0.875rem' }}>No secrets configured. Create one to use in your templates.</span>
                  </div>
                </td>
              </tr>
            ) : (
              secrets.map((s: any) => (
                <tr key={s.name} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)' }}>{s.name}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.description || ''}>{s.description || '-'}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {'-'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                    {new Date(s.updated_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={async (e) => { 
                        if (confirm('Delete this secret?')) {
                          await fetch(`http://localhost:8080/api/v1/secrets/${s.name}`, { method: 'DELETE' });
                          setSecrets(secrets.filter(sec => sec.name !== s.name));
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
