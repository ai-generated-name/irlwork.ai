import { useState, useMemo } from 'react'
import AgentOnboardingWizard from '../components/AgentOnboardingWizard'
import HowPaymentsWork from '../components/HowPaymentsWork'

export default function HiringDashboard({ user, postedTasks, onNavigate }) {
  const safeTasks = Array.isArray(postedTasks) ? postedTasks : []

  const openTasks = safeTasks.filter(t => t.status === 'open')
  const inProgressTasks = safeTasks.filter(t => ['assigned', 'in_progress'].includes(t.status))
  const reviewTasks = safeTasks.filter(t => t.status === 'pending_review')
  const completedTasks = safeTasks.filter(t => ['completed', 'paid'].includes(t.status))

  const totalSpent = safeTasks
    .filter(t => t.status === 'paid')
    .reduce((sum, t) => sum + (Number(t.budget) || 0), 0)

  const totalBudgeted = safeTasks.reduce((sum, t) => sum + (Number(t.budget) || 0), 0)

  const [showAgentOnboarding, setShowAgentOnboarding] = useState(() => {
    return localStorage.getItem('irlwork_agent_onboarding_completed') !== 'true'
  })
  const [showPaymentsExplainer, setShowPaymentsExplainer] = useState(false)

  return (
    <div className="hiring-dash">
      {/* Agent Onboarding Wizard */}
      {showAgentOnboarding && (
        <AgentOnboardingWizard
          user={user}
          onComplete={() => setShowAgentOnboarding(false)}
          onNavigate={onNavigate}
        />
      )}

      {/* How Payments Work Modal */}
      <HowPaymentsWork
        isOpen={showPaymentsExplainer}
        onClose={() => setShowPaymentsExplainer(false)}
        mode="hiring"
      />

      {/* Header */}
      <div className="hiring-dash-header">
        <h1 className="hiring-dash-greeting">Dashboard</h1>
        <button className="hiring-dash-create-btn" onClick={() => onNavigate?.('create')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create Task
        </button>
      </div>

      {/* Stats */}
      <div className="hiring-dash-stats">
        <div className="hiring-dash-stat">
          <div className="hiring-dash-stat-icon hiring-dash-stat-icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div>
            <div className="hiring-dash-stat-label">Total Spent</div>
            <div className="hiring-dash-stat-value">${totalSpent}</div>
          </div>
        </div>
        <div className="hiring-dash-stat">
          <div className="hiring-dash-stat-icon hiring-dash-stat-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div>
            <div className="hiring-dash-stat-label">Posted</div>
            <div className="hiring-dash-stat-value">{safeTasks.length}</div>
          </div>
        </div>
        <div className="hiring-dash-stat">
          <div className="hiring-dash-stat-icon hiring-dash-stat-icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <div className="hiring-dash-stat-label">Completed</div>
            <div className="hiring-dash-stat-value">{completedTasks.length}</div>
          </div>
        </div>
        <div className="hiring-dash-stat">
          <div className="hiring-dash-stat-icon hiring-dash-stat-icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <div className="hiring-dash-stat-label">In Review</div>
            <div className="hiring-dash-stat-value">{reviewTasks.length}</div>
          </div>
        </div>
      </div>

      {/* Tasks needing action */}
      {reviewTasks.length > 0 && (
        <div className="hiring-dash-attention">
          <h3 className="hiring-dash-section-title">Needs Review</h3>
          <div className="hiring-dash-attention-items">
            {reviewTasks.map(task => (
              <button
                key={task.id}
                className="hiring-dash-attention-item"
                onClick={() => window.location.href = `/tasks/${task.id}`}
              >
                <span className="hiring-dash-attention-badge">Pending Review</span>
                <span className="hiring-dash-attention-task-title">{task.title}</span>
                <span className="hiring-dash-attention-meta">
                  {task.assignee?.name || 'Worker'} &middot; ${task.budget}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active work */}
      {inProgressTasks.length > 0 && (
        <div className="hiring-dash-active">
          <h3 className="hiring-dash-section-title">Active Work</h3>
          <div className="hiring-dash-attention-items">
            {inProgressTasks.map(task => {
              let deadlineBadge = null;
              if (task.deadline) {
                const diffMs = new Date(task.deadline) - new Date();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                let label, bg, color;
                if (diffMs > 0) {
                if (diffHours < 1) { label = 'Due in < 1 hour'; bg = '#FEF3C7'; color = '#D97706'; }
                else if (diffHours < 24) { label = `Due in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`; bg = '#FEF3C7'; color = '#D97706'; }
                else if (diffDays <= 3) { label = `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`; bg = '#FEF3C7'; color = '#B45309'; }
                else { label = `Due in ${diffDays} days`; bg = '#F0F9FF'; color = '#0369A1'; }
                deadlineBadge = (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: bg, color, whiteSpace: 'nowrap' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    {label}
                  </span>
                );
                }
              }
              return (
                <button
                  key={task.id}
                  className="hiring-dash-attention-item"
                  onClick={() => window.location.href = `/tasks/${task.id}`}
                >
                  <span className="hiring-dash-attention-badge hiring-dash-attention-badge--active">In Progress</span>
                  {deadlineBadge}
                  <span className="hiring-dash-attention-task-title">{task.title}</span>
                  <span className="hiring-dash-attention-meta">
                    {task.assignee?.name || 'Assigned'} &middot; ${task.budget}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Open tasks awaiting applicants */}
      {openTasks.length > 0 && (
        <div className="hiring-dash-open">
          <h3 className="hiring-dash-section-title">Awaiting Applicants</h3>
          <div className="hiring-dash-attention-items">
            {openTasks.map(task => {
              let deadlineBadge = null;
              if (task.deadline) {
                const diffMs = new Date(task.deadline) - new Date();
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                let label, bg, color;
                if (diffMs > 0) {
                if (diffHours < 1) { label = 'Due in < 1 hour'; bg = '#FEF3C7'; color = '#D97706'; }
                else if (diffHours < 24) { label = `Due in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`; bg = '#FEF3C7'; color = '#D97706'; }
                else if (diffDays <= 3) { label = `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`; bg = '#FEF3C7'; color = '#B45309'; }
                else { label = `Due in ${diffDays} days`; bg = '#F0F9FF'; color = '#0369A1'; }
                deadlineBadge = (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: bg, color, whiteSpace: 'nowrap' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    {label}
                  </span>
                );
                }
              }
              return (
                <button
                  key={task.id}
                  className="hiring-dash-attention-item"
                  onClick={() => onNavigate?.('posted')}
                >
                  <span className="hiring-dash-attention-badge hiring-dash-attention-badge--open">Open</span>
                  {deadlineBadge}
                  <span className="hiring-dash-attention-task-title">{task.title}</span>
                  <span className="hiring-dash-attention-meta">${task.budget} &middot; {task.category || 'General'}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {safeTasks.length === 0 && (
        <div className="hiring-dash-empty">
          <div className="hiring-dash-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h3 className="hiring-dash-empty-title">No tasks posted yet</h3>
          <p className="hiring-dash-empty-text">Post a task and get matched with verified humans near you.</p>
          <button className="hiring-dash-create-btn" onClick={() => onNavigate?.('posted')} style={{ background: 'linear-gradient(135deg, var(--orange-600) 0%, var(--orange-500) 100%)', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            + Create Task
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="hiring-dash-actions">
        <button className="hiring-dash-action" onClick={() => onNavigate?.('posted')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          My Tasks
        </button>
        <button className="hiring-dash-action" onClick={() => onNavigate?.('browse')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          Browse Humans
        </button>
        <button className="hiring-dash-action" onClick={() => onNavigate?.('messages')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Messages
        </button>
        <button className="hiring-dash-action" onClick={() => setShowPaymentsExplainer(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          How Payments Work
        </button>
      </div>
    </div>
  )
}
