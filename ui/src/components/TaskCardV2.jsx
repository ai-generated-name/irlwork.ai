import React from 'react';
import { Button } from './ui';


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
  const isOpen = task.task_type === 'open';
  const quantity = task.quantity || 1;
  const spotsFilled = task.spots_filled || (task.human_ids ? task.human_ids.length : (task.human_id ? 1 : 0));
  const spotsRemaining = Math.max(0, quantity - spotsFilled);
  const agentName = task.is_anonymous ? 'AI Agent' : (task.agent?.name || task.agent_name || null);
  const durationHours = task.duration_hours || task.duration;

  // Build meta string: dot-separated
  const metaParts = [];
  if (task.is_remote) metaParts.push('Remote');
  else if (task.location || task.city) metaParts.push(task.location || task.city);
  if (durationHours) metaParts.push(`${durationHours}h`);
  if (formatTimeAgo(task.created_at)) metaParts.push(formatTimeAgo(task.created_at));
  if (agentName) metaParts.push(`by ${agentName}`);

  // Category emoji map for thumbnail
  const CATEGORY_EMOJIS = {
    delivery: '\uD83D\uDCE6', photography: '\uD83D\uDCF7', 'data-collection': '\uD83D\uDCCA',
    data_collection: '\uD83D\uDCCA', errands: '\uD83C\uDFC3', cleaning: '\u2728',
    moving: '\uD83D\uDE9A', manual_labor: '\uD83D\uDD27', inspection: '\uD83D\uDD0D',
    'tech-setup': '\uD83D\uDCBB', tech: '\uD83D\uDCBB', translation: '\uD83C\uDF10',
    verification: '\u2705', general: '\uD83D\uDCCB', other: '\uD83D\uDCCB',
  };
  const emoji = CATEGORY_EMOJIS[task.category] || '\uD83D\uDCCB';

  return (
    <div
      className={`task-card-v2 ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={() => onSelect(task.id)}
      onMouseEnter={() => onHover(task.id)}
      onMouseLeave={() => onHover(null)}
      style={{ padding: '14px 16px' }}
    >
      {/* 3-column flex row: [thumbnail] [content] [right column] */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {/* Thumbnail */}
        <div style={{
          width: 56, height: 56, borderRadius: 11, flexShrink: 0,
          background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 24,
        }}>
          {emoji}
        </div>

        {/* Content column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <h3 style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
            margin: 0, lineHeight: 1.3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            fontFamily: "var(--font-display)",
          }}>
            {task.title}
          </h3>
          {/* Description */}
          {task.description && (
            <p style={{
              fontSize: 10, color: 'rgba(26,20,16,0.50)', margin: '2px 0 0',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              lineHeight: 1.4,
            }}>
              {task.description}
            </p>
          )}
          {/* Meta: dot-separated */}
          <p style={{
            fontSize: 10, color: 'rgba(26,20,16,0.50)', margin: '3px 0 0',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {metaParts.join(' \u00B7 ')}
          </p>
        </div>

        {/* Right column: price + apply pill */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          {/* Price */}
          <span style={{
            fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
            fontFamily: "var(--font-mono)",
            letterSpacing: '-0.02em',
          }}>
            ${task.budget || 0}
          </span>
          {/* Apply pill */}
          {hasApplied ? (
            <span style={{
              padding: '4px 12px', borderRadius: 30, fontSize: 11, fontWeight: 600,
              background: 'rgba(26,158,106,0.09)', color: '#1A9E6A',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Applied
            </span>
          ) : (quantity > 1 && spotsRemaining === 0) ? (
            <span style={{
              padding: '4px 12px', borderRadius: 30, fontSize: 11, fontWeight: 600,
              background: 'rgba(220,200,180,0.15)', color: 'rgba(26,20,16,0.28)',
            }}>
              Filled
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onApply(task); }}
              aria-label={`Apply to ${task.title}`}
              style={{
                padding: '4px 12px', borderRadius: 30, fontSize: 11, fontWeight: 600,
                // eslint-disable-next-line irlwork/no-orange-outside-button -- apply pill uses brand accent
                background: '#E8703D', color: 'white', border: 'none', cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              Apply
            </button>
          )}
        </div>
      </div>

      {/* Report button - positioned subtly */}
      {showReport && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onReport(task); }}
            title="Report this task"
            className="!p-1 !min-h-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </Button>
        </div>
      )}
    </div>
  );
}
