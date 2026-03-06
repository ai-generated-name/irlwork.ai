import React from 'react';

/**
 * StatusPill — pill shape with colored dot + label
 * Three-color system: orange (open/awaiting), green (assigned/in_progress/completed/paid),
 * purple (in_review/submitted), red (disputed), neutral (cancelled/expired)
 */

const STATUS_CONFIG = {
  open:               { color: '#E8764B', bg: '#FDEEE7',                    border: 'rgba(232,118,75,0.18)' },
  awaiting_worker:    { color: '#E8764B', bg: '#FDEEE7',                    border: 'rgba(232,118,75,0.18)' },
  awaiting:           { color: '#E8764B', bg: '#FDEEE7',                    border: 'rgba(232,118,75,0.18)' },
  pending_acceptance: { color: '#E8764B', bg: '#FDEEE7',                    border: 'rgba(232,118,75,0.18)' },
  applied:            { color: '#E8764B', bg: '#FDEEE7',                    border: 'rgba(232,118,75,0.18)' },
  assigned:           { color: '#2D7A3A', bg: 'rgba(45,122,58,0.09)',       border: 'rgba(45,122,58,0.18)' },
  accepted:           { color: '#2D7A3A', bg: 'rgba(45,122,58,0.09)',       border: 'rgba(45,122,58,0.18)' },
  in_progress:        { color: '#2D7A3A', bg: 'rgba(45,122,58,0.09)',       border: 'rgba(45,122,58,0.18)' },
  completed:          { color: '#2D7A3A', bg: 'rgba(45,122,58,0.09)',       border: 'rgba(45,122,58,0.18)' },
  approved:           { color: '#2D7A3A', bg: 'rgba(45,122,58,0.09)',       border: 'rgba(45,122,58,0.18)' },
  paid:               { color: '#2D7A3A', bg: 'rgba(45,122,58,0.09)',       border: 'rgba(45,122,58,0.18)' },
  resolved:           { color: '#2D7A3A', bg: 'rgba(45,122,58,0.09)',       border: 'rgba(45,122,58,0.18)' },
  new:                { color: '#2D7A3A', bg: 'rgba(45,122,58,0.09)',       border: 'rgba(45,122,58,0.18)' },
  pending_review:     { color: '#6D4FC2', bg: 'rgba(109,79,194,0.09)',      border: 'rgba(109,79,194,0.18)' },
  in_review:          { color: '#6D4FC2', bg: 'rgba(109,79,194,0.09)',      border: 'rgba(109,79,194,0.18)' },
  submitted:          { color: '#6D4FC2', bg: 'rgba(109,79,194,0.09)',      border: 'rgba(109,79,194,0.18)' },
  pending:            { color: '#6D4FC2', bg: 'rgba(109,79,194,0.09)',      border: 'rgba(109,79,194,0.18)' },
  disputed:           { color: '#D44B4B', bg: 'rgba(212,75,75,0.08)',       border: 'rgba(212,75,75,0.18)' },
  rejected:           { color: '#D44B4B', bg: 'rgba(212,75,75,0.08)',       border: 'rgba(212,75,75,0.18)' },
  overdue:            { color: '#D44B4B', bg: 'rgba(212,75,75,0.08)',       border: 'rgba(212,75,75,0.18)' },
  refunded:           { color: '#D4963F', bg: 'rgba(212,150,63,0.08)',      border: 'rgba(212,150,63,0.18)' },
  cancelled:          { color: '#8C8580', bg: 'rgba(140,133,128,0.05)',     border: '#E8E0D8' },
  expired:            { color: '#8C8580', bg: 'rgba(140,133,128,0.05)',     border: '#E8E0D8' },
  dismissed:          { color: '#8C8580', bg: 'rgba(140,133,128,0.05)',     border: '#E8E0D8' },
};

const DEFAULT_CONFIG = { color: '#8C8580', bg: 'rgba(140,133,128,0.05)', border: '#E8E0D8' };

function formatStatus(status) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function StatusPill({ status, size = 'md', color, children }) {
  // Custom color override
  if (color && typeof color === 'object') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 9px',
          borderRadius: 9999,
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "'Satoshi', system-ui, -apple-system, sans-serif",
          backgroundColor: color.bg,
          color: color.text,
          border: `1px solid ${color.border || 'transparent'}`,
        }}
      >
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: color.text, flexShrink: 0,
        }} />
        {children || formatStatus(status)}
      </span>
    );
  }

  const config = STATUS_CONFIG[status] || DEFAULT_CONFIG;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 9px',
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 600,
        fontFamily: "'Sora', sans-serif",
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
      }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: config.color, flexShrink: 0,
      }} />
      {children || formatStatus(status)}
    </span>
  );
}
