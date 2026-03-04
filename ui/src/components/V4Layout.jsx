// V4 Design System - Shared Layout Components
// Provides consistent navbar, footer, and styling across all pages

import React, { useState, useEffect } from 'react'
import MarketingFooter from './Footer'
import { Logo } from './Logo'
import LanguageSelector from './LanguageSelector'
import { useLanguage } from '../context/LanguageContext'

// V4 Design Tokens as CSS-in-JS for non-landing pages
export const v4 = {
  colors: {
    bgPrimary: '#FAFAF8',
    bgSecondary: '#FFFFFF',
    bgTertiary: '#F5F3F0',
    textPrimary: '#1A1A1A',
    textSecondary: '#333333',
    textTertiary: '#888888',
    textMuted: '#AAAAAA',
    textOnDark: '#DDDDDD',
    // Legacy teal names remapped to orange accent
    teal900: '#D4703A',
    teal700: '#E8853D',
    teal500: '#E8853D',
    teal300: '#FFF3EB',
    coral600: '#D4703A',
    coral500: '#E8853D',
    coral400: '#FFF3EB',
    orange: '#E8853D',
    orangeHover: '#D4703A',
    orangeLight: '#FFF3EB',
    amber500: '#FEBC2E',
    success: '#16A34A',
    successBg: 'rgba(22, 163, 74, 0.08)',
    error: '#FF5F57',
    errorBg: 'rgba(255, 95, 87, 0.1)',
  },
  fonts: {
    display: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'DM Mono', 'SF Mono', 'Fira Code', monospace",
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.04)',
    md: '0 1px 4px rgba(0, 0, 0, 0.02), 0 8px 40px rgba(0, 0, 0, 0.035)',
    lg: '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.1)',
  }
}

// Shared Navbar Component
export function NavbarV4({ user, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useLanguage()

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('mobile-nav-open')
    } else {
      document.body.classList.remove('mobile-nav-open')
    }
    return () => document.body.classList.remove('mobile-nav-open')
  }, [mobileMenuOpen])

  return (
    <nav className="navbar-v4" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 32px',
      background: 'rgba(250, 250, 248, 0.9)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
      fontFamily: v4.fonts.display,
    }}>
      <a href="/" className="logo-v4" style={{ textDecoration: 'none' }}>
        <Logo variant="header" theme="light" />
      </a>

      {/* Mobile hamburger toggle */}
      <button
        className="navbar-v4-mobile-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle navigation menu"
      >
        {mobileMenuOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      <div className={`navbar-v4-links${mobileMenuOpen ? ' open' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <a href="/connect-agent" style={{
          color: v4.colors.textSecondary,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 500,
        }}>{t('nav.forAgents')}</a>
        <a href="/dashboard" style={{
          color: v4.colors.textSecondary,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 500,
        }}>{t('nav.browseTasks')}</a>

        <LanguageSelector />

        {user ? (
          <>
            <a href="/dashboard" style={{
              color: v4.colors.textSecondary,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}>{t('nav.dashboard')}</a>
            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: 10,
                  color: v4.colors.textPrimary,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: v4.fonts.display,
                }}
              >
                {t('nav.signOut')}
              </button>
            )}
          </>
        ) : (
          <a href="/auth" style={{
            padding: '10px 20px',
            background: v4.colors.coral500,
            border: 'none',
            borderRadius: 12,
            color: 'white',
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
            boxShadow: v4.shadows.md,
          }}>
            {t('nav.joinNow')}
          </a>
        )}
      </div>
    </nav>
  )
}

// Page Layout Wrapper
export function PageLayoutV4({ children, user, onLogout, showNavbar = true, showFooter = true }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: v4.colors.bgPrimary,
      fontFamily: v4.fonts.display,
      color: v4.colors.textPrimary,
    }}>
      {showNavbar && <NavbarV4 user={user} onLogout={onLogout} />}
      <main style={{ paddingTop: showNavbar ? 80 : 0 }}>
        {children}
      </main>
      {showFooter && <MarketingFooter />}
    </div>
  )
}

// V4 Button Component
export function ButtonV4({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  const baseStyles = {
    fontFamily: v4.fonts.display,
    fontWeight: 600,
    borderRadius: 10,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: disabled ? 0.5 : 1,
  }

  const sizeStyles = {
    sm: { padding: '8px 16px', fontSize: 13 },
    md: { padding: '12px 24px', fontSize: 14 },
    lg: { padding: '16px 32px', fontSize: 16 },
  }

  const variantStyles = {
    primary: {
      background: v4.colors.coral500,
      color: 'white',
      boxShadow: v4.shadows.md,
    },
    secondary: {
      background: 'transparent',
      color: v4.colors.textPrimary,
      border: '1px solid rgba(0, 0, 0, 0.1)',
    },
    charcoal: {
      background: '#1A1A1A',
      color: '#FFFFFF',
    },
    ghost: {
      background: 'transparent',
      color: v4.colors.textSecondary,
    },
    success: {
      background: v4.colors.success,
      color: 'white',
      boxShadow: v4.shadows.md,
    },
    danger: {
      background: v4.colors.error,
      color: 'white',
      boxShadow: v4.shadows.md,
    },
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
      {...props}
    >
      {children}
    </button>
  )
}

// V4 Input Component
export function InputV4({
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  ...props
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: '100%',
        padding: '10px 14px',
        background: v4.colors.bgTertiary,
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: 10,
        color: v4.colors.textPrimary,
        fontSize: 14,
        fontFamily: v4.fonts.display,
        outline: 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onFocus={(e) => { e.target.style.borderColor = '#E8853D'; e.target.style.boxShadow = '0 0 0 3px rgba(232, 133, 61, 0.1)'; }}
      onBlur={(e) => { e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'; e.target.style.boxShadow = 'none'; }}
      {...props}
    />
  )
}

// V4 Card Component
export function CardV4({ children, className = '', style = {}, ...props }) {
  return (
    <div
      style={{
        background: v4.colors.bgSecondary,
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: 14,
        padding: 16,
        boxShadow: v4.shadows.sm,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

// V4 Loading Component
export function LoadingV4({ message }) {
  const { t } = useLanguage()

  return (
    <div style={{
      minHeight: '100vh',
      background: v4.colors.bgPrimary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: v4.fonts.display,
    }}>
      <div style={{
        width: 48,
        height: 48,
        border: `4px solid ${v4.colors.bgTertiary}`,
        borderTopColor: v4.colors.orange,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: 16,
      }} />
      <p style={{ color: v4.colors.textSecondary, fontSize: 14 }}>{message || t('loading')}</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// V4 Badge Component
export function BadgeV4({ children, variant = 'default', style = {} }) {
  const variants = {
    default: { background: v4.colors.bgTertiary, color: v4.colors.textSecondary },
    success: { background: v4.colors.successBg, color: v4.colors.success, border: '1px solid rgba(22, 163, 74, 0.15)' },
    warning: { background: 'rgba(254, 188, 46, 0.1)', color: '#FEBC2E' },
    error: { background: v4.colors.errorBg, color: v4.colors.error },
    teal: { background: v4.colors.orangeLight, color: v4.colors.orange, fontFamily: v4.fonts.mono },
    coral: { background: v4.colors.orangeLight, color: v4.colors.orange, fontFamily: v4.fonts.mono },
  }

  return (
    <span style={{
      padding: '3px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: v4.fonts.display,
      ...variants[variant],
      ...style,
    }}>
      {children}
    </span>
  )
}

export default { v4, NavbarV4, PageLayoutV4, ButtonV4, InputV4, CardV4, LoadingV4, BadgeV4 }
