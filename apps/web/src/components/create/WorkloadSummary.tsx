import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function WorkloadSummary({ 
  formData, 
  templates, 
  isDeploying, 
  handleDeploy, 
  generateFinalSpec 
}: any) {
  const [showJSON, setShowJSON] = useState(false);

  return (
    <div style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)', border: '1px solid var(--text-main)', borderRadius: '0', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
            Deployment Summary
          </h3>
          <button 
            onClick={() => setShowJSON(!showJSON)} 
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
          >
            {showJSON ? 'View Summary' : 'View JSON Spec'}
          </button>
        </div>
        
        {showJSON ? (
          <pre style={{ fontSize: '0.7rem', color: '#00ff00', backgroundColor: '#0a0a0a', padding: '1rem', overflowX: 'auto', maxHeight: '400px', borderRadius: '0', border: '1px solid rgba(255,255,255,0.1)' }}>
            {JSON.stringify(generateFinalSpec(), null, 2)}
          </pre>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Workload</span>
                <span style={{ fontWeight: 500 }}>{formData.workloadName || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Template</span>
                <span style={{ fontWeight: 500 }}>{templates.find((t: any) => t.id === formData.templateId)?.name || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Replicas</span>
                <span style={{ fontWeight: 500 }}>{formData.replicas}</span>
              </div>
              
              <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0.5rem 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Provider</span>
                <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{formData.provider}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Instance</span>
                <span style={{ fontWeight: 500 }}>{formData.market?.name || '-'}</span>
              </div>
              
              <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0.5rem 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Volumes</span>
                <span style={{ fontWeight: 500 }}>{formData.volumes.length} Configured</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Containers</span>
                <span style={{ fontWeight: 500 }}>{formData.containers.length} Configured</span>
              </div>
            </div>
          </>
        )}

        <Button 
          size="sm" 
          style={{ 
            width: '100%', 
            marginTop: '2rem', 
            borderRadius: '0', 
            backgroundColor: 'var(--primary)',
            color: '#000',
            fontWeight: 600,
            border: 'none'
          }}
          disabled={!formData.workloadName || !formData.templateId || !formData.market || isDeploying}
          onClick={handleDeploy}
        >
          {isDeploying ? 'Deploying...' : 'Deploy Workload'}
        </Button>
      </div>
    </div>
  );
}
