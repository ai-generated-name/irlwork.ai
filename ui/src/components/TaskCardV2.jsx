import React from 'react';
import { Package, Camera, BarChart3, Footprints, Monitor, Globe, CheckCircle, ClipboardList } from 'lucide-react';

const CATEGORY_ICONS = {
  delivery: '📦',
  photography: '📸',
  'data-collection': '📊',
  data_collection: '📊',
  errands: '🏃',
  cleaning: '🧹',
  moving: '🚚',
  manual_labor: '💪',
  inspection: '🔍',
  'tech-setup': '💻',
  tech: '💻',
  translation: '🌐',
  verification: '✅',
  general: '📋',
  other: '📋',
};

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatCategory(cat) {
  if (!cat) return 'General';
  return cat.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getDeadlineInfo(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const due = new Date(deadline);
  const diffMs = due - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Past deadline - shouldn't appear in browse (backend expires these), but handle gracefully
  if (diffMs < 0) return null;
  if (diffHours < 1) return { label: 'Due in < 1 hour', level: 'urgent' };
  if (diffHours < 24) return { label: `Due in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`, level: 'urgent' };
  if (diffDays <= 3) return { label: `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`, level: 'soon' };
  return { label: `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`, level: 'normal' };
}

function formatTaskId(id) {
  if (!id) return '';
  return id.substring(0, 8).toUpperCase();
}

export default function TaskCardV2({
  task,
  isSelected = false,
  isHovered = false,
  onSelect = () => {},
  onHover = () => {},
  onApply = () => {},
  hasApplied = false,
  onReport = () => {},
  showReport = false,
}) {
  const categoryIcon = CATEGORY_ICONS[task.category] || '📋';
  const categoryLabel = formatCategory(task.category);
  const isOpen = task.task_type === 'open';
  const quantity = task.quantity || 1;
  const spotsFilled = task.spots_filled || (task.human_ids ? task.human_ids.length : (task.human_id ? 1 : 0));
  const spotsRemaining = Math.max(0, quantity - spotsFilled);
  const agentName = task.is_anonymous ? 'AI Agent' : (task.agent?.name || task.agent_name || null);
  const durationHours = task.duration_hours || task.duration;

  return (
    <div
      className={`task-card-v2 ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={() => onSelect(task.id)}
      onMouseEnter={() => onHover(task.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Header row: Category + badges */}
      <div className="task-card-v2-header">
        <div className="task-card-v2-category">
          <span className="task-card-v2-category-icon">{categoryIcon}</span>
          <span className="task-card-v2-category-label">{categoryLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isOpen && (
            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'rgba(139, 92, 246, 0.1)', color: '#7C3AED', letterSpacing: '0.02em' }}>
              Open
            </span>
          )}
          {quantity > 1 && (
            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: spotsFilled >= quantity ? 'rgba(22, 163, 74, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: spotsFilled >= quantity ? '#16A34A' : '#2563EB' }}>
              {spotsFilled}/{quantity} filled
            </span>
          )}
          {task.is_remote ? (
            <div className="task-card-v2-remote-badge">
              <Globe size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Remote
            </div>
          ) : task.distance_km != null ? (
            <div className="task-card-v2-distance">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {task.distance_km.toFixed(1)} km
            </div>
          ) : null}
          {showReport && (
            <button
              className="task-card-v2-report-btn"
              onClick={(e) => { e.stopPropagation(); onReport(task); }}
              title="Report this task"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                color: '#888888',
                transition: 'color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#FF5F57'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#888888'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="task-card-v2-title">{task.title}</h3>

      {/* Description */}
      {task.description && (
        <p className="task-card-v2-description">{task.description}</p>
      )}

      {/* Skills pills */}
      {task.required_skills && task.required_skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {task.required_skills.slice(0, 3).map((skill, i) => (
            <span key={i} style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 12,
              fontSize: 11, fontWeight: 500, background: '#EEF2FF', color: '#4338CA'
            }}>{skill}</span>
          ))}
          {task.required_skills.length > 3 && (
            <span style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 12,
              fontSize: 11, fontWeight: 500, background: '#F5F5F5', color: '#333333'
            }}>+{task.required_skills.length - 3} more</span>
          )}
        </div>
      )}

      {/* Budget + Duration + Deadline row */}
      <div className="task-card-v2-meta-row">
        <div className="task-card-v2-budget">
          <span className="task-card-v2-budget-amount">${task.budget || 0}</span>
          <span className="task-card-v2-budget-label">USD</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {durationHours && (
            <div className="task-card-v2-duration">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {durationHours}h
            </div>
          )}
          {(() => {
            const info = getDeadlineInfo(task.deadline);
            if (!info) return null;
            const colors = {
              overdue: { bg: 'rgba(255, 95, 87, 0.1)', color: '#FF5F57' },
              urgent: { bg: 'rgba(254, 188, 46, 0.1)', color: '#FEBC2E' },
              soon: { bg: 'rgba(254, 188, 46, 0.1)', color: '#B45309' },
              normal: { bg: '#F0F9FF', color: '#0369A1' }
            };
            const c = colors[info.level];
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 6,
                fontSize: 12, fontWeight: 600,
                background: c.bg, color: c.color
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {info.label}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Location row */}
      <div className="task-card-v2-meta-row">
        <div className="task-card-v2-location">
          {task.is_remote ? (
            <>
              <Globe size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />
              {task.location || task.city ? `Remote · ${task.location || task.city}` : 'Remote — work from anywhere'}
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {task.location || task.city || 'Location not specified'}
            </>
          )}
        </div>
        {task.applicant_count > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {task.applicant_count} applied
          </span>
        )}
      </div>

      {/* Footer: Posted time + Agent + Apply */}
      <div className="task-card-v2-footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="task-card-v2-posted">
            Posted {formatTimeAgo(task.created_at)}
          </span>
          {agentName && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              by {agentName}
            </span>
          )}
        </div>
        <button
          className={`task-card-v2-apply-btn ${hasApplied ? 'applied' : (quantity > 1 && spotsRemaining === 0) ? 'filled' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!hasApplied && !(quantity > 1 && spotsRemaining === 0)) onApply(task);
          }}
          disabled={hasApplied || (quantity > 1 && spotsRemaining === 0)}
          aria-label={hasApplied ? 'Already applied' : (quantity > 1 && spotsRemaining === 0) ? 'All spots filled' : `Apply to ${task.title}`}
        >
          {hasApplied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Applied
            </>
          ) : (quantity > 1 && spotsRemaining === 0) ? (
            'Filled'
          ) : (
            <>
              Apply
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
