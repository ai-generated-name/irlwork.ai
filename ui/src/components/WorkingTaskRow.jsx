import React from 'react'
import { StatusPill } from './ui'

/**
 * WorkingTaskRow — Dense row layout for Working mode task browsing.
 * Workers scan fast — title + status + pay at a glance.
 */
export function WorkingTaskRow({ task, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--surface)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Satoshi', sans-serif",
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
          marginBottom: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <StatusPill status={task.status} />
          {task.location && (
            <span style={{
              fontFamily: "'Satoshi', sans-serif",
              fontSize: '11px',
              color: 'var(--ink3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {task.location}
            </span>
          )}
        </div>
      </div>
      <div style={{
        fontFamily: "'Satoshi', sans-serif",
        fontSize: '20px',
        fontWeight: 800,
        color: 'var(--orange)',
        letterSpacing: '-0.04em',
        marginLeft: '16px',
        flexShrink: 0,
      }}>
        ${task.budget || 0}
      </div>
    </div>
  )
}

/**
 * WorkingTaskList — Wrapper that renders WorkingTaskRow items in a card container.
 */
export function WorkingTaskList({ tasks, onSelect }) {
  if (!tasks || tasks.length === 0) return null
  return (
    <div className="working-task-list">
      {tasks.map(task => (
        <WorkingTaskRow
          key={task.id}
          task={task}
          onClick={onSelect ? () => onSelect(task) : undefined}
        />
      ))}
    </div>
  )
}

export default WorkingTaskRow
