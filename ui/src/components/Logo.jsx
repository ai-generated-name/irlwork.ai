// Logo Component for IRL Work
// Minimalist design: [irl] work.ai
// Thin black border box around "irl", clean typography

import React from 'react'

const logoStyles = {
  // Container for the full logo
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  containerHover: {
    transform: 'translateY(-1px)',
  },

  // The boxed "irl" mark
  mark: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 10px',
    border: '1.5px solid #1A1A1A',
    borderRadius: '4px',
    background: 'transparent',
    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  markHover: {
    borderWidth: '2px',
    boxShadow: '2px 2px 0 #1A1A1A',
  },
  markText: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: '14px',
    fontWeight: 700,
    color: '#1A1A1A',
    letterSpacing: '-0.02em',
    lineHeight: 1,
    textTransform: 'lowercase',
  },

  // The "work.ai" wordmark
  wordmark: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: '18px',
    fontWeight: 600,
    color: '#1A1A1A',
    letterSpacing: '-0.01em',
    lineHeight: 1,
  },

  // Light variant (for dark backgrounds) - keeping black as requested
  markLight: {
    border: '1.5px solid #1A1A1A',
  },
  markTextLight: {
    color: '#1A1A1A',
  },
  wordmarkLight: {
    color: '#1A1A1A',
  },
}

// Size presets
const sizes = {
  sm: {
    mark: { padding: '6px 8px' },
    markText: { fontSize: '12px' },
    wordmark: { fontSize: '15px' },
    gap: '8px',
  },
  md: {
    mark: { padding: '8px 10px' },
    markText: { fontSize: '14px' },
    wordmark: { fontSize: '18px' },
    gap: '10px',
  },
  lg: {
    mark: { padding: '10px 14px' },
    markText: { fontSize: '18px' },
    wordmark: { fontSize: '22px' },
    gap: '12px',
  },
}

/**
 * IRL Work Logo Component
 *
 * @param {Object} props
 * @param {'icon' | 'full'} props.variant - 'icon' for just [irl], 'full' for [irl] work.ai
 * @param {'sm' | 'md' | 'lg'} props.size - Size preset
 * @param {boolean} props.light - Use light variant (for dark backgrounds)
 * @param {string} props.href - Optional link URL
 * @param {Object} props.style - Additional styles to merge
 * @param {Function} props.onClick - Optional click handler
 */
export function Logo({
  variant = 'full',
  size = 'md',
  light = false,
  href,
  style,
  onClick,
  ...props
}) {
  const [isHovered, setIsHovered] = React.useState(false)
  const sizeStyles = sizes[size] || sizes.md

  const containerStyle = {
    ...logoStyles.container,
    gap: sizeStyles.gap,
    ...(isHovered ? logoStyles.containerHover : {}),
    ...style,
  }

  const markStyle = {
    ...logoStyles.mark,
    ...sizeStyles.mark,
    ...(light ? logoStyles.markLight : {}),
    ...(isHovered ? logoStyles.markHover : {}),
  }

  const markTextStyle = {
    ...logoStyles.markText,
    ...sizeStyles.markText,
    ...(light ? logoStyles.markTextLight : {}),
  }

  const wordmarkStyle = {
    ...logoStyles.wordmark,
    ...sizeStyles.wordmark,
    ...(light ? logoStyles.wordmarkLight : {}),
  }

  const content = (
    <>
      <div style={markStyle}>
        <span style={markTextStyle}>irl</span>
      </div>
      {variant === 'full' && (
        <span style={wordmarkStyle}>irlwork.ai</span>
      )}
    </>
  )

  const handlers = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    onClick,
    ...props,
  }

  if (href) {
    return (
      <a href={href} style={containerStyle} {...handlers}>
        {content}
      </a>
    )
  }

  return (
    <div style={containerStyle} {...handlers}>
      {content}
    </div>
  )
}

// CSS class-based version for use with landing-v4.css
export const logoClassStyles = `
/* Logo Mark - the boxed [irl] */
.logo-mark-v4 {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  border: 1.5px solid #1A1A1A;
  border-radius: 4px;
  background: transparent;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #1A1A1A;
  letter-spacing: -0.02em;
  line-height: 1;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.logo-v4:hover .logo-mark-v4 {
  border-width: 2px;
  box-shadow: 2px 2px 0 #1A1A1A;
}

/* Logo Wordmark - "work.ai" */
.logo-name-v4 {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  letter-spacing: -0.01em;
  line-height: 1;
}

/* Footer Logo Styles */
.footer-v4-logo-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  border: 1.5px solid #1A1A1A;
  border-radius: 4px;
  background: transparent;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #1A1A1A;
  letter-spacing: -0.02em;
  line-height: 1;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.footer-v4-logo:hover .footer-v4-logo-mark {
  border-width: 2px;
  box-shadow: 2px 2px 0 #1A1A1A;
}

.footer-v4-logo-name {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  letter-spacing: -0.01em;
  line-height: 1;
}
`

export default Logo
