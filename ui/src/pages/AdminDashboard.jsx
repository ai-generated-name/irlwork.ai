import { useState, useEffect, useCallback, lazy, Suspense, Fragment } from 'react'
import { BarChart3, Flag, DollarSign, AlertTriangle, User, Users, CheckCircle, ArrowDownLeft, FileText, Hammer, TrendingUp, Filter, Activity } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { adminFetch } from '../utils/adminFetch'
import API_URL from '../config/api'
import { PageHeader, ConfirmDialog, Button, Card } from '../components/ui'
import { usePageTitle } from '../hooks/usePageTitle'
import { PageLoader } from '../components/ui/PageLoader'

// Lazy-load BI tabs so they only fetch data when selected
const OverviewTab = lazy(() => import('../components/admin/OverviewTab'))
const FunnelTab = lazy(() => import('../components/admin/FunnelTab'))
const FinancialTab = lazy(() => import('../components/admin/FinancialTab'))
const LiveFeedTab = lazy(() => import('../components/admin/LiveFeedTab'))
const TaskManagerTab = lazy(() => import('../components/admin/TaskManagerTab'))
const UserManagerTab = lazy(() => import('../components/admin/UserManagerTab'))

// URL slug ↔ internal queue ID mapping
const ADMIN_TAB_URL_MAP = {
  'bi-overview': 'overview',
  'bi-funnel': 'funnel',
  'bi-financial': 'financial',
  'bi-live-feed': 'live-feed',
  'bi-task-manager': 'tasks',
  'dashboard': 'operations',
  'reports': 'reports',
  'pending-deposits': 'pending-deposits',
  'stale-deposits': 'stale-deposits',
  'pending-agent-approval': 'awaiting-agent',
  'pending-release': 'ready-to-release',
  'pending-withdrawals': 'pending-withdrawals',
  'feedback': 'feedback',
  'users': 'users',
}
const URL_TO_TAB_MAP = Object.fromEntries(
  Object.entries(ADMIN_TAB_URL_MAP).map(([k, v]) => [v, k])
)

function getAdminTabFromUrl() {
  const parts = window.location.pathname.split('/')
  // Expected: ['', 'dashboard', 'hiring', 'admin', 'overview']
  const slug = parts[4] || null
  if (slug && URL_TO_TAB_MAP[slug]) return URL_TO_TAB_MAP[slug]
  return null
}

/**
 * Admin Dashboard - Phase 1 Manual Operations
 * Only accessible to users with admin privileges
 */
export default function AdminDashboard({ user, initialAdminTab }) {
  usePageTitle('Admin')
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeQueue, setActiveQueue] = useState(() => {
    return getAdminTabFromUrl() || initialAdminTab || 'bi-overview'
  })
  const [dashboard, setDashboard] = useState(null)
  const [queueData, setQueueData] = useState([])
  const [actionLoading, setActionLoading] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [reportResolveModal, setReportResolveModal] = useState(null)
  const [feedbackData, setFeedbackData] = useState([])
  const [feedbackFilter, setFeedbackFilter] = useState('all')

  // Fetch dashboard summary
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await adminFetch(`${API_URL}/admin/dashboard`)
      if (!res.ok) {
        if (res.status === 403) {
          setError('Access denied. Admin privileges required.')
          return
        }
        throw new Error('Failed to fetch dashboard')
      }
      const data = await res.json()
      setDashboard(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch queue data (BI tabs and users manage their own fetching)
  const fetchQueue = useCallback(async (queue) => {
    if (queue === 'dashboard' || queue === 'users' || queue.startsWith('bi-')) return

    setLoading(true)
    try {
      if (queue === 'feedback') {
        const statusParam = feedbackFilter !== 'all' ? `?status=${feedbackFilter}` : ''
        const res = await adminFetch(`${API_URL}/admin/feedback${statusParam}`)
        if (!res.ok) throw new Error('Failed to fetch feedback')
        const data = await res.json()
        setFeedbackData(data.items || [])
        setError(null)
        setLoading(false)
        return
      }

      const endpoints = {
        'pending-deposits': '/admin/tasks/pending-deposits',
        'stale-deposits': '/admin/tasks/stale-deposits',
        'pending-agent-approval': '/admin/tasks/pending-agent-approval',
        'pending-release': '/admin/tasks/pending-release',
        'pending-withdrawals': '/admin/withdrawals?status=pending',
        'reports': '/admin/reports?status=pending'
      }

      if (!endpoints[queue]) return
      const res = await adminFetch(`${API_URL}${endpoints[queue]}`)
      if (!res.ok) throw new Error('Failed to fetch queue')
      const data = await res.json()
      // Reports endpoint returns { reports: [], total, page, limit }
      setQueueData(queue === 'reports' ? (data.reports || []) : data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [feedbackFilter])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  useEffect(() => {
    if (activeQueue !== 'dashboard') {
      fetchQueue(activeQueue)
    }
  }, [activeQueue, fetchQueue])

  // Push admin sub-tab URL when active queue changes
  const setActiveQueueWithUrl = useCallback((queueId) => {
    setActiveQueue(queueId)
    const slug = ADMIN_TAB_URL_MAP[queueId] || queueId
    window.history.pushState({}, '', `/dashboard/hiring/admin/${slug}`)
  }, [])

  // Handle browser back/forward within admin tabs
  useEffect(() => {
    const handleAdminPopState = () => {
      const tab = getAdminTabFromUrl()
      if (tab) setActiveQueue(tab)
    }
    window.addEventListener('popstate', handleAdminPopState)
    return () => window.removeEventListener('popstate', handleAdminPopState)
  }, [])

  // Push initial URL on mount if none set
  useEffect(() => {
    const parts = window.location.pathname.split('/')
    if (parts[3] === 'admin' && !parts[4]) {
      const slug = ADMIN_TAB_URL_MAP[activeQueue] || 'overview'
      window.history.replaceState({}, '', `/dashboard/hiring/admin/${slug}`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Action handlers
  const confirmDeposit = async (taskId, txHash, amount) => {
    setActionLoading(taskId)
    try {
      const res = await adminFetch(`${API_URL}/admin/tasks/${taskId}/confirm-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tx_hash: txHash, amount_received: parseFloat(amount) })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to confirm deposit')
      }
      setActionModal(null)
      fetchQueue(activeQueue)
      fetchDashboard()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }


  const releasePayment = async (taskId) => {
    setActionLoading(taskId)
    try {
      const res = await adminFetch(`${API_URL}/admin/tasks/${taskId}/release-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to release payment')
      }
      fetchQueue(activeQueue)
      fetchDashboard()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const confirmWithdrawal = async (paymentId, txHash, amount) => {
    setActionLoading(paymentId)
    try {
      const res = await adminFetch(`${API_URL}/admin/payments/${paymentId}/confirm-withdrawal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tx_hash: txHash, amount_sent: parseFloat(amount) })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to confirm withdrawal')
      }
      setActionModal(null)
      fetchQueue(activeQueue)
      fetchDashboard()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }


  const confirmCancelAssignment = (taskId) => {
    setConfirmModal({
      title: 'Cancel assignment',
      message: 'Cancel this assignment? The task will become open again.',
      onConfirm: () => { setConfirmModal(null); executeCancelAssignment(taskId) }
    })
  }

  const executeCancelAssignment = async (taskId) => {
    setActionLoading(taskId)
    try {
      const res = await adminFetch(`${API_URL}/admin/tasks/${taskId}/cancel-assignment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to cancel assignment')
      }
      fetchQueue(activeQueue)
      fetchDashboard()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const resolveReport = async (reportId, { action, notes, suspend_days }) => {
    setActionLoading(reportId)
    try {
      const res = await adminFetch(`${API_URL}/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, notes, suspend_days })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to resolve report')
      }
      setReportResolveModal(null)
      fetchQueue(activeQueue)
      fetchDashboard()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const updateFeedbackStatus = async (feedbackId, status, adminNotes) => {
    setActionLoading(feedbackId)
    try {
      const res = await adminFetch(`${API_URL}/admin/feedback/${feedbackId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, admin_notes: adminNotes })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update feedback')
      }
      fetchQueue('feedback')
      fetchDashboard()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  // Re-fetch feedback when filter changes
  useEffect(() => {
    if (activeQueue === 'feedback') {
      fetchQueue('feedback')
    }
  }, [feedbackFilter])

  if (error === 'Access denied. Admin privileges required.') {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center"><Lock size={48} /></div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Access Denied</h2>
          <p className="text-[#6B7280]">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    )
  }

  if (error && !dashboard) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4"><AlertTriangle size={48} /></div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Failed to Load Dashboard</h2>
          <p className="text-[#6B7280] mb-4">{error}</p>
          <button
            onClick={() => { setError(null); fetchDashboard(); }}
            className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Tab groups: Analytics | Tasks | Payments | Users
  const tabGroups = [
    {
      label: 'Analytics',
      style: 'bi',
      tabs: [
        { id: 'bi-overview', label: 'Overview', icon: <TrendingUp size={16} /> },
        { id: 'bi-funnel', label: 'Funnel', icon: <Filter size={16} /> },
        { id: 'bi-financial', label: 'Financial', icon: <DollarSign size={16} /> },
        { id: 'bi-live-feed', label: 'Live Feed', icon: <Activity size={16} /> },
      ],
    },
    {
      label: 'Tasks',
      style: 'ops',
      tabs: [
        { id: 'bi-task-manager', label: 'Tasks', icon: <Hammer size={16} /> },
        { id: 'dashboard', label: 'Operations', icon: <BarChart3 size={16} /> },
        { id: 'reports', label: 'Reports', icon: <Flag size={16} />, count: dashboard?.pending_reports?.count, alert: dashboard?.pending_reports?.count > 0 },
      ],
    },
    {
      label: 'Payments',
      style: 'ops',
      tabs: [
        { id: 'pending-deposits', label: 'Pending Deposits', icon: <DollarSign size={16} />, count: dashboard?.pending_deposits?.count },
        { id: 'stale-deposits', label: 'Stale (>48h)', icon: <AlertTriangle size={16} />, count: dashboard?.stale_deposits_48h?.count, alert: dashboard?.stale_deposits_48h?.alert },
        { id: 'pending-release', label: 'Ready to Release', icon: <CheckCircle size={16} />, count: dashboard?.pending_release?.count },
        { id: 'pending-withdrawals', label: 'Pending Withdrawals', icon: <ArrowDownLeft size={16} />, count: dashboard?.pending_withdrawals?.count },
      ],
    },
    {
      label: 'Users',
      style: 'bi',
      tabs: [
        { id: 'users', label: 'Users', icon: <Users size={16} /> },
        { id: 'pending-agent-approval', label: 'Awaiting Agent', icon: <User size={16} />, count: dashboard?.pending_agent_approval?.count },
        { id: 'feedback', label: 'Feedback', icon: <FileText size={16} />, count: dashboard?.feedback?.count },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Admin dashboard"
        subtitle="Phase 1 Manual Operations"
        action={
          <Button
            variant="primary"
            size="md"
            onClick={() => { fetchDashboard(); if (activeQueue !== 'dashboard') fetchQueue(activeQueue); }}
            className="bg-teal hover:bg-teal-dark"
          >
            Refresh
          </Button>
        }
      />

      {/* Queue Tabs — grouped with dividers */}
      <div className="flex flex-wrap gap-2 items-center">
        {tabGroups.map((group, gi) => (
          <Fragment key={group.label}>
            {gi > 0 && <div className="w-px h-6 bg-[#ECECEC] mx-1" />}
            {group.tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveQueueWithUrl(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm ${
                  activeQueue === tab.id
                    ? group.style === 'bi' ? 'bg-orange-500 text-white' : 'bg-teal text-white'
                    : tab.alert
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-[#F3F4F6] text-[#1A1A1A] hover:bg-[#ECECEC]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-[6px] text-xs ${
                    activeQueue === tab.id ? 'bg-white/20' : 'bg-[#ECECEC]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </Fragment>
        ))}
      </div>

      {/* Content */}
      {/* BI Tabs — lazy loaded, each manages its own data fetching */}
      {activeQueue === 'bi-overview' ? (
        <Suspense fallback={<PageLoader message="Loading overview..." />}>
          <OverviewTab user={user} />
        </Suspense>
      ) : activeQueue === 'bi-funnel' ? (
        <Suspense fallback={<PageLoader message="Loading funnel..." />}>
          <FunnelTab user={user} />
        </Suspense>
      ) : activeQueue === 'bi-financial' ? (
        <Suspense fallback={<PageLoader message="Loading financials..." />}>
          <FinancialTab user={user} />
        </Suspense>
      ) : activeQueue === 'bi-live-feed' ? (
        <Suspense fallback={<PageLoader message="Loading live feed..." />}>
          <LiveFeedTab user={user} />
        </Suspense>
      ) : activeQueue === 'bi-task-manager' ? (
        <Suspense fallback={<PageLoader message="Loading task manager..." />}>
          <TaskManagerTab user={user} />
        </Suspense>
      ) : activeQueue === 'users' ? (
        <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="text-[#9CA3AF]">Loading users...</div></div>}>
          <UserManagerTab user={user} />
        </Suspense>
      ) : loading && activeQueue === 'dashboard' ? (
        <PageLoader message="Loading dashboard..." />
      ) : activeQueue === 'dashboard' ? (
        /* Dashboard Overview */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Pending Reports"
            value={dashboard?.pending_reports?.count || 0}
            subtitle="Needs review"
            icon={<Flag size={18} />}
            color={dashboard?.pending_reports?.count > 0 ? 'red' : 'gray'}
            alert={dashboard?.pending_reports?.count > 0}
          />
          <StatCard
            title="Pending Deposits"
            value={dashboard?.pending_deposits?.count || 0}
            subtitle={`$${dashboard?.pending_deposits?.total_usdc?.toFixed(2) || '0.00'} USDC expected`}
            icon={<DollarSign size={18} />}
            color="yellow"
          />
          <StatCard
            title="Stale Deposits (>48h)"
            value={dashboard?.stale_deposits_48h?.count || 0}
            subtitle="Needs attention"
            icon={<AlertTriangle size={18} />}
            color={dashboard?.stale_deposits_48h?.count > 0 ? 'red' : 'gray'}
            alert={dashboard?.stale_deposits_48h?.count > 0}
          />
          <StatCard
            title="Work in progress"
            value={dashboard?.work_in_progress?.count || 0}
            subtitle={`$${dashboard?.work_in_progress?.total_usdc_held?.toFixed(2) || '0.00'} USDC held`}
            icon={<Hammer size={18} />}
            color="blue"
          />
          <StatCard
            title="Awaiting agent approval"
            value={dashboard?.pending_agent_approval?.count || 0}
            subtitle="Proofs submitted"
            icon={<User size={18} />}
            color="purple"
          />
          <StatCard
            title="Ready to Release"
            value={dashboard?.pending_release?.count || 0}
            subtitle={`$${dashboard?.pending_release?.total_usdc_to_release?.toFixed(2) || '0.00'} USDC`}
            icon={<CheckCircle size={18} />}
            color="green"
          />
          <StatCard
            title="Pending Withdrawals"
            value={dashboard?.pending_withdrawals?.count || 0}
            subtitle={`$${dashboard?.pending_withdrawals?.total_usdc_to_send?.toFixed(2) || '0.00'} USDC to send`}
            icon={<ArrowDownLeft size={18} />}
            color="teal"
          />
          <StatCard
            title="Pending Feedback"
            value={dashboard?.feedback?.count || 0}
            subtitle="User reports & suggestions"
            icon={<FileText size={18} />}
            color={dashboard?.feedback?.count > 0 ? 'yellow' : 'gray'}
          />
          <Card padding="lg" className="md:col-span-2 lg:col-span-3 border-2">
            <h3 className="font-bold text-[#1A1A1A] mb-4">Totals</h3>
            <div className="flex gap-8 flex-wrap">
              <div>
                <p className="text-sm text-[#6B7280]">Platform fees earned</p>
                <p className="text-2xl font-bold text-[#16A34A]">${dashboard?.totals?.platform_fees_earned?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-sm text-[#6B7280]">Total USD Processed</p>
                <p className="text-2xl font-bold text-[#1A1A1A]">${dashboard?.totals?.total_usd_processed?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : activeQueue === 'feedback' ? (
        loading ? (
          <PageLoader message="Loading..." />
        ) : (
          <div className="space-y-4">
            {/* Feedback Filters */}
            <div className="flex gap-2">
              {['all', 'new', 'in_review', 'resolved', 'dismissed'].map(f => (
                <button
                  key={f}
                  onClick={() => setFeedbackFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    feedbackFilter === f
                      ? 'bg-teal text-white'
                      : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#ECECEC]'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'in_review' ? 'In Review' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {feedbackData.length === 0 ? (
              <Card padding="none" className="border-2 p-12 text-center">
                <div className="mb-4"><CheckCircle size={32} /></div>
                <p className="text-[#6B7280]">No feedback items</p>
              </Card>
            ) : (
              feedbackData.map(item => (
                <FeedbackItem
                  key={item.id}
                  item={item}
                  onUpdateStatus={updateFeedbackStatus}
                  loading={actionLoading === item.id}
                />
              ))
            )}
          </div>
        )
      ) : loading ? (
        <PageLoader message="Loading..." />
      ) : error ? (
        <Card padding="none" className="border-2 border-red-100 p-12 text-center">
          <div className="mb-4"><AlertTriangle size={32} /></div>
          <p className="text-[#DC2626] font-medium mb-2">{error}</p>
          <button
            onClick={() => { setError(null); fetchQueue(activeQueue); }}
            className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors text-sm"
          >
            Retry
          </button>
        </Card>
      ) : queueData.length === 0 ? (
        <Card padding="none" className="border-2 p-12 text-center">
          <div className="mb-4"><CheckCircle size={32} /></div>
          <p className="text-[#6B7280]">No items in this queue</p>
        </Card>
      ) : activeQueue === 'reports' ? (
        /* Report Queue Items */
        <div className="space-y-3">
          {queueData.map(item => (
            <ReportQueueItem
              key={item.id}
              report={item}
              onResolve={(report) => setReportResolveModal(report)}
              loading={actionLoading === item.id}
            />
          ))}
        </div>
      ) : (
        /* Queue Items */
        <div className="space-y-3">
          {queueData.map(item => (
            <QueueItem
              key={item.id}
              item={item}
              queue={activeQueue}
              onReleasePayment={() => releasePayment(item.id)}
              onCancelAssignment={() => confirmCancelAssignment(item.id)}
              loading={actionLoading === item.id}
            />
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmDialog
        open={!!confirmModal}
        title={confirmModal?.title}
        description={confirmModal?.message}
        confirmLabel="Confirm"
        variant="destructive"
        onConfirm={confirmModal?.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />

      {/* Report Resolve Modal */}
      {reportResolveModal && (
        <ReportResolveModal
          report={reportResolveModal}
          onClose={() => setReportResolveModal(null)}
          onConfirm={(data) => resolveReport(reportResolveModal.id, data)}
          loading={actionLoading === reportResolveModal.id}
        />
      )}
    </div>
  )
}

function StatCard({ title, value, subtitle, icon, color, alert }) {
  const colors = {
    yellow: 'bg-[#FEFCE8] border-yellow-200',
    red: 'bg-[#FEF2F2] border-red-200',
    blue: 'bg-[#EFF6FF] border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-[#F0FDF4] border-green-200',
    teal: 'bg-teal-50 border-teal-200',
    gray: 'bg-[#FAFAF8] border-[#ECECEC]',
  }

  return (
    <div className={`rounded-xl border-2 p-6 ${colors[color]} ${alert ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {alert && <span className="text-[#DC2626] text-xs font-bold">NEEDS ATTENTION</span>}
      </div>
      <p className="text-3xl font-bold text-[#1A1A1A]">{value}</p>
      <p className="text-sm text-[#6B7280] mt-1">{title}</p>
      <p className="text-xs text-[#9CA3AF] mt-0.5">{subtitle}</p>
    </div>
  )
}

function QueueItem({ item, queue, onReleasePayment, onCancelAssignment, loading }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card padding="none" className="border-2 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[#1A1A1A] truncate">
              {item.title || item.task?.title || `Task #${item.id?.substring(0, 8)}`}
            </h3>
            {item.hours_pending && (
              <span className={`px-2 py-0.5 rounded-[6px] text-xs font-medium ${
                item.hours_pending > 48 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {item.hours_pending}h pending
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[#6B7280]">
            {item.agent && <span>Agent: {item.agent.name || item.agent.email}</span>}
            {item.human && <span>Human: {item.human.name || item.human.email}</span>}
            {item.worker && <span>Human: {item.worker.name || item.worker.email}</span>}
            {item.expected_deposit && <span>Expected: ${item.expected_deposit.toFixed(2)}</span>}
            {item.worker_amount && <span>Amount: ${item.worker_amount}</span>}
          </div>

        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {queue === 'stale-deposits' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onCancelAssignment}
              disabled={loading}
            >
              {loading ? '...' : 'Cancel assignment'}
            </Button>
          )}

          {queue === 'pending-release' && (
            /* eslint-disable-next-line irlwork/no-inline-button-pattern -- success/green action not in Button variants */
            <button
              onClick={onReleasePayment}
              disabled={loading}
              className="px-3 py-1.5 bg-[#16A34A] text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '...' : 'Release payment'}
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1.5 text-[#9CA3AF] hover:text-[#6B7280]"
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#ECECEC]">
          <pre className="text-xs text-[#6B7280] overflow-auto max-h-48 bg-[#FAFAF8] p-3 rounded-lg">
            {JSON.stringify(item, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  )
}

const REASON_LABELS = {
  scam_fraud: 'Scam/Fraud',
  misleading: 'Misleading',
  inappropriate: 'Inappropriate',
  spam: 'Spam',
  illegal: 'Illegal Activity',
  harassment: 'Harassment',
  other: 'Other'
}

function ReportQueueItem({ report, onResolve, loading }) {
  const [expanded, setExpanded] = useState(false)

  const isSevere = ['scam_fraud', 'illegal'].includes(report.reason)

  return (
    <Card padding="none" className="border-2 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-[6px] text-xs font-medium ${
              isSevere ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {REASON_LABELS[report.reason] || report.reason}
            </span>
            <h3 className="font-bold text-[#1A1A1A] truncate">
              {report.task?.title || 'Unknown Task'}
            </h3>
            {report.task?.report_count > 1 && (
              <span className="px-2 py-0.5 rounded-[6px] text-xs bg-red-100 text-red-700 font-medium">
                {report.task.report_count} reports
              </span>
            )}
            {report.task?.escrow_status === 'deposited' && (
              <span className="px-2 py-0.5 rounded-[6px] text-xs bg-blue-100 text-blue-700 font-medium">
                Active Escrow
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[#6B7280]">
            <span>Task by: {report.task?.agent?.name || report.task?.agent?.email || 'Unknown'}</span>
            <span>Reporter: {report.reporter?.name || report.reporter?.email || 'Unknown'}</span>
            <span>{new Date(report.created_at).toLocaleDateString()}</span>
            {report.task?.agent?.total_reports_received > 1 && (
              <span className="text-red-500 font-medium">
                Creator has {report.task.agent.total_reports_received} total reports
              </span>
            )}
          </div>

          {expanded && (
            <div className="mt-3 p-3 bg-[#FAFAF8] rounded-lg text-sm text-[#6B7280]">
              <p className="font-medium text-[#1A1A1A] mb-1">Reporter's description:</p>
              <p className="whitespace-pre-wrap">{report.description}</p>
              {report.task?.agent?.warning_count > 0 && (
                <p className="mt-2 text-orange-600 text-xs font-medium">
                  Creator has {report.task.agent.warning_count} previous warning(s)
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <button
            onClick={() => onResolve(report)}
            disabled={loading}
            className="px-3 py-1.5 bg-teal text-white text-sm rounded-lg hover:bg-teal-dark disabled:opacity-50"
          >
            {loading ? '...' : 'Review'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1.5 text-[#9CA3AF] hover:text-[#6B7280]"
          >
            {expanded ? '\u25B2' : '\u25BC'}
          </button>
        </div>
      </div>
    </Card>
  )
}

const RESOLVE_ACTIONS = [
  { value: 'no_action', label: 'No action (dismiss)', color: 'gray' },
  { value: 'warning_issued', label: 'Issue warning to creator', color: 'yellow' },
  { value: 'task_hidden', label: 'Hide task from browse', color: 'orange' },
  { value: 'task_removed', label: 'Remove task + cancel', color: 'red' },
  { value: 'user_suspended', label: 'Suspend user', color: 'red' },
  { value: 'user_banned', label: 'Ban user', color: 'red' },
]

function ReportResolveModal({ report, onClose, onConfirm, loading }) {
  const toast = useToast()
  const [action, setAction] = useState('')
  const [notes, setNotes] = useState('')
  const [suspendDays, setSuspendDays] = useState(7)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!action) {
      toast.error('Please select an action')
      return
    }
    onConfirm({ action, notes, suspend_days: suspendDays })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Resolve Report</h2>
        <p className="text-sm text-[#6B7280] mb-4">Task: {report.task?.title}</p>

        {/* Report details */}
        <div className="bg-[#FAFAF8] rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded-[6px] text-xs font-medium ${
              ['scam_fraud', 'illegal'].includes(report.reason) ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {REASON_LABELS[report.reason] || report.reason}
            </span>
          </div>
          <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{report.description}</p>
          <div className="flex flex-wrap gap-x-4 mt-2 text-xs text-[#9CA3AF]">
            <span>{report.task?.report_count || 1} total report(s) on this task</span>
            <span>Creator: {report.task?.agent?.name || report.task?.agent?.email}</span>
            {report.task?.agent?.total_reports_received > 0 && (
              <span className="text-orange-500">{report.task.agent.total_reports_received} total reports on creator</span>
            )}
            {report.task?.agent?.warning_count > 0 && (
              <span className="text-orange-500">{report.task.agent.warning_count} warning(s)</span>
            )}
          </div>
        </div>

        {/* Escrow warning */}
        {report.task?.escrow_status === 'deposited' && (
          <div className="bg-[#EFF6FF] border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700">
            This task has active escrow. If you remove the task, you'll need to process a refund separately.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Action selection */}
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium text-[#1A1A1A]">Action</label>
            {RESOLVE_ACTIONS.map(a => (
              <label
                key={a.value}
                className={`flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                  action === a.value ? 'border-teal bg-teal/5' : 'border-[#ECECEC] hover:border-[#ECECEC]'
                }`}
              >
                <input
                  type="radio"
                  name="action"
                  value={a.value}
                  checked={action === a.value}
                  onChange={() => setAction(a.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-[#1A1A1A]">{a.label}</span>
              </label>
            ))}
          </div>

          {action === 'user_suspended' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Suspension Duration (days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={suspendDays}
                onChange={e => setSuspendDays(parseInt(e.target.value) || 7)}
                className="w-full px-4 py-2 border border-[#ECECEC] rounded-lg focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Admin Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-[#ECECEC] rounded-lg focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none resize-none"
              placeholder="Internal notes about this resolution..."
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={!action || loading}
              className="flex-1 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark disabled:opacity-50"
            >
              {loading ? 'Resolving...' : 'Resolve'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FeedbackItem({ item, onUpdateStatus, loading }) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(item.admin_notes || '')

  const urgencyStyles = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-yellow-100 text-yellow-700',
    normal: 'bg-teal/10 text-teal',
    low: 'bg-[#F3F4F6] text-[#6B7280]',
  }

  const statusStyles = {
    new: 'bg-blue-100 text-blue-700',
    in_review: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    dismissed: 'bg-[#F3F4F6] text-[#6B7280]',
  }

  const typeLabels = {
    feedback: 'Feedback',
    bug: 'Bug Report',
    feature_request: 'Feature Request',
    agent_error: 'Agent Error',
    other: 'Other',
  }

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    // eslint-disable-next-line irlwork/no-inline-card-pattern -- conditional urgency-based border color
    <div className={`bg-white rounded-xl border-2 p-4 transition-shadow hover:shadow-md ${
      item.urgency === 'critical' ? 'border-red-200' : 'border-[#ECECEC]'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2 py-0.5 rounded-[6px] text-xs font-semibold ${urgencyStyles[item.urgency]}`}>
              {item.urgency.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 rounded-[6px] text-xs font-medium ${statusStyles[item.status]}`}>
              {item.status === 'in_review' ? 'In Review' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </span>
            <span className="px-2 py-0.5 rounded-[6px] text-xs bg-[#F3F4F6] text-[#6B7280]">
              {typeLabels[item.type] || item.type}
            </span>
            <span className="text-xs text-[#9CA3AF]">{timeAgo(item.created_at)}</span>
          </div>

          {item.subject && (
            <h3 className="font-bold text-[#1A1A1A] mb-1">{item.subject}</h3>
          )}
          <p className="text-sm text-[#1A1A1A] line-clamp-2">{item.message}</p>

          <div className="flex items-center gap-3 mt-2 text-xs text-[#6B7280]">
            <span>{item.user_name || 'Unknown'}</span>
            <span className="px-1.5 py-0.5 rounded bg-[#F3F4F6]">{item.user_type || 'user'}</span>
            {item.user_email && <span>{item.user_email}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {item.status === 'new' && (
            <button
              onClick={() => onUpdateStatus(item.id, 'in_review')}
              disabled={loading}
              className="px-3 py-1.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-lg hover:bg-yellow-200 disabled:opacity-50"
            >
              Review
            </button>
          )}
          {(item.status === 'new' || item.status === 'in_review') && (
            <>
              {/* eslint-disable-next-line irlwork/no-inline-button-pattern -- soft green status action not in Button variants */}
              <button
                onClick={() => onUpdateStatus(item.id, 'resolved', notes)}
                disabled={loading}
                className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 disabled:opacity-50"
              >
                Resolve
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdateStatus(item.id, 'dismissed', notes)}
                disabled={loading}
              >
                Dismiss
              </Button>
            </>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1.5 text-[#9CA3AF] hover:text-[#6B7280]"
          >
            {expanded ? '\u25B2' : '\u25BC'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#ECECEC] space-y-3">
          {/* Full message */}
          <div>
            <p className="text-xs font-semibold text-[#6B7280] mb-1">Full Message</p>
            <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{item.message}</p>
          </div>

          {/* Images */}
          {item.image_urls && item.image_urls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] mb-2">Screenshots</p>
              <div className="flex gap-2 flex-wrap">
                {item.image_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border border-[#ECECEC] hover:shadow-md transition-shadow"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Page URL */}
          {item.page_url && (
            <div>
              <p className="text-xs font-semibold text-[#6B7280] mb-1">Page</p>
              <p className="text-xs text-[#9CA3AF] font-mono break-all">{item.page_url}</p>
            </div>
          )}

          {/* Agent Error Metadata */}
          {item.metadata && item.type === 'agent_error' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#6B7280]">Error Details</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {item.metadata.action && (
                  <div>
                    <span className="text-[#9CA3AF]">Action:</span>{' '}
                    <span className="font-mono text-[#1A1A1A]">{item.metadata.action}</span>
                  </div>
                )}
                {item.metadata.error_code && (
                  <div>
                    <span className="text-[#9CA3AF]">Error Code:</span>{' '}
                    <span className="font-mono text-[#DC2626]">{item.metadata.error_code}</span>
                  </div>
                )}
                {item.metadata.task_id && (
                  <div>
                    <span className="text-[#9CA3AF]">Task:</span>{' '}
                    <a href={`/tasks/${item.metadata.task_id}`} className="font-mono text-teal hover:underline">
                      {item.metadata.task_id.slice(0, 8)}...
                    </a>
                  </div>
                )}
              </div>
              {item.metadata.error_log && (
                <div>
                  <p className="text-xs font-semibold text-[#6B7280] mb-1">Error Log</p>
                  <pre className="text-xs text-[#6B7280] bg-[#FAFAF8] rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto font-mono whitespace-pre-wrap break-all">
                    {item.metadata.error_log}
                  </pre>
                </div>
              )}
              {item.metadata.context && (
                <div>
                  <p className="text-xs font-semibold text-[#6B7280] mb-1">Context</p>
                  <pre className="text-xs text-[#6B7280] bg-[#FAFAF8] rounded-lg p-3 overflow-x-auto max-h-32 overflow-y-auto font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(item.metadata.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Admin Notes */}
          <div>
            <p className="text-xs font-semibold text-[#6B7280] mb-1">Admin Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-[#ECECEC] rounded-lg focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none resize-none"
            />
            {notes !== (item.admin_notes || '') && (
              <button
                onClick={() => onUpdateStatus(item.id, item.status, notes)}
                disabled={loading}
                className="mt-1 px-3 py-1 bg-teal text-white text-xs rounded-lg hover:bg-teal-dark disabled:opacity-50"
              >
                Save Notes
              </button>
            )}
          </div>

          {/* Metadata */}
          {item.resolved_at && (
            <p className="text-xs text-[#9CA3AF]">
              Resolved: {new Date(item.resolved_at).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
