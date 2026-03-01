import React from 'react';

const VARIANT_STYLES = {
  default: 'bg-white border-[#ECECEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
  accent: 'bg-[#FFF7ED] border-[#FDBA74]',
  success: 'bg-[#F0FDF4] border-[#BBF7D0]',
  info: 'bg-[#EFF6FF] border-[#BFDBFE]',
  warning: 'bg-[#FEFCE8] border-[#FDE68A]',
  muted: 'bg-[#F3F4F6] border-[#E5E7EB]',
};

const PADDING_STYLES = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

const HOVER_STYLES = {
  shadow: 'hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] cursor-pointer transition-shadow',
  lift: 'hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] cursor-pointer transition-all',
  glow: 'hover:shadow-[0_0_12px_rgba(232,133,61,0.15)] cursor-pointer transition-shadow',
  border: 'hover:border-[#E8853D] cursor-pointer transition-colors',
};

const DARK_HOVER = 'hover:bg-white/10 cursor-pointer transition-colors';

export default function Card({
  children,
  variant = 'default',
  interactive = false,
  hoverEffect = 'shadow',
  padding = 'md',
  dark = false,
  className = '',
  ...rest
}) {
  // Dark mode: preserve legacy behavior exactly
  if (dark) {
    return (
      <div
        className={`rounded-[14px] p-5 border bg-white/5 border-white/10 ${
          interactive ? DARK_HOVER : ''
        } ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  }

  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const paddingClass = PADDING_STYLES[padding] || PADDING_STYLES.md;
  const hoverClass = interactive
    ? (HOVER_STYLES[hoverEffect] || HOVER_STYLES.shadow)
    : '';

  return (
    <div
      className={`rounded-[14px] border ${variantClass} ${paddingClass} ${hoverClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
