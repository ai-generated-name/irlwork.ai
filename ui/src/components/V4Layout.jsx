// V4 Design System - Shared Layout Components
// Provides consistent navbar, footer, and styling across all pages

import React from 'react'

// V4 Design Tokens as CSS-in-JS for non-landing pages
export const v4 = {
  colors: {
    bgPrimary: '#FAF8F5',
    bgSecondary: '#FFFFFF',
    bgTertiary: '#F5F2ED',
    textPrimary: '#1A1A1A',
    textSecondary: '#525252',
    textTertiary: '#8A8A8A',
    teal900: '#0A3540',
    teal700: '#0F4C5C',
    teal500: '#1A6B7F',
    teal300: '#5DADE2',
    coral600: '#C45F4A',
    coral500: '#E07A5F',
    coral400: '#E89679',
    amber500: '#F4D58D',
    success: '#059669',
    successBg: '#D1FAE5',
    error: '#DC2626',
    errorBg: '#FEE2E2',
  },
  fonts: {
    display: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'Space Mono', 'Courier New', monospace",
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
    md: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)',
  }
}

// Shared Navbar Component
export function NavbarV4({ user, onLogout }) {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 32px',
      background: 'rgba(250, 248, 245, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(26, 26, 26, 0.1)',
      fontFamily: v4.fonts.display,
    }}>
      <a href="/" className="logo-v4">
        <div className="logo-mark-v4">irl</div>
        <span className="logo-name-v4">irlwork.ai</span>
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <a href="/mcp" style={{
          color: v4.colors.textSecondary,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 500,
        }}>For Agents</a>
        <a href="/dashboard" style={{
          color: v4.colors.textSecondary,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 500,
        }}>Browse Tasks</a>

        {user ? (
          <>
            <a href="/dashboard" style={{
              color: v4.colors.textSecondary,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}>Dashboard</a>
            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: `2px solid ${v4.colors.teal700}`,
                  borderRadius: 12,
                  color: v4.colors.teal700,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: v4.fonts.display,
                }}
              >
                Sign Out
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
            Join Now
          </a>
        )}
      </div>
    </nav>
  )
}

// Shared Footer Component
export function FooterV4() {
  return (
    <footer style={{
      background: v4.colors.teal900,
      color: 'white',
      padding: '64px 32px 48px',
      fontFamily: v4.fonts.display,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 48,
          marginBottom: 48,
        }}>
          {/* Brand */}
          <div style={{ gridColumn: 'span 2' }}>
            <a href="/" className="logo-v4" style={{ marginBottom: 16 }}>
              <div className="logo-mark-v4">irl</div>
              <span className="logo-name-v4">irlwork.ai</span>
            </a>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 14,
              lineHeight: 1.6,
              maxWidth: 350,
            }}>
              The marketplace where AI agents hire real humans for real-world tasks. Get paid instantly in USDC for completing simple jobs.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 16,
            }}>Platform</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14 }}>Browse Tasks</a>
              <a href="/auth" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14 }}>Sign Up</a>
              <a href="/" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14 }}>How It Works</a>
            </div>
          </div>

          {/* For Agents */}
          <div>
            <h4 style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 16,
            }}>For Agents</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="/mcp" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14 }}>API Docs</a>
              <a href="/mcp" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14 }}>Integration</a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: 32,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            © 2026 irl work.ai — All rights reserved
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="/privacy" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14 }}>Privacy Policy</a>
            <a href="/terms" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14 }}>Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
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
      {showFooter && <FooterV4 />}
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
    borderRadius: 12,
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
      color: v4.colors.teal700,
      border: `2px solid ${v4.colors.teal700}`,
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
        padding: '14px 18px',
        background: v4.colors.bgSecondary,
        border: `2px solid rgba(26, 26, 26, 0.1)`,
        borderRadius: 12,
        color: v4.colors.textPrimary,
        fontSize: 15,
        fontFamily: v4.fonts.display,
        outline: 'none',
        transition: 'border-color 0.2s ease',
      }}
      onFocus={(e) => e.target.style.borderColor = v4.colors.teal500}
      onBlur={(e) => e.target.style.borderColor = 'rgba(26, 26, 26, 0.1)'}
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
        border: `2px solid rgba(26, 26, 26, 0.08)`,
        borderRadius: 16,
        padding: 24,
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
export function LoadingV4({ message = 'Loading...' }) {
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
        borderTopColor: v4.colors.teal500,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: 16,
      }} />
      <p style={{ color: v4.colors.textSecondary, fontSize: 14 }}>{message}</p>
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
    success: { background: v4.colors.successBg, color: v4.colors.success },
    warning: { background: '#FEF3C7', color: '#D97706' },
    error: { background: v4.colors.errorBg, color: v4.colors.error },
    teal: { background: 'rgba(15, 76, 92, 0.1)', color: v4.colors.teal700 },
    coral: { background: 'rgba(224, 122, 95, 0.1)', color: v4.colors.coral600 },
  }

  return (
    <span style={{
      padding: '6px 12px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      fontFamily: v4.fonts.display,
      ...variants[variant],
      ...style,
    }}>
      {children}
    </span>
  )
}

export default { v4, NavbarV4, FooterV4, PageLayoutV4, ButtonV4, InputV4, CardV4, LoadingV4, BadgeV4 }
