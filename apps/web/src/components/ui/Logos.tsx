import React from "react";

export function Logo({ name, size = 24 }: { name: string; size?: number }) {
  const normalized = name.toLowerCase();

  if (normalized === 'meta') {
    // Infinity style Meta logo approximation
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 12c-2-2.5-4-5-7-5a5 5 0 0 0 0 10c3 0 5-2.5 7-5zm0 0c2 2.5 4 5 7 5a5 5 0 0 0 0-10c-3 0-5 2.5-7 5z" />
      </svg>
    );
  }
  
  if (normalized === 'qwen' || normalized === 'alibaba') {
    // Abstract geometric for Qwen/Alibaba
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
        <polyline points="12 22 12 12" />
        <polyline points="22 8.5 12 12" />
        <polyline points="2 8.5 12 12" />
      </svg>
    );
  }

  if (normalized === 'deepseek') {
    // Whale / Droplet shape for DeepSeek
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M8 14c0-2.21 1.79-4 4-4s4 1.79 4 4" />
        <circle cx="12" cy="14" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (normalized === 'sarvamai' || normalized === 'sarvam') {
    // Circular interconnected rings for Sarvam
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="12" r="4" />
        <circle cx="16" cy="12" r="4" />
        <line x1="12" y1="12" x2="16" y2="12" />
        <line x1="8" y1="12" x2="12" y2="12" />
      </svg>
    );
  }

  if (normalized === 'vllm') {
    // Fast lightning for vLLM
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }

  if (normalized === 'ollama') {
    // O / Llama for Ollama
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    );
  }
  
  if (normalized === 'diffusers') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  // Fallback generic block
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}
