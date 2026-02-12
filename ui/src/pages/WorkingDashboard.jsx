import { useState, useEffect, useMemo } from 'react'
import API_URL from '../config/api'
import ProfileCompleteness from '../components/ProfileCompleteness'
import HowPaymentsWork from '../components/HowPaymentsWork'

const ACTIVE_STATUSES = ['open', 'accepted', 'assigned', 'in_progress']
const REVIEW_STATUSES = ['pending_review', 'approved', 'completed']

function MonthlyEarningsChart({ tasks }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const monthOptions = useMemo(() => {
    const months = []
    const now = new Date()
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      })
    }
    return months
  }, [])

  const chartData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    const dailyEarnings = Array(daysInMonth).fill(0)

    const paidTasks = (tasks || []).filter(t => t.status === 'paid')
    paidTasks.forEach(t => {
      const date = new Date(t.updated_at || t.created_at)
      if (date.getFullYear() === year && date.getMonth() + 1 === month) {
        dailyEarnings[date.getDate() - 1] += Number(t.budget) || 0
      }
    })

    const maxEarning = Math.max(...dailyEarnings, 1)
    const monthTotal = dailyEarnings.reduce((a, b) => a + b, 0)

    return { dailyEarnings, maxEarning, daysInMonth, monthTotal }
  }, [tasks, selectedMonth])

  const today = new Date()
  const [selYear, selMonth] = selectedMonth.split('-').map(Number)
  const isCurrentMonth = today.getFullYear() === selYear && today.getMonth() + 1 === selMonth
  const todayDate = today.getDate()

  return (
    <div className="working-dash-chart">
      <div className="working-dash-chart-header">
        <div>
          <h3 className="working-dash-chart-title">Monthly Earnings</h3>
          <p className="working-dash-chart-total">${chartData.monthTotal.toFixed(0)}</p>
        </div>
        <select
          className="working-dash-chart-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {monthOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="working-dash-chart-area">
        <div className="working-dash-chart-bars">
          {chartData.dailyEarnings.map((amount, i) => {
            const heightPct = chartData.maxEarning > 0 ? (amount / chartData.maxEarning) * 100 : 0
            const isToday = isCurrentMonth && i + 1 === todayDate
            return (
              <div key={i} className="working-dash-chart-bar-wrap" title={`${selectedMonth}-${i + 1}: $${amount}`}>
                <div
                  className={`working-dash-chart-bar ${amount > 0 ? 'has-value' : ''} ${isToday ? 'today' : ''}`}
                  style={{ height: `${Math.max(heightPct, 2)}%` }}
                />
                {(i + 1) % 5 === 0 || i === 0 ? (
                  <span className="working-dash-chart-bar-label">{i + 1}</span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function WorkingDashboard({ user, tasks, notifications, onNavigate }) {
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const activeTasks = safeTasks.filter(t => ACTIVE_STATUSES.includes(t.status))
  const reviewTasks = safeTasks.filter(t => REVIEW_STATUSES.includes(t.status))
  const paidTasks = safeTasks.filter(t => t.status === 'paid')
  const inProgressTasks = activeTasks.filter(t => t.status === 'in_progress')

  const totalEarned = paidTasks.reduce((sum, t) => sum + (Number(t.budget) || 0), 0)
  const successRate = safeTasks.length > 0
    ? Math.round((paidTasks.length / safeTasks.length) * 100)
    : 0

  const safeNotifications = Array.isArray(notifications) ? notifications : []
  const unreadNotifs = safeNotifications.filter(n => !n.read_at)

  const [showPaymentsExplainer, setShowPaymentsExplainer] = useState(false)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="working-dash">
      {/* How Payments Work Modal */}
      <HowPaymentsWork
        isOpen={showPaymentsExplainer}
        onClose={() => setShowPaymentsExplainer(false)}
        mode="working"
      />

      {/* Header */}
      <div className="working-dash-header">
        <h1 className="working-dash-greeting">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
        </h1>
        {inProgressTasks.length > 0 && (
          <p className="working-dash-subtitle">
            {inProgressTasks.length} task{inProgressTasks.length > 1 ? 's' : ''} in progress
          </p>
        )}
      </div>

      {/* Profile Completeness Nudge */}
      <ProfileCompleteness user={user} onNavigate={onNavigate} />

      {/* Stats Row */}
      <div className="working-dash-stats">
        <div className="working-dash-stat">
          <div className="working-dash-stat-icon working-dash-stat-icon--orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div>
            <div className="working-dash-stat-label">Total Earned</div>
            <div className="working-dash-stat-value working-dash-stat-value--orange">${totalEarned}</div>
          </div>
        </div>
        <div className="working-dash-stat">
          <div className="working-dash-stat-icon working-dash-stat-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <div className="working-dash-stat-label">Active</div>
            <div className="working-dash-stat-value">{activeTasks.length}</div>
          </div>
        </div>
        <div className="working-dash-stat">
          <div className="working-dash-stat-icon working-dash-stat-icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <div className="working-dash-stat-label">Completed</div>
            <div className="working-dash-stat-value">{paidTasks.length}</div>
          </div>
        </div>
        <div className="working-dash-stat">
          <div className="working-dash-stat-icon working-dash-stat-icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <div className="working-dash-stat-label">Success</div>
            <div className="working-dash-stat-value">{successRate > 0 ? `${successRate}%` : '--'}</div>
          </div>
        </div>
      </div>

      {/* Monthly Earnings Chart */}
      <MonthlyEarningsChart tasks={safeTasks} />

      {/* Attention Needed */}
      {(reviewTasks.length > 0 || inProgressTasks.length > 0) && (
        <div className="working-dash-attention">
          <h3 className="working-dash-section-title">Needs Attention</h3>
          <div className="working-dash-attention-items">
            {inProgressTasks.map(task => {
              let deadlineBadge = null;
              if (task.deadline) {
                const diffMs = new Date(task.deadline) - new Date();
                if (diffMs > 0) {
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                let label, bg, color;
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
                } // end if (diffMs > 0)
              }
              return (
                <button
                  key={task.id}
                  className="working-dash-attention-item"
                  onClick={() => window.location.href = `/tasks/${task.id}`}
                >
                  <span className="working-dash-attention-badge working-dash-attention-badge--active">In Progress</span>
                  {deadlineBadge}
                  <span className="working-dash-attention-task-title">{task.title}</span>
                  <span className="working-dash-attention-budget">${task.budget}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
            {reviewTasks.map(task => (
              <button
                key={task.id}
                className="working-dash-attention-item"
                onClick={() => window.location.href = `/tasks/${task.id}`}
              >
                <span className="working-dash-attention-badge working-dash-attention-badge--review">In Review</span>
                <span className="working-dash-attention-task-title">{task.title}</span>
                <span className="working-dash-attention-budget">${task.budget}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {unreadNotifs.length > 0 && (
        <div className="working-dash-activity">
          <h3 className="working-dash-section-title">Recent Activity</h3>
          <div className="working-dash-activity-list">
            {unreadNotifs.slice(0, 5).map(n => (
              <div key={n.id} className="working-dash-activity-item">
                <div className="working-dash-activity-dot" />
                <div>
                  <p className="working-dash-activity-msg">{n.title}</p>
                  <p className="working-dash-activity-time">
                    {new Date(n.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="working-dash-actions">
        <button className="working-dash-action" onClick={() => onNavigate?.('browse')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          Browse Tasks
        </button>
        <button className="working-dash-action" onClick={() => onNavigate?.('tasks')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          My Tasks
        </button>
        <button className="working-dash-action" onClick={() => onNavigate?.('payments')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><path d="M1 10h22" />
          </svg>
          Earnings
        </button>
        <button className="working-dash-action" onClick={() => setShowPaymentsExplainer(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          How Payments Work
        </button>
      </div>
    </div>
  )
}
