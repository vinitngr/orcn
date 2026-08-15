import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { useState, useEffect } from "react";

export function BasicConfig({ data, updateData }: any) {
  const [registries, setRegistries] = useState<any[]>([]);
  const [showRegistryModal, setShowRegistryModal] = useState(false);
  const [newReg, setNewReg] = useState({ name: '', server_url: '', username: '', password: '' });

  const handleCreateRegistry = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/v1/registries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReg)
      });
      if (res.ok) {
        const created = await res.json();
        setRegistries([...registries, created]);
        setShowRegistryModal(false);
        setNewReg({ name: '', server_url: '', username: '', password: '' });
      } else {
        alert("Failed to save registry. Check console for details.");
        console.error("Failed to save:", await res.text());
      }
    } catch (e) {
      console.error("Failed to create registry", e);
      alert("Network error. Did you restart the Go backend server?");
    }
  };

  useEffect(() => {
    fetch('http://localhost:8080/api/v1/registries')
      .then(res => res.json())
      .then(data => setRegistries(data || []))
      .catch(e => console.error(e));
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Template Name</label>
        <input 
          type="text" 
          value={data.name || ''} 
          onChange={(e) => updateData({ name: e.target.value.replace(/\//g, "-") })}
          style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '0' }}
          placeholder="e.g. Ubuntu 22.04 Setup"
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Compute Type</label>
        <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: '0', overflow: 'hidden' }}>
          <button 
            onClick={() => updateData({ computeType: 'CPU' })}
            style={{ 
              padding: '0.35rem 1rem', border: 'none', 
              background: data.computeType === 'CPU' ? 'var(--text-main)' : 'var(--surface)', 
              color: data.computeType === 'CPU' ? 'var(--bg-color)' : 'var(--text-main)', 
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
              transition: 'all 0.2s', borderRight: '1px solid var(--border)'
            }}>
            CPU
          </button>
          <button 
            onClick={() => updateData({ computeType: 'GPU' })}
            style={{ 
              padding: '0.35rem 1rem', border: 'none', 
              background: data.computeType === 'GPU' ? 'var(--text-main)' : 'var(--surface)', 
              color: data.computeType === 'GPU' ? 'var(--bg-color)' : 'var(--text-main)', 
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
              transition: 'all 0.2s'
            }}>
            GPU
          </button>
        </div>
      </div>



      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
          <label style={{ color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500 }}>Container Registry</label>
          <button 
            onClick={() => setShowRegistryModal(!showRegistryModal)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
          >
            + Add New
          </button>
        </div>
        <div style={{ borderRadius: '0', border: '1px solid var(--border)' }}>
          <Select 
            value={data.authKeyId}
            onChange={(val: any) => updateData({ authKeyId: val })}
            options={[
              { label: 'Public (No Auth)', value: 'none' },
              ...registries.map(r => ({ label: `${r.name} (${r.server_url})`, value: r.id }))
            ]}
            placeholder="Select a Registry"
          />
        </div>

        <Modal isOpen={showRegistryModal} onClose={() => setShowRegistryModal(false)} title="Add New Registry">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</label>
              <input type="text" value={newReg.name} onChange={e => setNewReg({...newReg, name: e.target.value})} placeholder="e.g. My Docker Hub" style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Server URL</label>
              <input type="text" value={newReg.server_url} onChange={e => setNewReg({...newReg, server_url: e.target.value})} placeholder="e.g. docker.io or ghcr.io" style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Username</label>
                <input type="text" value={newReg.username} onChange={e => setNewReg({...newReg, username: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Token / Password</label>
                <input type="password" value={newReg.password} onChange={e => setNewReg({...newReg, password: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.875rem' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button onClick={() => setShowRegistryModal(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
              <button onClick={handleCreateRegistry} disabled={!newReg.name || !newReg.server_url || !newReg.username || !newReg.password} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--text-main)', border: 'none', color: 'var(--bg-color)', cursor: 'pointer', fontSize: '0.875rem', opacity: (!newReg.name || !newReg.server_url || !newReg.username || !newReg.password) ? 0.5 : 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Save
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
