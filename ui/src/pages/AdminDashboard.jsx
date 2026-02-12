import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Flag, DollarSign, AlertTriangle, User, CheckCircle, ArrowDownLeft, FileText, Hammer } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import API_URL from '../config/api'

/**
 * Admin Dashboard - Phase 1 Manual Operations
 * Only accessible to users with admin privileges
 */
export default function AdminDashboard({ user }) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeQueue, setActiveQueue] = useState('dashboard')
  const [dashboard, setDashboard] = useState(null)
  const [queueData, setQueueData] = useState([])
  const [actionLoading, setActionLoading] = useState(null)
  const [actionModal, setActionModal] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [reportResolveModal, setReportResolveModal] = useState(null)
  const [feedbackData, setFeedbackData] = useState([])
  const [feedbackFilter, setFeedbackFilter] = useState('all')

  // Fetch dashboard summary
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: user.id }
      })
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
  }, [user.id])

  // Fetch queue data
  const fetchQueue = useCallback(async (queue) => {
    if (queue === 'dashboard') return

    setLoading(true)
    try {
      if (queue === 'feedback') {
        const statusParam = feedbackFilter !== 'all' ? `?status=${feedbackFilter}` : ''
        const res = await fetch(`${API_URL}/admin/feedback${statusParam}`, {
          headers: { Authorization: user.id }
        })
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
        'pending-withdrawals': '/admin/payments/pending-withdrawals',
        'reports': '/admin/reports?status=pending'
      }

      const res = await fetch(`${API_URL}${endpoints[queue]}`, {
        headers: { Authorization: user.id }
      })
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
  }, [user.id, feedbackFilter])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  useEffect(() => {
    if (activeQueue !== 'dashboard') {
      fetchQueue(activeQueue)
    }
  }, [activeQueue, fetchQueue])

  // Action handlers
  const confirmDeposit = async (taskId, txHash, amount) => {
    setActionLoading(taskId)
    try {
      const res = await fetch(`${API_URL}/admin/tasks/${taskId}/confirm-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
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
      const res = await fetch(`${API_URL}/admin/tasks/${taskId}/release-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
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
      const res = await fetch(`${API_URL}/admin/payments/${paymentId}/confirm-withdrawal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
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
      title: 'Cancel Assignment',
      message: 'Cancel this assignment? The task will become open again.',
      onConfirm: () => { setConfirmModal(null); executeCancelAssignment(taskId) }
    })
  }

  const executeCancelAssignment = async (taskId) => {
    setActionLoading(taskId)
    try {
      const res = await fetch(`${API_URL}/admin/tasks/${taskId}/cancel-assignment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
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
      const res = await fetch(`${API_URL}/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
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
      const res = await fetch(`${API_URL}/admin/feedback/${feedbackId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
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
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    )
  }

  if (error && !dashboard) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4"><AlertTriangle size={48} /></div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-500 mb-4">{error}</p>
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

  const queues = [
    { id: 'dashboard', label: 'Overview', icon: <BarChart3 size={16} /> },
    { id: 'reports', label: 'Reports', icon: <Flag size={16} />, count: dashboard?.pending_reports?.count, alert: dashboard?.pending_reports?.count > 0 },
    { id: 'pending-deposits', label: 'Pending Deposits', icon: <DollarSign size={16} />, count: dashboard?.pending_deposits?.count },
    { id: 'stale-deposits', label: 'Stale (>48h)', icon: <AlertTriangle size={16} />, count: dashboard?.stale_deposits_48h?.count, alert: dashboard?.stale_deposits_48h?.alert },
    { id: 'pending-agent-approval', label: 'Awaiting Agent', icon: <User size={16} />, count: dashboard?.pending_agent_approval?.count },
    { id: 'pending-release', label: 'Ready to Release', icon: <CheckCircle size={16} />, count: dashboard?.pending_release?.count },
    { id: 'pending-withdrawals', label: 'Pending Withdrawals', icon: <ArrowDownLeft size={16} />, count: dashboard?.pending_withdrawals?.count },
    { id: 'feedback', label: 'Feedback', icon: <FileText size={16} />, count: dashboard?.feedback?.count },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Phase 1 Manual Operations</p>
        </div>
        <button
          onClick={() => { fetchDashboard(); if (activeQueue !== 'dashboard') fetchQueue(activeQueue); }}
          className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Queue Tabs */}
      <div className="flex flex-wrap gap-2">
        {queues.map(queue => (
          <button
            key={queue.id}
            onClick={() => setActiveQueue(queue.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeQueue === queue.id
                ? 'bg-teal text-white'
                : queue.alert
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{queue.icon}</span>
            <span>{queue.label}</span>
            {queue.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeQueue === queue.id ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {queue.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && activeQueue === 'dashboard' ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
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
            title="Work In Progress"
            value={dashboard?.work_in_progress?.count || 0}
            subtitle={`$${dashboard?.work_in_progress?.total_usdc_held?.toFixed(2) || '0.00'} USDC held`}
            icon={<Hammer size={18} />}
            color="blue"
          />
          <StatCard
            title="Awaiting Agent Approval"
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
          <div className="md:col-span-2 lg:col-span-3 bg-white rounded-xl border-2 border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Totals</h3>
            <div className="flex gap-8 flex-wrap">
              <div>
                <p className="text-sm text-gray-500">Platform Fees Earned</p>
                <p className="text-2xl font-bold text-green-600">${dashboard?.totals?.platform_fees_earned?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total USDC Processed</p>
                <p className="text-2xl font-bold text-gray-900">${dashboard?.totals?.total_usdc_processed?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>
        </div>
      ) : activeQueue === 'feedback' ? (
        loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading...</div>
          </div>
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
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'in_review' ? 'In Review' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {feedbackData.length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-gray-100 p-12 text-center">
                <div className="mb-4"><CheckCircle size={32} /></div>
                <p className="text-gray-500">No feedback items</p>
              </div>
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
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border-2 border-red-100 p-12 text-center">
          <div className="mb-4"><AlertTriangle size={32} /></div>
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <button
            onClick={() => { setError(null); fetchQueue(activeQueue); }}
            className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      ) : queueData.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-gray-100 p-12 text-center">
          <div className="mb-4"><CheckCircle size={32} /></div>
          <p className="text-gray-500">No items in this queue</p>
        </div>
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
              onConfirmDeposit={(txHash, amount) => confirmDeposit(item.id, txHash, amount)}
              onReleasePayment={() => releasePayment(item.id)}
              onConfirmWithdrawal={(txHash, amount) => confirmWithdrawal(item.id, txHash, amount)}
              onCancelAssignment={() => confirmCancelAssignment(item.id)}
              loading={actionLoading === item.id}
              setActionModal={setActionModal}
            />
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h2>
            <p className="text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button onClick={confirmModal.onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <ActionModal
          type={actionModal.type}
          item={actionModal.item}
          onClose={() => setActionModal(null)}
          onConfirm={actionModal.onConfirm}
          loading={actionLoading === actionModal.item.id}
        />
      )}

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
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-green-50 border-green-200',
    teal: 'bg-teal-50 border-teal-200',
    gray: 'bg-gray-50 border-gray-200',
  }

  return (
    <div className={`rounded-xl border-2 p-6 ${colors[color]} ${alert ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {alert && <span className="text-red-600 text-xs font-bold">NEEDS ATTENTION</span>}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  )
}

function QueueItem({ item, queue, onConfirmDeposit, onReleasePayment, onConfirmWithdrawal, onCancelAssignment, loading, setActionModal }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-xl border-2 border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 truncate">
              {item.title || item.task?.title || `Task #${item.id?.substring(0, 8)}`}
            </h3>
            {item.hours_pending && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                item.hours_pending > 48 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {item.hours_pending}h pending
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
            {item.agent && <span>Agent: {item.agent.name || item.agent.email}</span>}
            {item.human && <span>Human: {item.human.name || item.human.email}</span>}
            {item.worker && <span>Human: {item.worker.name || item.worker.email}</span>}
            {item.expected_deposit && <span>Expected: ${item.expected_deposit.toFixed(2)}</span>}
            {item.worker_amount && <span>Amount: ${item.worker_amount}</span>}
          </div>

          {item.platform_wallet && (
            <div className="mt-2 text-xs text-gray-400 font-mono">
              Deposit to: {item.platform_wallet}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {queue === 'pending-deposits' && (
            <>
              <button
                onClick={() => setActionModal({
                  type: 'confirm-deposit',
                  item,
                  onConfirm: onConfirmDeposit
                })}
                disabled={loading}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '...' : 'Confirm Deposit'}
              </button>
              <button
                onClick={onCancelAssignment}
                disabled={loading}
                className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}

          {queue === 'stale-deposits' && (
            <button
              onClick={onCancelAssignment}
              disabled={loading}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? '...' : 'Cancel Assignment'}
            </button>
          )}

          {queue === 'pending-release' && (
            <button
              onClick={onReleasePayment}
              disabled={loading}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '...' : 'Release Payment'}
            </button>
          )}

          {queue === 'pending-withdrawals' && (
            <button
              onClick={() => setActionModal({
                type: 'confirm-withdrawal',
                item,
                onConfirm: onConfirmWithdrawal
              })}
              disabled={loading}
              className="px-3 py-1.5 bg-teal text-white text-sm rounded-lg hover:bg-teal-dark disabled:opacity-50"
            >
              {loading ? '...' : 'Confirm Sent'}
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1.5 text-gray-400 hover:text-gray-600"
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <pre className="text-xs text-gray-500 overflow-auto max-h-48 bg-gray-50 p-3 rounded-lg">
            {JSON.stringify(item, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function ActionModal({ type, item, onClose, onConfirm, loading }) {
  const toast = useToast()
  const [txHash, setTxHash] = useState('')
  const [amount, setAmount] = useState(item.expected_deposit || item.worker_amount || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!txHash) {
      toast.error('Transaction hash is required')
      return
    }
    onConfirm(txHash, amount)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {type === 'confirm-deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Hash
            </label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (USDC)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">
          <a
            href={`https://basescan.org`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal hover:underline"
          >
            Open BaseScan
          </a>
        </p>
      </div>
    </div>
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
    <div className="bg-white rounded-xl border-2 border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isSevere ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {REASON_LABELS[report.reason] || report.reason}
            </span>
            <h3 className="font-bold text-gray-900 truncate">
              {report.task?.title || 'Unknown Task'}
            </h3>
            {report.task?.report_count > 1 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">
                {report.task.report_count} reports
              </span>
            )}
            {report.task?.escrow_status === 'deposited' && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                Active Escrow
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
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
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-1">Reporter's description:</p>
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
            className="px-2 py-1.5 text-gray-400 hover:text-gray-600"
          >
            {expanded ? '\u25B2' : '\u25BC'}
          </button>
        </div>
      </div>
    </div>
  )
}

const RESOLVE_ACTIONS = [
  { value: 'no_action', label: 'No Action (Dismiss)', color: 'gray' },
  { value: 'warning_issued', label: 'Issue Warning to Creator', color: 'yellow' },
  { value: 'task_hidden', label: 'Hide Task from Browse', color: 'orange' },
  { value: 'task_removed', label: 'Remove Task + Cancel', color: 'red' },
  { value: 'user_suspended', label: 'Suspend User', color: 'red' },
  { value: 'user_banned', label: 'Ban User', color: 'red' },
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
        <h2 className="text-xl font-bold text-gray-900 mb-2">Resolve Report</h2>
        <p className="text-sm text-gray-500 mb-4">Task: {report.task?.title}</p>

        {/* Report details */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              ['scam_fraud', 'illegal'].includes(report.reason) ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {REASON_LABELS[report.reason] || report.reason}
            </span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.description}</p>
          <div className="flex flex-wrap gap-x-4 mt-2 text-xs text-gray-400">
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700">
            This task has active escrow. If you remove the task, you'll need to process a refund separately.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Action selection */}
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium text-gray-700">Action</label>
            {RESOLVE_ACTIONS.map(a => (
              <label
                key={a.value}
                className={`flex items-center gap-3 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                  action === a.value ? 'border-teal bg-teal/5' : 'border-gray-100 hover:border-gray-200'
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
                <span className="text-sm font-medium text-gray-700">{a.label}</span>
              </label>
            ))}
          </div>

          {action === 'user_suspended' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Suspension Duration (days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={suspendDays}
                onChange={e => setSuspendDays(parseInt(e.target.value) || 7)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none resize-none"
              placeholder="Internal notes about this resolution..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
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
    low: 'bg-gray-100 text-gray-500',
  }

  const statusStyles = {
    new: 'bg-blue-100 text-blue-700',
    in_review: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    dismissed: 'bg-gray-100 text-gray-500',
  }

  const typeLabels = {
    feedback: 'Feedback',
    bug: 'Bug Report',
    feature_request: 'Feature Request',
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
    <div className={`bg-white rounded-xl border-2 p-4 transition-shadow hover:shadow-md ${
      item.urgency === 'critical' ? 'border-red-200' : 'border-gray-100'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${urgencyStyles[item.urgency]}`}>
              {item.urgency.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[item.status]}`}>
              {item.status === 'in_review' ? 'In Review' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
              {typeLabels[item.type] || item.type}
            </span>
            <span className="text-xs text-gray-400">{timeAgo(item.created_at)}</span>
          </div>

          {item.subject && (
            <h3 className="font-bold text-gray-900 mb-1">{item.subject}</h3>
          )}
          <p className="text-sm text-gray-700 line-clamp-2">{item.message}</p>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>{item.user_name || 'Unknown'}</span>
            <span className="px-1.5 py-0.5 rounded bg-gray-100">{item.user_type || 'user'}</span>
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
              <button
                onClick={() => onUpdateStatus(item.id, 'resolved', notes)}
                disabled={loading}
                className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 disabled:opacity-50"
              >
                Resolve
              </button>
              <button
                onClick={() => onUpdateStatus(item.id, 'dismissed', notes)}
                disabled={loading}
                className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Dismiss
              </button>
            </>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1.5 text-gray-400 hover:text-gray-600"
          >
            {expanded ? '\u25B2' : '\u25BC'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {/* Full message */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Full Message</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.message}</p>
          </div>

          {/* Images */}
          {item.image_urls && item.image_urls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Screenshots</p>
              <div className="flex gap-2 flex-wrap">
                {item.image_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Page URL */}
          {item.page_url && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Page</p>
              <p className="text-xs text-gray-400 font-mono break-all">{item.page_url}</p>
            </div>
          )}

          {/* Admin Notes */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Admin Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none resize-none"
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
            <p className="text-xs text-gray-400">
              Resolved: {new Date(item.resolved_at).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
