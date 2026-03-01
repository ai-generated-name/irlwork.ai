import React from 'react';

const VARIANT_STYLES = {
  primary: 'bg-[#E8853D] text-white hover:bg-[#D4742E]',
  secondary: 'bg-white border border-[#1A1A1A] text-[#1A1A1A] hover:bg-gray-50',
  ghost: 'bg-transparent text-[#6B7280] hover:bg-[#F3F4F6]',
  destructive: 'bg-[#DC2626] text-white hover:bg-red-700',
};

const DARK_VARIANT_STYLES = {
  primary: 'bg-[#E8853D] text-white hover:bg-[#D4742E]',
  secondary: 'bg-white/10 border border-white/20 text-white hover:bg-white/15',
  ghost: 'bg-transparent text-white/60 hover:bg-white/10 hover:text-white',
  destructive: 'bg-[#DC2626] text-white hover:bg-red-700',
};

const SIZE_STYLES = {
  sm: 'text-xs min-h-8 px-3',
  md: 'text-sm min-h-9 px-4',
  lg: 'text-sm min-h-11 px-6',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  dark = false,
  children,
  className = '',
  disabled = false,
  ...rest
}) {
  const styles = dark ? DARK_VARIANT_STYLES : VARIANT_STYLES;

  return (
    <button
      className={`rounded-[14px] font-medium inline-flex items-center justify-center transition-colors ${
        styles[variant] || styles.primary
      } ${SIZE_STYLES[size] || SIZE_STYLES.md} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
