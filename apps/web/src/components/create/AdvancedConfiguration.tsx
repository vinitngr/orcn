import React from "react";
import { Select } from "@/components/ui/Select";

interface ConfigOption {
  key: string;
  name: string;
  description: string;
  type: string;
  default: string;
  min?: number;
  max?: number;
  options?: string[];
}

interface AdvancedConfigurationProps {
  schema: ConfigOption[];
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
  show: boolean;
  onToggle: () => void;
}

export function AdvancedConfiguration({ schema, data, onChange, show, onToggle }: AdvancedConfigurationProps) {
  if (schema.length === 0) return null;

  return (
    <div style={{ marginTop: '1rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
      <div 
        onClick={onToggle}
        style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-4"></path></svg>
          Advanced Configuration
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: show ? 'rotate(180deg)' : 'rotate(0)' }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      
      {show && (
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {schema.map(opt => (
            <div key={opt.key}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>{opt.name}</label>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{opt.description}</div>
              
              {opt.type === 'boolean' ? (
                <Select 
                  value={opt.key === 'enforce_eager' ? (data[opt.key] === 'true' ? 'false' : 'true') : (data[opt.key] || 'false')}
                  onChange={(val: string) => onChange(opt.key, opt.key === 'enforce_eager' ? (val === 'true' ? 'false' : 'true') : val)}
                  options={[
                    { value: "true", label: "Enabled" },
                    { value: "false", label: "Disabled" }
                  ]}
                />
              ) : opt.type === 'select' && opt.options ? (
                <Select 
                  value={data[opt.key] || ''}
                  onChange={(val: string) => onChange(opt.key, val)}
                  options={opt.options.map(o => ({
                    value: o,
                    label: o === "" ? "None (Auto Detect)" : o
                  }))}
                />
              ) : opt.type === 'number' ? (
                <input 
                  type="number"
                  min={opt.min} max={opt.max} step={opt.min !== undefined && opt.max !== undefined && (opt.max - opt.min <= 1) ? 0.01 : 1}
                  value={data[opt.key] || ''}
                  onChange={e => onChange(opt.key, e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', 
                    borderRadius: '0', 
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--bg-color)',
                    outline: 'none',
                    color: 'var(--text-main)',
                    fontFamily: 'inherit'
                  }}
                />
              ) : (
                <input 
                  type="text"
                  value={data[opt.key] || ''}
                  onChange={e => onChange(opt.key, e.target.value)}
                  style={{
                    width: '100%', padding: '0.75rem 1rem', 
                    borderRadius: '0', 
                    border: '1px solid var(--border)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--bg-color)',
                    outline: 'none',
                    color: 'var(--text-main)',
                    fontFamily: 'inherit'
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
