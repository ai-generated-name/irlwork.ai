import React from 'react';

const CATEGORY_ICONS = {
  delivery: '📦',
  photography: '📸',
  'data-collection': '📊',
  errands: '🏃',
  'tech-setup': '💻',
  translation: '🌐',
  verification: '✅',
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
  const categoryLabel = task.category?.replace('-', ' ') || 'General';

  return (
    <div
      className={`task-card-v2 ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={() => onSelect(task.id)}
      onMouseEnter={() => onHover(task.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Header row: Category + Distance */}
      <div className="task-card-v2-header">
        <div className="task-card-v2-category">
          <span className="task-card-v2-category-icon">{categoryIcon}</span>
          <span className="task-card-v2-category-label">{categoryLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {task.distance_km != null && (
            <div className="task-card-v2-distance">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {task.distance_km.toFixed(1)} km
            </div>
          )}
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
                color: '#8A8A8A',
                transition: 'color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#DC2626'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#8A8A8A'; }}
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

      {/* Budget + Duration row */}
      <div className="task-card-v2-meta-row">
        <div className="task-card-v2-budget">
          <span className="task-card-v2-budget-amount">${task.budget || 0}</span>
          <span className="task-card-v2-budget-label">USDC</span>
        </div>
        {task.duration && (
          <div className="task-card-v2-duration">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {task.duration}
          </div>
        )}
      </div>

      {/* Location + Escrow row */}
      <div className="task-card-v2-meta-row">
        <div className="task-card-v2-location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {task.location || task.city || 'Location not specified'}
        </div>
        <div className={`task-card-v2-escrow ${task.escrow_status === 'funded' ? 'funded' : 'unfunded'}`}>
          {task.escrow_status === 'funded' ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Funded
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
              </svg>
              Unfunded
            </>
          )}
        </div>
      </div>

      {/* Footer: Posted time + Apply button */}
      <div className="task-card-v2-footer">
        <span className="task-card-v2-posted">
          Posted {formatTimeAgo(task.created_at)}
        </span>
        <button
          className={`task-card-v2-apply-btn ${hasApplied ? 'applied' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!hasApplied) onApply(task);
          }}
          disabled={hasApplied}
        >
          {hasApplied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Applied
            </>
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
