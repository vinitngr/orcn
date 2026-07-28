import { Button } from '../ui/Button';

export function DeploymentSummary({ data, onDeploy, isDeploying }: any) {
  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      border: '1px solid var(--border)',
      borderRadius: '0',
      padding: '1.5rem',
      position: 'sticky',
      top: '2rem',
      color: '#e5e5e5'
    }}>
      <h2 style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem', color: '#a3a3a3' }}>Deployment Summary</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <div style={{ color: '#737373', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Estimated Cost</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-0.025em', color: '#fff' }}>
            {data.market ? `$${data.market.price}/h` : '-'}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #333', paddingTop: '1.5rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#737373' }}>Name</span>
              <span style={{ fontWeight: 400, textAlign: 'right' }}>{data.name || '-'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#737373' }}>Model</span>
              <span style={{ fontWeight: 400, textAlign: 'right' }}>{data.model || '-'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#737373' }}>Provider</span>
              <span style={{ fontWeight: 400, textAlign: 'right' }}>{data.provider === 'nosana' ? 'Nosana Network' : '-'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#737373' }}>Instance</span>
              <span style={{ fontWeight: 400, textAlign: 'right' }}>{data.market?.name || '-'}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#737373' }}>Replicas</span>
              <span style={{ fontWeight: 400, textAlign: 'right' }}>{data.replicas || 1} Node</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#737373' }}>Timeout</span>
              <span style={{ fontWeight: 400, textAlign: 'right' }}>{data.timeout_minutes || 60} Minutes</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#737373' }}>Strategy</span>
              <span style={{ fontWeight: 400, textAlign: 'right' }}>{data.strategy || 'EXTEND'}</span>
            </div>
          </div>
        </div>
        
        <Button 
          variant="primary" 
          size="lg" 
          style={{ width: '100%', marginTop: '1rem', borderRadius: '0', backgroundColor: '#fff', color: '#000', fontWeight: 600 }}
          disabled={!data.name || !data.model || !data.market || isDeploying}
          onClick={onDeploy}
        >
          {isDeploying ? 'Deploying...' : 'Deploy Model'}
        </Button>
      </div>
    </div>
  );
}
