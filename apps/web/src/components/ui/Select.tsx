
import { useState, useRef, useEffect } from "react";

export function Select({ value, onChange, options, placeholder = "Select an option" }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o: any) => o.value === value);

  return (
    <div ref={selectRef} style={{ position: 'relative', width: '100%', fontFamily: 'inherit' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', padding: '0.75rem 1rem',
          backgroundColor: 'var(--bg-color)',
          border: '1px solid var(--border)',
          borderRadius: '0',
          fontSize: '0.875rem',
          color: 'var(--text-main)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%', left: 0, right: 0,
          marginTop: '0.25rem',
          backgroundColor: 'var(--bg-color)',
          border: '1px solid var(--border)',
          borderRadius: '0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          zIndex: 50,
          maxHeight: '200px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {options.map((option: any) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                color: 'var(--text-main)',
                cursor: 'pointer',
                backgroundColor: value === option.value ? 'var(--surface-hover)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === option.value ? 'var(--surface-hover)' : 'transparent'}
            >
              {option.label}
              {value === option.value && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
