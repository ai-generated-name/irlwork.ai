import React from 'react'

/**
 * IRL Work Logo Component — v9
 *
 * Wordmark uses Courier Prime Bold (only place in the app).
 * Cursor blinks orange — the only decorative orange in chrome.
 *
 * @param {'icon' | 'wordmark' | 'header'} props.variant
 * @param {'dark' | 'light'} props.theme
 * @param {string} props.className
 */
export function Logo({ variant = 'icon', theme = 'dark', className = '' }) {
  const textColor = theme === 'dark' ? '#FFFFFF' : 'var(--ink)'

  const cursorStyle = {
    display: 'inline-block',
    background: 'var(--orange)',
    borderRadius: '1px',
    position: 'relative',
    animation: 'cursorBlink 1.1s step-end infinite',
  }

  if (variant === 'icon') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span style={{
          fontFamily: "'Courier Prime', monospace",
          fontWeight: 700,
          fontSize: '18px',
          color: textColor,
          letterSpacing: '0.01em',
          lineHeight: 1,
        }}>
          irl
        </span>
        <span style={{ ...cursorStyle, width: '2px', height: '14px', marginLeft: '1px', top: '1px' }} />
      </div>
    )
  }

  if (variant === 'wordmark') {
    return (
      <div className={`flex items-center ${className}`}>
        <span style={{
          fontFamily: "'Courier Prime', monospace",
          fontWeight: 700,
          fontSize: '28px',
          color: textColor,
          letterSpacing: '0.01em',
          lineHeight: 1,
        }}>
          irlwork
        </span>
        <span style={{ ...cursorStyle, width: '3px', height: '22px', marginLeft: '1px', top: '2px' }} />
      </div>
    )
  }

  // header variant
  return (
    <div className={`flex items-center ${className}`}>
      <span style={{
        fontFamily: "'Courier Prime', monospace",
        fontWeight: 700,
        fontSize: '20px',
        color: textColor,
        letterSpacing: '0.01em',
        lineHeight: 1,
      }}>
        irlwork
      </span>
      <span style={{ ...cursorStyle, width: '2.5px', height: '16px', marginLeft: '1px', top: '1px' }} />
    </div>
  )
}

export default Logo
