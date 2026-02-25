import React from 'react';
import EscrowBadge from './EscrowBadge';
import { Package, Camera, BarChart3, Footprints, Monitor, Globe, CheckCircle, ClipboardList, MapPin, CalendarDays, Bot } from 'lucide-react';

const CATEGORY_ICONS = {
  delivery: '📦',
  photography: '📸',
  data_collection: '📊',
  'data-collection': '📊',
  errands: '🏃',
  cleaning: '🧹',
  moving: '🚚',
  manual_labor: '💪',
  inspection: '🔍',
  tech: '💻',
  'tech-setup': '💻',
  translation: '🌐',
  verification: '✅',
  general: '📋',
  other: '📋',
};

const STATUS_CONFIG = {
  open: { label: 'Open', className: 'mytasks-status--open' },
  pending_acceptance: { label: 'Pending Acceptance', className: 'mytasks-status--pending' },
  accepted: { label: 'Accepted', className: 'mytasks-status--accepted' },
  assigned: { label: 'Assigned', className: 'mytasks-status--accepted' },
  in_progress: { label: 'In Progress', className: 'mytasks-status--in-progress' },
  pending_review: { label: 'Pending Review', className: 'mytasks-status--pending' },
  approved: { label: 'Approved', className: 'mytasks-status--pending' },
  completed: { label: 'Completed', className: 'mytasks-status--completed' },
  paid: { label: 'Paid', className: 'mytasks-status--paid' },
  disputed: { label: 'Disputed', className: 'mytasks-status--disputed' },
  cancelled: { label: 'Cancelled', className: 'mytasks-status--cancelled' },
};

const PLATFORM_FEE_PERCENT = 15;

function formatTaskId(id) {
  if (!id) return '';
  return id.substring(0, 8).toUpperCase();
}

function calculatePayout(budget) {
  const amount = Number(budget) || 0;
  const fee = Math.round(amount * PLATFORM_FEE_PERCENT) / 100;
  const payout = Math.round((amount - fee) * 100) / 100;
  return { fee: fee.toFixed(2), payout: payout.toFixed(2) };
}

export default function MyTaskCard({
  task,
  variant = 'active', // 'active' | 'review' | 'compact'
  onAccept,
  onDecline,
  onStartWork,
  onSubmitProof,
  onClick,
}) {
  if (!task) return null;

  const status = STATUS_CONFIG[task.status] || { label: task.status || 'Unknown', className: '' };
  const categoryIcon = CATEGORY_ICONS[task.category] || <ClipboardList size={16} />;
  const categoryLabel = task.category?.replace('-', ' ') || 'General';
  const { fee, payout } = calculatePayout(task.budget);

  // Deadline urgency
  const getUrgencyClass = () => {
    if (!task.deadline) return '';
    const diffMs = new Date(task.deadline) - new Date();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffMs < 0) return '';
    if (diffHours < 24) return 'mytasks-card--urgent';
    if (diffDays <= 3) return 'mytasks-card--soon';
    return '';
  };

  const getDaysLeft = () => {
    if (!task.deadline) return null;
    const diffMs = new Date(task.deadline) - new Date();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffMs < 0) return null;
    if (diffHours < 1) return 'Due in < 1 hour';
    if (diffHours < 24) return `Due in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    return `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  };

  const urgencyClass = getUrgencyClass();
  const daysLeftLabel = getDaysLeft();

  const handleClick = () => {
    if (onClick) onClick(task);
  };

  const handleAction = (e, action) => {
    e.stopPropagation();
    action(task.id);
  };

  // Compact variant for completed/paid tasks
  if (variant === 'compact') {
    return (
      <div className={`mytasks-card mytasks-card--compact ${urgencyClass}`} onClick={handleClick}>
        <div className="mytasks-card__row">
          <div className="mytasks-card__row-left">
            <span className={`mytasks-status ${status.className}`}>{status.label}</span>
            <h3 className="mytasks-card__title mytasks-card__title--compact">{task.title}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mytasks-card__task-id">{formatTaskId(task.id)}</span>
            <span className="mytasks-card__budget">${task.budget || 0}</span>
          </div>
        </div>
        <div className="mytasks-card__meta">
          <span className="mytasks-card__meta-item">{categoryIcon} {categoryLabel}</span>
          <span className="mytasks-card__meta-item"><MapPin size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {task.city || 'Remote'}</span>
          <span className="mytasks-card__meta-item"><CalendarDays size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {new Date(task.created_at || Date.now()).toLocaleDateString()}</span>
          <span className="mytasks-card__payout-info">
            <span className="mytasks-card__payout-label">You earn</span> ${payout}
            <span className="mytasks-card__fee-label">Fee ${fee}</span>
          </span>
          <span className="mytasks-card__arrow">→</span>
        </div>
      </div>
    );
  }

  // Full variant for active and review
  return (
    <div className={`mytasks-card ${urgencyClass}`} onClick={handleClick}>
      <div className="mytasks-card__header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className={`mytasks-status ${status.className}`}>{status.label}</span>
            <span className="mytasks-card__task-id">{formatTaskId(task.id)}</span>
          </div>
          <h3 className="mytasks-card__title">{task.title}</h3>
        </div>
        <span className="mytasks-card__budget">${task.budget || 0}</span>
      </div>

      {/* Payment breakdown */}
      <div className="mytasks-card__payment-breakdown">
        <span className="mytasks-card__payment-item">
          <span className="mytasks-card__payment-label">Platform fee:</span>
          <span className="mytasks-card__payment-value">${fee}</span>
        </span>
        <span className="mytasks-card__payment-item">
          <span className="mytasks-card__payment-label">Your payout:</span>
          <span className="mytasks-card__payment-value mytasks-card__payment-value--payout">${payout}</span>
        </span>
      </div>

      {task.description && (
        <p className="mytasks-card__description">{task.description}</p>
      )}

      <div className="mytasks-card__meta">
        <span className="mytasks-card__meta-item">{categoryIcon} {categoryLabel}</span>
        <span className="mytasks-card__meta-item"><MapPin size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {task.city || 'Remote'}</span>
        <span className="mytasks-card__meta-item"><CalendarDays size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {new Date(task.created_at || Date.now()).toLocaleDateString()}</span>
        {task.agent_name && <span className="mytasks-card__meta-item"><Bot size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {task.agent_name}</span>}
        {daysLeftLabel && (
          <span className={`mytasks-card__meta-item mytasks-card__deadline ${urgencyClass}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: '-2px' }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {' '}{daysLeftLabel}
          </span>
        )}
      </div>

      <div className="mytasks-card__footer">
        <div className="mytasks-card__actions">
          {task.status === 'pending_acceptance' && onAccept && (
            <>
              <button className="v4-btn v4-btn-primary" onClick={(e) => handleAction(e, onAccept)}>Accept Task</button>
              {onDecline && (
                <button className="v4-btn v4-btn-secondary" onClick={(e) => handleAction(e, onDecline)}>Decline</button>
              )}
            </>
          )}
          {task.status === 'open' && onAccept && (
            <button className="v4-btn v4-btn-primary" onClick={(e) => handleAction(e, onAccept)}>Accept Task</button>
          )}
          {(task.status === 'accepted' || task.status === 'assigned') && onStartWork && (
            <button className="v4-btn v4-btn-primary" onClick={(e) => handleAction(e, onStartWork)}>Start Work</button>
          )}
          {task.status === 'in_progress' && onSubmitProof && (
            <button className="v4-btn v4-btn-primary" onClick={(e) => handleAction(e, onSubmitProof)}>Submit Proof</button>
          )}
          {task.status === 'pending_review' && (
            <button className="v4-btn v4-btn-secondary" disabled>Waiting for approval...</button>
          )}
          {task.status === 'approved' && (
            <span className="mytasks-card__info-label">Work approved — payment pending</span>
          )}
          {task.status === 'completed' && (
            <span className="mytasks-card__info-label mytasks-card__info-label--success">Payment pending</span>
          )}
        </div>

        {variant === 'review' && task.escrow_status && (
          <EscrowBadge status={task.escrow_status} amount={task.budget} paymentMethod={task.payment_method} />
        )}
      </div>
    </div>
  );
}
