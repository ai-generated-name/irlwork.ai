import React from 'react';

const VARIANT_STYLES = {
  default: {},
  accent:  { background: '#FDEEE7', borderColor: 'rgba(232,118,75,0.18)' },
  success: { background: 'rgba(45,122,58,0.09)', borderColor: 'rgba(45,122,58,0.18)' },
  info:    { background: '#EFF6FF', borderColor: 'rgba(37,99,235,0.18)' },
  warning: { background: 'rgba(212,150,63,0.08)', borderColor: 'rgba(212,150,63,0.18)' },
  muted:   { background: '#F5EFE7', borderColor: '#F0EAE2' },
};

const PADDING_STYLES = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 20,
};

function handleCardKeyDown(e, rest) {
  if ((e.key === 'Enter' || e.key === ' ') && rest.onClick) {
    e.preventDefault();
    rest.onClick(e);
  }
}

export default function Card({
  children,
  variant = 'default',
  interactive = false,
  hoverEffect = 'shadow',
  padding = 'md',
  dark = false,
  className = '',
  style: styleProp = {},
  ...rest
}) {
  const interactiveProps = interactive
    ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => handleCardKeyDown(e, rest),
      }
    : {};

  // Dark mode
  if (dark) {
    return (
      <div
        className={`${interactive ? 'cursor-pointer' : ''} ${className}`}
        style={{
          borderRadius: 16,
          padding: 16,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.10)',
          transition: 'all 0.2s ease',
          ...(interactive ? { cursor: 'pointer' } : {}),
          ...styleProp,
        }}
        {...interactiveProps}
        {...rest}
      >
        {children}
      </div>
    );
  }

  const variantStyle = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const paddingValue = PADDING_STYLES[padding] ?? PADDING_STYLES.md;

  return (
    <div
      className={`${interactive ? 'irw-card cursor-pointer' : ''} ${className}`}
      style={{
        borderRadius: 16,
        padding: paddingValue,
        background: variantStyle.background || '#FFFFFF',
        border: `1px solid ${variantStyle.borderColor || '#E8E0D8'}`,
        boxShadow: 'none',
        transition: 'all 0.2s ease',
        ...styleProp,
      }}
      {...interactiveProps}
      {...rest}
    >
      {children}
    </div>
  );
}
