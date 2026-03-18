import React from 'react';

const VARIANT_STYLES = {
  primary: {
    background: '#E8764B',
    color: '#fff',
    border: 'none',
    boxShadow: 'none',
  },
  secondary: {
    background: 'transparent',
    color: '#1A1A1A',
    border: '1px solid #E8E0D8',
    boxShadow: 'none',
  },
  ghost: {
    background: 'transparent',
    color: '#8C8580',
    border: 'none',
    boxShadow: 'none',
  },
  destructive: {
    background: '#D44B4B',
    color: '#fff',
    border: 'none',
    boxShadow: 'none',
  },
};

const DARK_VARIANT_STYLES = {
  primary: {
    background: '#E8764B',
    color: '#fff',
    border: 'none',
    boxShadow: 'none',
  },
  secondary: {
    background: 'rgba(255,255,255,0.10)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.20)',
    boxShadow: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.60)',
    border: 'none',
    boxShadow: 'none',
  },
  destructive: {
    background: '#D44B4B',
    color: '#fff',
    border: 'none',
    boxShadow: 'none',
  },
};

const SIZE_STYLES = {
  sm: { fontSize: 12, minHeight: 32, padding: '0 12px' },
  md: { fontSize: 14, minHeight: 36, padding: '0 16px' },
  lg: { fontSize: 14, minHeight: 44, padding: '0 24px' },
};

export default function Button({
  variant = 'primary',
  size = 'md',
  dark = false,
  children,
  className = '',
  disabled = false,
  style: styleProp = {},
  ...rest
}) {
  const styles = dark ? DARK_VARIANT_STYLES : VARIANT_STYLES;
  const variantStyle = styles[variant] || styles.primary;
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <button
      className={`irw-btn ${className}`}
      style={{
        borderRadius: 12,
        fontWeight: variant === 'primary' ? 700 : 500,
        fontFamily: "'Satoshi', sans-serif",
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
        ...variantStyle,
        ...sizeStyle,
        ...styleProp,
      }}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
