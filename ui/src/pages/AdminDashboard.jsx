import { useState, useEffect, useCallback } from 'react'
import API_URL from '../config/api'

/**
 * Admin Dashboard - Phase 1 Manual Operations
 * Only accessible to users with admin privileges
 */
export default function AdminDashboard({ user }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeQueue, setActiveQueue] = useState('dashboard')
  const [dashboard, setDashboard] = useState(null)
  const [queueData, setQueueData] = useState([])
  const [actionLoading, setActionLoading] = useState(null)
  const [actionModal, setActionModal] = useState(null)

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
      const endpoints = {
        'pending-deposits': '/admin/tasks/pending-deposits',
        'stale-deposits': '/admin/tasks/stale-deposits',
        'pending-agent-approval': '/admin/tasks/pending-agent-approval',
        'pending-release': '/admin/tasks/pending-release',
        'pending-withdrawals': '/admin/payments/pending-withdrawals'
      }

      const res = await fetch(`${API_URL}${endpoints[queue]}`, {
        headers: { Authorization: user.id }
      })
      if (!res.ok) throw new Error('Failed to fetch queue')
      const data = await res.json()
      setQueueData(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user.id])

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
      alert(err.message)
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
      alert(err.message)
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
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const cancelAssignment = async (taskId) => {
    if (!confirm('Cancel this assignment? The task will become open again.')) return

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
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

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

  const queues = [
    { id: 'dashboard', label: 'Overview', icon: '📊' },
    { id: 'pending-deposits', label: 'Pending Deposits', icon: '💰', count: dashboard?.pending_deposits?.count },
    { id: 'stale-deposits', label: 'Stale (>48h)', icon: '⚠️', count: dashboard?.stale_deposits_48h?.count, alert: dashboard?.stale_deposits_48h?.alert },
    { id: 'pending-agent-approval', label: 'Awaiting Agent', icon: '👤', count: dashboard?.pending_agent_approval?.count },
    { id: 'pending-release', label: 'Ready to Release', icon: '✅', count: dashboard?.pending_release?.count },
    { id: 'pending-withdrawals', label: 'Pending Withdrawals', icon: '💸', count: dashboard?.pending_withdrawals?.count },
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
            title="Pending Deposits"
            value={dashboard?.pending_deposits?.count || 0}
            subtitle={`$${dashboard?.pending_deposits?.total_usdc?.toFixed(2) || '0.00'} USDC expected`}
            icon="💰"
            color="yellow"
          />
          <StatCard
            title="Stale Deposits (>48h)"
            value={dashboard?.stale_deposits_48h?.count || 0}
            subtitle="Needs attention"
            icon="⚠️"
            color={dashboard?.stale_deposits_48h?.count > 0 ? 'red' : 'gray'}
            alert={dashboard?.stale_deposits_48h?.count > 0}
          />
          <StatCard
            title="Work In Progress"
            value={dashboard?.work_in_progress?.count || 0}
            subtitle={`$${dashboard?.work_in_progress?.total_usdc_held?.toFixed(2) || '0.00'} USDC held`}
            icon="🔨"
            color="blue"
          />
          <StatCard
            title="Awaiting Agent Approval"
            value={dashboard?.pending_agent_approval?.count || 0}
            subtitle="Proofs submitted"
            icon="👤"
            color="purple"
          />
          <StatCard
            title="Ready to Release"
            value={dashboard?.pending_release?.count || 0}
            subtitle={`$${dashboard?.pending_release?.total_usdc_to_release?.toFixed(2) || '0.00'} USDC`}
            icon="✅"
            color="green"
          />
          <StatCard
            title="Pending Withdrawals"
            value={dashboard?.pending_withdrawals?.count || 0}
            subtitle={`$${dashboard?.pending_withdrawals?.total_usdc_to_send?.toFixed(2) || '0.00'} USDC to send`}
            icon="💸"
            color="teal"
          />
          <div className="md:col-span-2 lg:col-span-3 bg-white rounded-xl border-2 border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Totals</h3>
            <div className="flex gap-8">
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
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : queueData.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-gray-100 p-12 text-center">
          <div className="text-4xl mb-4">✨</div>
          <p className="text-gray-500">No items in this queue</p>
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
              onCancelAssignment={() => cancelAssignment(item.id)}
              loading={actionLoading === item.id}
              setActionModal={setActionModal}
            />
          ))}
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
            {item.human && <span>Worker: {item.human.name || item.human.email}</span>}
            {item.worker && <span>Worker: {item.worker.name || item.worker.email}</span>}
            {item.expected_deposit && <span>Expected: ${item.expected_deposit.toFixed(2)}</span>}
            {item.worker_amount && <span>Amount: ${item.worker_amount}</span>}
          </div>

          {item.platform_wallet && (
            <div className="mt-2 text-xs text-gray-400 font-mono">
              Deposit to: {item.platform_wallet}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
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
  const [txHash, setTxHash] = useState('')
  const [amount, setAmount] = useState(item.expected_deposit || item.worker_amount || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!txHash) {
      alert('Transaction hash is required')
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
