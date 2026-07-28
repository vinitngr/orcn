import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  style, 
  ...props 
}: ButtonProps) {
  
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    borderRadius: 'var(--radius-sm)',
    transition: 'all 0.15s ease',
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    ...style
  };
  
  const sizeStyles = {
    sm: { padding: '0.375rem 0.75rem', fontSize: '0.75rem' },
    md: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
    lg: { padding: '0.75rem 1.5rem', fontSize: '0.875rem' }
  };
  
  const variantStyles = {
    primary: {
      backgroundColor: 'var(--primary)',
      color: 'var(--primary-foreground)',
      border: '1px solid var(--primary)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)'
    },
    secondary: {
      backgroundColor: 'var(--surface)',
      color: 'var(--text-main)',
      border: '1px solid var(--border)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--text-main)',
      border: '1px solid var(--border)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-muted)',
      border: '1px solid transparent'
    }
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];
  const disabledStyle = props.disabled ? { opacity: 0.5, boxShadow: 'none' } : {};

  return (
    <button 
      {...props} 
      style={{ ...baseStyle, ...currentSize, ...currentVariant, ...disabledStyle }}
      onMouseEnter={(e) => {
        if (!props.disabled) {
          if (variant === 'primary') e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
          if (variant === 'secondary') {
            e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
            e.currentTarget.style.borderColor = 'var(--border-hover)';
          }
          if (variant === 'outline') e.currentTarget.style.borderColor = 'var(--border-hover)';
          if (variant === 'ghost') e.currentTarget.style.color = 'var(--text-main)';
        }
      }}
      onMouseLeave={(e) => {
        if (!props.disabled) {
          if (variant === 'primary') e.currentTarget.style.backgroundColor = 'var(--primary)';
          if (variant === 'secondary') {
            e.currentTarget.style.backgroundColor = 'var(--surface)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }
          if (variant === 'outline') e.currentTarget.style.borderColor = 'var(--border)';
          if (variant === 'ghost') e.currentTarget.style.color = 'var(--text-muted)';
        }
      }}
    >
      {children}
    </button>
  );
}
