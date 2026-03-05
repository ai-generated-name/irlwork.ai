import React from 'react';

/**
 * v16 StatusPill — pill shape with colored dot + label
 * Three-color system: orange (open/awaiting), green (assigned/in_progress/completed/paid),
 * purple (in_review/submitted), red (disputed), neutral (cancelled/expired)
 */

const STATUS_CONFIG = {
  open:               { color: '#E8703D', bg: '#FDEEE6',                    border: 'rgba(232,112,61,0.18)' },
  awaiting_worker:    { color: '#E8703D', bg: '#FDEEE6',                    border: 'rgba(232,112,61,0.18)' },
  awaiting:           { color: '#E8703D', bg: '#FDEEE6',                    border: 'rgba(232,112,61,0.18)' },
  pending_acceptance: { color: '#E8703D', bg: '#FDEEE6',                    border: 'rgba(232,112,61,0.18)' },
  applied:            { color: '#E8703D', bg: '#FDEEE6',                    border: 'rgba(232,112,61,0.18)' },
  assigned:           { color: '#1A9E6A', bg: 'rgba(26,158,106,0.09)',      border: 'rgba(26,158,106,0.18)' },
  accepted:           { color: '#1A9E6A', bg: 'rgba(26,158,106,0.09)',      border: 'rgba(26,158,106,0.18)' },
  in_progress:        { color: '#1A9E6A', bg: 'rgba(26,158,106,0.09)',      border: 'rgba(26,158,106,0.18)' },
  completed:          { color: '#1A9E6A', bg: 'rgba(26,158,106,0.09)',      border: 'rgba(26,158,106,0.18)' },
  approved:           { color: '#1A9E6A', bg: 'rgba(26,158,106,0.09)',      border: 'rgba(26,158,106,0.18)' },
  paid:               { color: '#1A9E6A', bg: 'rgba(26,158,106,0.09)',      border: 'rgba(26,158,106,0.18)' },
  resolved:           { color: '#1A9E6A', bg: 'rgba(26,158,106,0.09)',      border: 'rgba(26,158,106,0.18)' },
  new:                { color: '#1A9E6A', bg: 'rgba(26,158,106,0.09)',      border: 'rgba(26,158,106,0.18)' },
  pending_review:     { color: '#6D4FC2', bg: 'rgba(109,79,194,0.09)',      border: 'rgba(109,79,194,0.18)' },
  in_review:          { color: '#6D4FC2', bg: 'rgba(109,79,194,0.09)',      border: 'rgba(109,79,194,0.18)' },
  submitted:          { color: '#6D4FC2', bg: 'rgba(109,79,194,0.09)',      border: 'rgba(109,79,194,0.18)' },
  pending:            { color: '#6D4FC2', bg: 'rgba(109,79,194,0.09)',      border: 'rgba(109,79,194,0.18)' },
  disputed:           { color: '#c4420a', bg: 'rgba(196,66,10,0.08)',       border: 'rgba(196,66,10,0.18)' },
  rejected:           { color: '#c4420a', bg: 'rgba(196,66,10,0.08)',       border: 'rgba(196,66,10,0.18)' },
  overdue:            { color: '#c4420a', bg: 'rgba(196,66,10,0.08)',       border: 'rgba(196,66,10,0.18)' },
  refunded:           { color: '#D4A017', bg: 'rgba(212,160,23,0.08)',      border: 'rgba(212,160,23,0.18)' },
  cancelled:          { color: 'rgba(26,20,16,0.50)', bg: 'rgba(26,20,16,0.05)', border: 'rgba(220,200,180,0.35)' },
  expired:            { color: 'rgba(26,20,16,0.50)', bg: 'rgba(26,20,16,0.05)', border: 'rgba(220,200,180,0.35)' },
  dismissed:          { color: 'rgba(26,20,16,0.50)', bg: 'rgba(26,20,16,0.05)', border: 'rgba(220,200,180,0.35)' },
};

const DEFAULT_CONFIG = { color: 'rgba(26,20,16,0.50)', bg: 'rgba(26,20,16,0.05)', border: 'rgba(220,200,180,0.35)' };

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
          borderRadius: 30,
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "'Sora', sans-serif",
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
        borderRadius: 30,
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
