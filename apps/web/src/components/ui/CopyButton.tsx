"use client";

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  value: string;
  size?: number;
  className?: string;
  title?: string;
}

export function CopyButton({ value, size = 14, className = '', title = "Copy to clipboard" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={title}
      className={`inline-flex items-center justify-center p-1 rounded transition-colors duration-150 ${className}`}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: copied ? 'var(--success, #10b981)' : 'var(--text-muted)',
      }}
      onMouseEnter={(e) => {
        if (!copied) e.currentTarget.style.color = 'var(--text-main)';
      }}
      onMouseLeave={(e) => {
        if (!copied) e.currentTarget.style.color = 'var(--text-muted)';
      }}
    >
      {copied ? (
        <Check size={size} style={{ color: 'var(--success, #10b981)', transition: 'all 0.15s ease' }} />
      ) : (
        <Copy size={size} />
      )}
    </button>
  );
}
