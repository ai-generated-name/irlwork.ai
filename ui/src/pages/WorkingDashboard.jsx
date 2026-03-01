import { useState, useMemo, useCallback } from 'react'
import API_URL from '../config/api'
import { navigate } from '../utils/navigate'
import HowPaymentsWork from '../components/HowPaymentsWork'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { usePageTitle } from '../hooks/usePageTitle'
import { Button } from '../components/ui'

const ACTIVE_STATUSES = ['open', 'accepted', 'assigned', 'in_progress']
const REVIEW_STATUSES = ['pending_review', 'approved', 'completed']

// Safely handle JSONB values that may already be parsed arrays or still be JSON strings
const safeArr = v => { if (Array.isArray(v)) return v; if (!v) return []; try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }

// ─── Get Started checklist items ───
const GET_STARTED_ITEMS = [
  {
    id: 'location',
    label: 'Set your location',
    subtitle: 'Help agents find you for nearby tasks',
    tab: 'profile',
    check: (u) => !!(u?.city && u.city.trim()),
    completedDetail: (u) => u?.city || '',
  },
  {
    id: 'bio',
    label: 'Write a bio',
    subtitle: 'Introduce yourself to agents',
    tab: 'profile',
    check: (u) => !!(u?.bio && u.bio.trim().length > 10),
  },
  {
    id: 'languages',
    label: 'Add languages you speak',
    subtitle: 'Help agents match you with the right tasks',
    tab: 'profile',
    check: (u) => {
      const langs = safeArr(u?.languages)
      return langs.length > 0
    },
  },
  {
    id: 'browse',
    label: 'Browse and accept a task',
    subtitle: 'Find tasks that match your skills',
    tab: 'browse',
    check: (u, tasks) => {
      const safeTasks = Array.isArray(tasks) ? tasks : []
      return safeTasks.some(t => ['accepted', 'assigned', 'in_progress', 'pending_review', 'approved', 'completed', 'paid'].includes(t.status))
    },
  },
]

// ─── Monthly Earnings Chart ───
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
    <div className="wd-card wd-fade-in" style={{ animationDelay: '0.3s', padding: 'var(--space-6)' }}>
      <div className="working-dash-chart-header">
        <div>
          <h3 className="working-dash-chart-title">Monthly earnings</h3>
          <p className="working-dash-chart-total font-['DM_Mono']">${chartData.monthTotal.toFixed(0)}</p>
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

// ─── Progress Ring (small) ───
function ProgressRing({ completed, total }) {
  const size = 40
  const strokeWidth = 3.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? completed / total : 0
  const offset = circumference * (1 - progress)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--bg-tertiary)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--orange-600)" strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
        color: 'var(--text-primary)',
      }}>
        {completed}/{total}
      </span>
    </div>
  )
}

export default function WorkingDashboard({ user, tasks, notifications, onNavigate, onUserUpdate }) {
  usePageTitle('Dashboard')
  const toast = useToast()
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
  const [togglingAvailability, setTogglingAvailability] = useState(false)

  const isHidden = user?.availability !== 'available'

  // ─── Get Started checklist state ───
  const checklist = useMemo(() => {
    return GET_STARTED_ITEMS.map(item => ({
      ...item,
      completed: item.check(user, safeTasks),
    }))
  }, [user, safeTasks])

  const completedCount = checklist.filter(i => i.completed).length
  const allComplete = completedCount === checklist.length
  const [checklistDismissed] = useState(() =>
    localStorage.getItem('irlwork_checklist_dismissed') === 'true'
  )

  // ─── Toggle availability ───
  const handleGoAvailable = useCallback(async () => {
    setTogglingAvailability(true)
    try {
      let token = user?.token || ''
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) token = session.access_token
      }
      if (!token) {
        toast.error('Please sign in again to update availability')
        setTogglingAvailability(false)
        return
      }
      const res = await fetch(`${API_URL}/humans/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ availability: 'available' })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          const updatedUser = { ...data.user, token, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
          onUserUpdate?.(updatedUser)
          localStorage.setItem('user', JSON.stringify({ ...updatedUser, token: undefined }))
        }
        toast.success("You're now available for work")
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed to update availability')
      }
    } catch {
      toast.error('Failed to update availability')
    } finally {
      setTogglingAvailability(false)
    }
  }, [user, onUserUpdate, toast])

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

      {/* Header / Greeting */}
      <div className="working-dash-header wd-fade-in">
        <h1 className="working-dash-greeting">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
        </h1>
        {inProgressTasks.length > 0 && (
          <p className="working-dash-subtitle">
            {inProgressTasks.length} task{inProgressTasks.length > 1 ? 's' : ''} in progress
          </p>
        )}
      </div>

      {/* ─── Availability Banner (consolidated) ─── */}
      {isHidden && (
        <div className="wd-availability-banner wd-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="wd-availability-banner-left">
            <div className="wd-availability-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </div>
            <div>
              <p className="wd-availability-title">You're hidden from search</p>
              <p className="wd-availability-subtitle">Turn on availability so agents can find and hire you.</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleGoAvailable}
            disabled={togglingAvailability}
          >
            {togglingAvailability ? 'Updating...' : 'Go available'}
          </Button>
        </div>
      )}

      {/* ─── Get Started Checklist (merged profile + onboarding) ─── */}
      {!allComplete && !checklistDismissed && (
        <div className="wd-card wd-checklist-card wd-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="wd-checklist-header">
            <ProgressRing completed={completedCount} total={checklist.length} />
            <div>
              <h3 className="wd-checklist-title">Get started</h3>
              <p className="wd-checklist-subtitle">Complete your profile to start earning</p>
            </div>
          </div>
          <div className="wd-checklist-items">
            {checklist.map((item, index) => (
              <button
                key={item.id}
                className={`wd-checklist-item ${item.completed ? 'completed' : ''}`}
                onClick={() => !item.completed && onNavigate?.(item.tab)}
              >
                <div className="wd-checklist-item-indicator">
                  {item.completed ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="wd-checklist-item-number">{index + 1}</span>
                  )}
                </div>
                <div className="wd-checklist-item-content">
                  <span className="wd-checklist-item-label">
                    {item.label}
                    {item.completed && item.completedDetail?.(user) ? (
                      <span className="wd-checklist-item-detail"> — {item.completedDetail(user)}</span>
                    ) : null}
                  </span>
                  {!item.completed && (
                    <span className="wd-checklist-item-subtitle">{item.subtitle}</span>
                  )}
                </div>
                {!item.completed && (
                  <svg className="wd-checklist-item-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Apply for Tasks CTA ─── */}
      <div className="wd-card wd-browse-cta wd-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="wd-browse-cta-text">
          <h3 className="wd-browse-cta-title">Apply for tasks and get paid</h3>
          <p className="wd-browse-cta-subtitle">Tasks pay $5–$200+ and take minutes to hours.</p>
        </div>
        <Button variant="primary" size="md" onClick={() => onNavigate?.('browse')} className="gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          Browse tasks
        </Button>
      </div>

      {/* Stats Row */}
      <div className="working-dash-stats wd-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="wd-card working-dash-stat">
          <div className="working-dash-stat-icon working-dash-stat-icon--orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div>
            <div className="working-dash-stat-label">Total earned</div>
            <div className="working-dash-stat-value font-['DM_Mono']">${totalEarned}</div>
          </div>
        </div>
        <div className="wd-card working-dash-stat">
          <div className="working-dash-stat-icon working-dash-stat-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <div className="working-dash-stat-label">Active</div>
            <div className="working-dash-stat-value font-['DM_Mono']">{activeTasks.length}</div>
          </div>
        </div>
        <div className="wd-card working-dash-stat">
          <div className="working-dash-stat-icon working-dash-stat-icon--green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <div className="working-dash-stat-label">Completed</div>
            <div className="working-dash-stat-value font-['DM_Mono']">{paidTasks.length}</div>
          </div>
        </div>
        <div className="wd-card working-dash-stat">
          <div className="working-dash-stat-icon working-dash-stat-icon--purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <div className="working-dash-stat-label">Success</div>
            <div className="working-dash-stat-value font-['DM_Mono']">{successRate > 0 ? `${successRate}%` : '--'}</div>
          </div>
        </div>
      </div>

      {/* Monthly Earnings Chart */}
      <MonthlyEarningsChart tasks={safeTasks} />

      {/* Attention Needed */}
      {(reviewTasks.length > 0 || inProgressTasks.length > 0) && (
        <div className="wd-card wd-fade-in" style={{ animationDelay: '0.35s', padding: 'var(--space-5)' }}>
          <h3 className="working-dash-section-title">Needs attention</h3>
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
                }
              }
              return (
                <button
                  key={task.id}
                  className="working-dash-attention-item"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <span className="working-dash-attention-badge working-dash-attention-badge--active">In Progress</span>
                  {deadlineBadge}
                  <span className="working-dash-attention-task-title">{task.title}</span>
                  <span className="working-dash-attention-budget font-['DM_Mono']">${task.budget}</span>
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
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <span className="working-dash-attention-badge working-dash-attention-badge--review">In Review</span>
                <span className="working-dash-attention-task-title">{task.title}</span>
                <span className="working-dash-attention-budget font-['DM_Mono']">${task.budget}</span>
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
        <div className="wd-card wd-fade-in" style={{ animationDelay: '0.4s', padding: 'var(--space-5)' }}>
          <h3 className="working-dash-section-title">Recent activity</h3>
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
      <div className="working-dash-actions wd-fade-in" style={{ animationDelay: '0.45s' }}>
        <button className="working-dash-action" onClick={() => onNavigate?.('tasks')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          View tasks
        </button>
        <button className="working-dash-action" onClick={() => onNavigate?.('payments')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><path d="M1 10h22" />
          </svg>
          View earnings
        </button>
        <button className="working-dash-action" onClick={() => setShowPaymentsExplainer(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          How payments work
        </button>
      </div>
    </div>
  )
}
