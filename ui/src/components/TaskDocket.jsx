import React from 'react'

const STATUS_COLORS = {
  open:           'rgba(17,16,16,0.18)',
  assigned:       '#E8703D',
  in_progress:    '#16A071',
  in_review:      '#6B4FBF',
  pending_review: '#6B4FBF',
  completed:      'rgba(17,16,16,0.3)',
  approved:       'rgba(17,16,16,0.3)',
  paid:           '#16A071',
  disputed:       '#DC2626',
  cancelled:      'rgba(17,16,16,0.18)',
  rejected:       '#DC2626',
}

const STATUS_LABELS = {
  open:           'Open',
  assigned:       'Assigned',
  in_progress:    'In progress',
  in_review:      'In review',
  pending_review: 'Pending review',
  completed:      'Completed',
  approved:       'Approved',
  paid:           'Paid',
  disputed:       'Disputed',
  cancelled:      'Cancelled',
  rejected:       'Rejected',
}

export function TaskDocket({ status, source }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      padding: '7px 14px',
      borderBottom: '0.5px solid var(--border)',
      background: 'rgba(0,0,0,0.016)',
    }}>
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: STATUS_COLORS[status] || 'rgba(17,16,16,0.18)',
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '9px',
        color: 'rgba(17,16,16,0.35)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        {STATUS_LABELS[status] || status}
      </span>
      {source && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '9px',
          color: 'rgba(17,16,16,0.28)',
          letterSpacing: '0.05em',
          marginLeft: 'auto',
        }}>
          via {source}
        </span>
      )}
    </div>
  )
}

export default TaskDocket
