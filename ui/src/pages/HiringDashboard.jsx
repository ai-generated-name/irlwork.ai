import { useState, useMemo } from 'react'
import AgentOnboardingWizard from '../components/AgentOnboardingWizard'
import { navigate } from '../utils/navigate'
import HowPaymentsWork from '../components/HowPaymentsWork'
import { usePageTitle } from '../hooks/usePageTitle'

export default function HiringDashboard({ user, postedTasks, onNavigate }) {
  usePageTitle('Dashboard')
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

  // Getting started checklist
  const hasPaymentMethod = localStorage.getItem('irlwork_has_payment_method') === 'true'
  const hasPostedTask = safeTasks.length > 0
  const hasBrowsedHumans = localStorage.getItem('irlwork_has_browsed_humans') === 'true'
  const showChecklist = !hasPostedTask

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

      {/* Getting Started Checklist */}
      {showChecklist && (
        <div className="hiring-dash-checklist" style={{
          background: 'white',
          border: '1px solid rgba(26,26,26,0.08)',
          borderRadius: 16,
          padding: 'var(--space-5)',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Getting Started</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => onNavigate?.('payments')} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: hasPaymentMethod ? 'rgba(16,185,129,0.06)' : '#F5F2ED',
              borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%'
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: hasPaymentMethod ? '#10B981' : '#D1D5DB',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700
              }}>{hasPaymentMethod ? '✓' : '1'}</div>
              <div>
                <p style={{ fontWeight: 500, fontSize: 14, color: hasPaymentMethod ? '#059669' : 'var(--text-primary)' }}>Add a payment method</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Required to fund tasks and pay workers</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={() => onNavigate?.('create')} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: hasPostedTask ? 'rgba(16,185,129,0.06)' : '#F5F2ED',
              borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%'
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: hasPostedTask ? '#10B981' : '#D1D5DB',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700
              }}>{hasPostedTask ? '✓' : '2'}</div>
              <div>
                <p style={{ fontWeight: 500, fontSize: 14, color: hasPostedTask ? '#059669' : 'var(--text-primary)' }}>Post your first task</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Describe what you need done and set a budget</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={() => { onNavigate?.('browse'); localStorage.setItem('irlwork_has_browsed_humans', 'true') }} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: hasBrowsedHumans ? 'rgba(16,185,129,0.06)' : '#F5F2ED',
              borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%'
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: hasBrowsedHumans ? '#10B981' : '#D1D5DB',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700
              }}>{hasBrowsedHumans ? '✓' : '3'}</div>
              <div>
                <p style={{ fontWeight: 500, fontSize: 14, color: hasBrowsedHumans ? '#059669' : 'var(--text-primary)' }}>Browse available humans</p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Find skilled workers near you or worldwide</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tasks needing action */}
      {reviewTasks.length > 0 && (
        <div className="hiring-dash-attention">
          <h3 className="hiring-dash-section-title">Needs Review</h3>
          <div className="hiring-dash-attention-items">
            {reviewTasks.map(task => (
              <button
                key={task.id}
                className="hiring-dash-attention-item"
                onClick={() => navigate(`/tasks/${task.id}`)}
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
                if (diffHours < 1) { label = 'Due in < 1 hour'; bg = 'rgba(254, 188, 46, 0.1)'; color = '#FEBC2E'; }
                else if (diffHours < 24) { label = `Due in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`; bg = 'rgba(254, 188, 46, 0.1)'; color = '#FEBC2E'; }
                else if (diffDays <= 3) { label = `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`; bg = 'rgba(254, 188, 46, 0.1)'; color = '#B45309'; }
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
                  onClick={() => navigate(`/tasks/${task.id}`)}
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
                if (diffHours < 1) { label = 'Due in < 1 hour'; bg = 'rgba(254, 188, 46, 0.1)'; color = '#FEBC2E'; }
                else if (diffHours < 24) { label = `Due in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`; bg = 'rgba(254, 188, 46, 0.1)'; color = '#FEBC2E'; }
                else if (diffDays <= 3) { label = `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`; bg = 'rgba(254, 188, 46, 0.1)'; color = '#B45309'; }
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
      {safeTasks.length === 0 && !showChecklist && (
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
          <button onClick={() => onNavigate?.('posted')} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create Task
          </button>
        </div>
      )}

      {/* Recent Activity */}
      <div style={{ marginBottom: 24 }}>
        <h3 className="hiring-dash-section-title" style={{ marginBottom: 12 }}>Recent Activity</h3>
        {safeTasks.length === 0 ? (
          <div style={{
            background: 'white', border: '1px solid rgba(26,26,26,0.08)', borderRadius: 12,
            padding: '24px 16px', textAlign: 'center'
          }}>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>No recent activity</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {safeTasks.slice(0, 5).map(task => (
              <div key={task.id} style={{
                background: 'white', border: '1px solid rgba(26,26,26,0.08)', borderRadius: 12,
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: task.status === 'open' ? '#F59E0B' : task.status === 'in_progress' ? '#3B82F6' : task.status === 'pending_review' ? '#8B5CF6' : '#10B981'
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {task.status === 'open' ? 'Awaiting applicants' : task.status === 'in_progress' ? `Assigned to ${task.assignee?.name || 'worker'}` : task.status === 'pending_review' ? 'Pending your review' : task.status === 'paid' ? 'Payment released' : 'Completed'}
                    {task.budget && <> &middot; ${task.budget}</>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions — Card Grid */}
      <div style={{ marginBottom: 24 }}>
        <h3 className="hiring-dash-section-title" style={{ marginBottom: 12 }}>Quick Actions</h3>
        <div className="hiring-dash-quick-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <button onClick={() => onNavigate?.('posted')} style={{
            background: 'white', border: '1px solid rgba(26,26,26,0.08)', borderRadius: 12,
            padding: 16, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'}
          onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4845F" strokeWidth="2" style={{ marginBottom: 8 }}>
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>My Tasks</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>View and manage posted tasks</p>
          </button>
          <button onClick={() => onNavigate?.('browse')} style={{
            background: 'white', border: '1px solid rgba(26,26,26,0.08)', borderRadius: 12,
            padding: 16, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'}
          onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4845F" strokeWidth="2" style={{ marginBottom: 8 }}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>Browse Humans</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Find skilled workers for your tasks</p>
          </button>
          <button onClick={() => onNavigate?.('messages')} style={{
            background: 'white', border: '1px solid rgba(26,26,26,0.08)', borderRadius: 12,
            padding: 16, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'}
          onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4845F" strokeWidth="2" style={{ marginBottom: 8 }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>Messages</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Chat with workers and applicants</p>
          </button>
          <button onClick={() => setShowPaymentsExplainer(true)} style={{
            background: 'white', border: '1px solid rgba(26,26,26,0.08)', borderRadius: 12,
            padding: 16, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'}
          onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4845F" strokeWidth="2" style={{ marginBottom: 8 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>How Payments Work</p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Learn about escrow and payouts</p>
          </button>
        </div>
      </div>
    </div>
  )
}
