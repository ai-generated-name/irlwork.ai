import React from 'react'

const STEP_POSITIONS = {
  open:           0,
  assigned:       25,
  in_progress:    50,
  in_review:      75,
  pending_review: 75,
  completed:      100,
  approved:       100,
  paid:           100,
}

const STEPS = ['Posted', 'Assigned', 'Active', 'Review', 'Paid']

export function TaskProgress({ status }) {
  const pct = STEP_POSITIONS[status] ?? 0
  const currIdx = Math.round(pct / 25)

  return (
    <div style={{ padding: '2px 16px 14px' }}>
      {/* Rail */}
      <div style={{
        position: 'relative',
        height: '3px',
        background: '#E5DDD3',
        borderRadius: '3px',
        marginBottom: '8px',
        overflow: 'visible',
      }}>
        {/* Fill */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${pct}%`,
          background: 'var(--ink)',
          borderRadius: '3px',
        }} />
        {/* Thumb */}
        {pct > 0 && pct < 100 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            left: `${pct}%`,
            marginLeft: '-4.5px',
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background: 'var(--ink)',
            boxShadow: '0 0 0 3px white, 0 0 0 4px rgba(17,16,16,0.12)',
          }} />
        )}
      </div>
      {/* Labels */}
      <div style={{ display: 'flex' }}>
        {STEPS.map((label, i) => (
          <span key={label} style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '8px',
            fontWeight: i === currIdx ? 500 : 400,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: i < currIdx ? 'var(--ink2)' : i === currIdx ? 'var(--ink)' : 'var(--ink3)',
            flex: 1,
            textAlign: i === 0 ? 'left' : i === STEPS.length - 1 ? 'right' : 'center',
          }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default TaskProgress
