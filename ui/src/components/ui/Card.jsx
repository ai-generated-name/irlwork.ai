import React from 'react';

const VARIANT_STYLES = {
  default: {},
  accent:  { background: '#FDEEE6', borderColor: 'rgba(232,112,61,0.18)' },
  success: { background: 'rgba(26,158,106,0.09)', borderColor: 'rgba(26,158,106,0.18)' },
  info:    { background: '#EFF6FF', borderColor: 'rgba(37,99,235,0.18)' },
  warning: { background: 'rgba(212,160,23,0.08)', borderColor: 'rgba(212,160,23,0.18)' },
  muted:   { background: 'rgba(220,200,180,0.15)', borderColor: 'rgba(220,200,180,0.25)' },
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
          borderRadius: 20,
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
        borderRadius: 20,
        padding: paddingValue,
        background: variantStyle.background || '#FFFFFF',
        border: `1px solid ${variantStyle.borderColor || 'rgba(220,200,180,0.35)'}`,
        boxShadow: '0 4px 24px rgba(200,150,100,0.08), 0 1px 0 rgba(255,255,255,0.9) inset',
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
