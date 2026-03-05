import React from 'react'

const TIER_CONFIG = {
  builder: { label: 'Builder', color: '#E8703D', bg: 'rgba(232,112,61,0.09)' },
  pro: { label: 'Pro', color: '#6D4FC2', bg: 'rgba(109,79,194,0.09)' },
}

export default function TierBadge({ tier, size = 'sm' }) {
  if (!tier || tier === 'free') return null

  const config = TIER_CONFIG[tier]
  if (!config) return null

  const fontSize = size === 'xs' ? 9 : size === 'sm' ? 10 : 11
  const padding = size === 'xs' ? '2px 7px' : size === 'sm' ? '3px 9px' : '3px 11px'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding,
      background: config.bg,
      color: config.color,
      borderRadius: 30,
      fontSize,
      fontFamily: "'Sora', sans-serif",
      fontWeight: 600,
      letterSpacing: '0.03em',
      border: `1px solid ${config.color}22`,
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: config.color,
        flexShrink: 0,
      }} />
      {config.label}
    </span>
  )
}
