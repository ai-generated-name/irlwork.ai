import React from 'react'

const TIER_CONFIG = {
  builder: { label: 'Builder', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  pro: { label: 'Pro', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
}

export default function TierBadge({ tier, size = 'sm' }) {
  if (!tier || tier === 'free') return null

  const config = TIER_CONFIG[tier]
  if (!config) return null

  const fontSize = size === 'xs' ? 10 : size === 'sm' ? 11 : 12
  const padding = size === 'xs' ? '1px 6px' : size === 'sm' ? '2px 8px' : '3px 10px'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding,
      background: config.bg,
      color: config.color,
      borderRadius: 999,
      fontSize,
      fontWeight: 600,
      letterSpacing: '0.03em',
      border: `1px solid ${config.color}33`,
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
    }}>
      {config.label}
    </span>
  )
}
