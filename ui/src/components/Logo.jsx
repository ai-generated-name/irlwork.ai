import React from 'react'

/**
 * IRL Work Logo Component — Brand v2
 *
 * Renders the "irlwork" text with an orange cursor bar.
 *
 * @param {Object} props
 * @param {'icon' | 'wordmark' | 'header'} props.variant
 *   - 'icon'     → compact "irl" + cursor (sidebar collapsed, tab bar)
 *   - 'wordmark' → large "irlwork" + cursor (login, splash, onboarding)
 *   - 'header'   → medium "irlwork" + cursor (top bar, sidebar expanded)
 * @param {'dark' | 'light'} props.theme
 *   - 'dark'  → white text (for dark backgrounds)
 *   - 'light' → dark text (for light backgrounds)
 * @param {string} props.className — extra wrapper classes
 */
export function Logo({ variant = 'icon', theme = 'dark', className = '' }) {
  const textColor = theme === 'dark' ? 'text-white' : 'text-text-primary'

  if (variant === 'icon') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className={`font-mono font-bold text-lg leading-none ${textColor}`}>
          irl
        </span>
        <span className="inline-block w-[2px] h-[14px] bg-accent-orange rounded-sm ml-px relative top-[1px]" />
      </div>
    )
  }

  if (variant === 'wordmark') {
    return (
      <div className={`flex items-center ${className}`}>
        <span className={`font-mono font-bold text-3xl leading-none ${textColor}`}>
          irlwork
        </span>
        <span className="inline-block w-[3px] h-[22px] bg-accent-orange rounded-sm ml-0.5 relative top-[2px]" />
      </div>
    )
  }

  // header variant — compact for top bar
  return (
    <div className={`flex items-center ${className}`}>
      <span className={`font-mono font-bold text-[22px] leading-none ${textColor}`}>
        irlwork
      </span>
      <span className="inline-block w-[2px] h-[16px] bg-accent-orange rounded-sm ml-px relative top-[1px]" />
    </div>
  )
}

export default Logo
