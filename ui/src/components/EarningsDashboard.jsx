import { useState, useEffect } from 'react'
import { Timer, CreditCard, ArrowDownLeft, ChevronDown, Landmark, Wallet, ChevronRight, X } from 'lucide-react'
import API_URL from '../config/api'
import { useToast } from '../context/ToastContext'
import { supabase } from '../context/AuthContext'
import ConnectBankButton from './ConnectBankButton'
import ConnectWalletSection from './ConnectWalletSection'
import { EmptyState, ConfirmDialog, Card } from './ui'

function PaymentFlowDiagram() {
  return (
    <div className="earnings-flow-diagram">
      <div className="earnings-flow-step">
        <div className="earnings-flow-icon earnings-flow-icon--teal">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div className="earnings-flow-label">Complete task</div>
      </div>
      <div className="earnings-flow-arrow">
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
          <path d="M0 6h16M14 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="earnings-flow-step">
        <div className="earnings-flow-icon earnings-flow-icon--amber">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div className="earnings-flow-label">48hr review hold</div>
      </div>
      <div className="earnings-flow-arrow">
        <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
          <path d="M0 6h16M14 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="earnings-flow-step">
        <div className="earnings-flow-icon earnings-flow-icon--green">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        </div>
        <div className="earnings-flow-label">Available to withdraw</div>
      </div>
    </div>
  )
}

function EarningsDashboard({ user }) {
  const toast = useToast()
  const [balanceData, setBalanceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawResult, setWithdrawResult] = useState(null)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [balanceFilter, setBalanceFilter] = useState('all')
  const [showFlowDiagram, setShowFlowDiagram] = useState(true)
  const [expandedPayout, setExpandedPayout] = useState('bank')
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [bankStatus, setBankStatus] = useState(null)
  const [walletStatus, setWalletStatus] = useState(null)

  useEffect(() => {
    if (!user?.id || !user?.token) {
      setLoading(false)
      return
    }
    fetchBalance()
    fetchBankStatus()
    fetchWalletStatus()
  }, [user?.id, user?.token])

  const fetchBalance = async () => {
    if (!user?.id || !user?.token) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      let token = user.token || ''
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          token = session.access_token
        }
      }
      const res = await fetch(`${API_URL}/wallet/balance`, {
        headers: { Authorization: token }
      })
      if (!res.ok) throw new Error('Failed to fetch balance')
      const data = await res.json()
      setBalanceData(data)
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching balance:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchBankStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/stripe/connect/status`, {
        headers: { Authorization: user.token || '' },
      })
      if (res.ok) setBankStatus(await res.json())
    } catch (e) {
      console.error('Failed to fetch bank status:', e)
    }
  }

  const fetchWalletStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/wallet/address`, {
        headers: { Authorization: user.token || '' },
      })
      if (res.ok) setWalletStatus(await res.json())
    } catch (e) {
      console.error('Failed to fetch wallet status:', e)
    }
  }

  const handleWithdraw = (method) => {
    if (!balanceData?.available_cents || balanceData.available_cents <= 0) {
      toast.error('No funds available to withdraw')
      return
    }
    setShowWithdrawModal(false)
    setShowWithdrawConfirm(method)
  }

  const executeWithdraw = async () => {
    const method = showWithdrawConfirm
    setShowWithdrawConfirm(false)

    const withdrawAmountCents = method === 'usdc'
      ? (balanceData.usdc_available_cents || 0)
      : (balanceData.stripe_available_cents || balanceData.available_cents)

    try {
      setWithdrawing(true)
      setWithdrawResult(null)

      let token = user.token || ''
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          token = session.access_token
        }
      }
      const res = await fetch(`${API_URL}/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount_cents: withdrawAmountCents,
          method
        })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Withdrawal failed')

      setWithdrawResult({ ...result, method })
      setTimeout(() => {
        fetchBalance()
        setWithdrawResult(null)
      }, 3000)
    } catch (err) {
      toast.error(`Withdrawal failed: ${err.message}`)
      console.error('Withdrawal error:', err)
    } finally {
      setWithdrawing(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date - now
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 0) return 'Available now'
    else if (diffHours < 24) return `${diffHours}h remaining`
    else {
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}d ${diffHours % 24}h`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#333333]">Loading balance...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[rgba(255,95,87,0.1)] border border-[#FF5F57]/20 rounded-xl p-4">
        <p className="text-[#FF5F57]">Error: {error}</p>
        <button
          onClick={fetchBalance}
          className="mt-2 text-sm text-[#FF5F57] hover:text-[#B91C1C] underline"
        >
          Retry loading balance
        </button>
      </div>
    )
  }

  const allTransactions = balanceData?.transactions || []
  const stripeAvailable = (balanceData?.stripe_available_cents || 0) / 100
  const usdcAvailable = (balanceData?.usdc_available_cents || 0) / 100
  const bankWithdrawAmount = stripeAvailable > 0
    ? stripeAvailable
    : Math.max(0, (balanceData?.available || 0) - usdcAvailable)

  const filteredPendingTransactions = allTransactions.filter(tx => {
    if (tx.status !== 'pending') return false
    if (balanceFilter === 'all') return true
    if (balanceFilter === 'usdc') return tx.payout_method === 'usdc'
    return tx.payout_method !== 'usdc'
  })

  const filteredAvailableTransactions = allTransactions.filter(tx => {
    if (tx.status !== 'available') return false
    if (balanceFilter === 'all') return true
    if (balanceFilter === 'usdc') return tx.payout_method === 'usdc'
    return tx.payout_method !== 'usdc'
  })

  const filteredPendingAmount = balanceFilter === 'all'
    ? (balanceData?.pending || 0)
    : filteredPendingTransactions.reduce((sum, tx) => sum + (tx.amount_cents || 0), 0) / 100

  const filteredAvailableAmount = balanceFilter === 'all'
    ? (balanceData?.available || 0)
    : balanceFilter === 'usdc'
      ? usdcAvailable
      : stripeAvailable || (balanceData?.available || 0) - usdcAvailable

  // Transaction history: only completed (available + withdrawn)
  const completedTransactions = allTransactions.filter(tx =>
    tx.status === 'available' || tx.status === 'withdrawn'
  )

  const bankReady = bankStatus?.connected && bankStatus?.payouts_enabled
  const walletReady = !!walletStatus?.wallet_address

  return (
    <div className="space-y-5 md:space-y-7">

      {/* ── How payments work (top of page) ── */}
      <div>
        <button
          className={`earnings-flow-toggle ${showFlowDiagram ? 'expanded' : ''}`}
          onClick={() => setShowFlowDiagram(!showFlowDiagram)}
        >
          How payments work
          <ChevronDown size={14} />
        </button>
        {showFlowDiagram && <PaymentFlowDiagram />}
      </div>

      {/* ── Balance Cards ── */}
      <div>
        {/* Header with filter pills right-aligned */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A]">Balance</h3>
          <div className="flex items-center gap-1.5">
            {[
              { key: 'all', label: 'All' },
              { key: 'stripe', label: 'Bank' },
              { key: 'usdc', label: 'USDC' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setBalanceFilter(opt.key)}
                className={`
                  px-2.5 py-1 text-xs font-semibold rounded-md transition-all
                  ${balanceFilter === opt.key
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-[#F5F3F0] text-[#888888] hover:bg-[#EDEBE8] hover:text-[#525252]'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {/* Pending Balance Card */}
          <Card padding="none" className="p-3 md:p-6">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div>
                <h3 className="text-[#888888] text-xs font-medium uppercase tracking-wider">Pending</h3>
                <p className="text-[10px] md:text-xs text-[#A3A3A3] mt-0.5">48-hour hold</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#F5F3F0] rounded-lg flex items-center justify-center">
                <Timer size={16} className="text-[#888888]" />
              </div>
            </div>

            <p className="text-xl md:text-4xl font-bold text-[#1A1A1A] tracking-tight">
              ${filteredPendingAmount.toFixed(2)}
            </p>

            {filteredPendingTransactions.length > 0 ? (
              <div className="mt-2 md:mt-4 space-y-1.5 hidden md:block">
                {filteredPendingTransactions.slice(0, 3).map(tx => (
                  <div key={tx.id} className="flex justify-between items-center text-xs py-2 border-t border-[rgba(0,0,0,0.06)]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[#333333] truncate">{tx.task_title || `Task #${tx.task_id?.substring(0, 8)}`}</p>
                        {tx.payout_method === 'usdc' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB]">USDC</span>
                        )}
                      </div>
                      <p className="text-xs text-[#A3A3A3]">{formatDate(tx.clears_at)}</p>
                    </div>
                    <p className="text-[#1A1A1A] font-semibold">${(tx.amount_cents / 100).toFixed(2)}</p>
                  </div>
                ))}
                {filteredPendingTransactions.length > 3 && (
                  <p className="text-xs text-[#A3A3A3] text-center pt-1">
                    +{filteredPendingTransactions.length - 3} more pending
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[#A3A3A3] text-[11px] md:text-sm mt-2 md:mt-4">No pending transactions</p>
            )}
          </Card>

          {/* Available Balance Card */}
          <Card padding="none" className="p-3 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-teal" />
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div>
                <h3 className="text-teal text-xs font-medium uppercase tracking-wider">Available</h3>
                <p className="text-[10px] md:text-xs text-[#A3A3A3] mt-0.5">Ready to withdraw</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-teal/8 rounded-lg flex items-center justify-center">
                <CreditCard size={16} className="text-teal" />
              </div>
            </div>

            <p className="text-xl md:text-4xl font-bold text-[#1A1A1A] tracking-tight">
              ${filteredAvailableAmount.toFixed(2)}
            </p>

            {(!balanceData?.available_cents || balanceData.available_cents <= 0) && (
              <p className="text-[#A3A3A3] text-[11px] md:text-sm mt-2 md:mt-4">No funds available yet</p>
            )}

            {filteredAvailableTransactions.length > 0 && (
              <div className="mt-2 md:mt-4 space-y-1.5 hidden md:block">
                {filteredAvailableTransactions.slice(0, 2).map(tx => (
                  <div key={tx.id} className="flex justify-between items-center text-xs py-2 border-t border-[rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[#333333] truncate">{tx.task_title || `Task #${tx.task_id?.substring(0, 8)}`}</p>
                      {tx.payout_method === 'usdc' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB]">USDC</span>
                      )}
                    </div>
                    <p className="text-[#1A1A1A] font-semibold">${(tx.amount_cents / 100).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Withdraw button */}
        {balanceData?.available_cents > 0 && (
          <div className="mt-4">
            {/* eslint-disable-next-line irlwork/no-inline-button-pattern -- withdraw CTA needs brand teal */}
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={withdrawing}
              className="w-full py-3 bg-teal hover:bg-[#048A5B] disabled:bg-[#9ca3af] text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <ArrowDownLeft size={16} />
              {withdrawing ? 'Processing...' : 'Withdraw funds'}
            </button>
          </div>
        )}
      </div>

      {/* Success Message */}
      {withdrawResult && (
        <Card padding="none" className="border-teal/20 p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-teal/8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-[#1A1A1A] font-semibold text-sm">Withdrawal successful</p>
            <p className="text-sm text-[#333333] mt-0.5">
              {withdrawResult.method === 'usdc'
                ? `${withdrawResult.amount} USDC sent to your wallet`
                : `$${withdrawResult.amount || withdrawResult.amount_withdrawn} is being transferred to your bank account`}
            </p>
          </div>
        </Card>
      )}

      {/* ── Payout Options — collapsible rows ── */}
      <div>
        <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Payout options</h3>
        <div className="space-y-2">
          {/* Bank Transfer row — standout design */}
          {/* eslint-disable-next-line irlwork/no-inline-card-pattern -- bank transfer standout uses custom gradient */}
          <div className={`overflow-hidden rounded-xl border-2 transition-all ${
            expandedPayout === 'bank'
              ? 'border-[#059669]/25 bg-gradient-to-br from-[#F0FDF4] via-white to-white shadow-sm'
              : 'border-[#059669]/15 bg-[#FAFFF8] hover:border-[#059669]/20'
          }`}>
            {/* eslint-disable-next-line irlwork/no-inline-button-pattern -- bank payout standout header */}
            <button
              onClick={() => setExpandedPayout(expandedPayout === 'bank' ? null : 'bank')}
              className="w-full flex items-center gap-3 p-4 text-left transition-colors"
            >
              <div className="w-10 h-10 bg-[#D1FAE5] rounded-xl flex items-center justify-center flex-shrink-0">
                <Landmark size={20} className="text-[#059669]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-[#1A1A1A] font-bold text-sm">Bank transfer</h4>
                  <span className="px-2 py-0.5 bg-[#059669] text-white text-[10px] font-bold rounded-full uppercase tracking-wider">Recommended</span>
                </div>
                <p className="text-xs text-[#525252] mt-0.5">Direct deposit via Stripe · 2-3 business days</p>
              </div>
              <ChevronRight
                size={16}
                className={`text-[#059669] transition-transform duration-200 flex-shrink-0 ${expandedPayout === 'bank' ? 'rotate-90' : ''}`}
              />
            </button>
            {expandedPayout === 'bank' && (
              <div className="px-4 pb-5 pt-0 border-t border-[#059669]/10">
                <div className="pt-4">
                  <ConnectBankButton user={user} />
                </div>
              </div>
            )}
          </div>

          {/* USDC row */}
          <Card padding="none" className="overflow-hidden">
            {/* eslint-disable-next-line irlwork/no-inline-button-pattern -- wallet payout accordion header */}
            <button
              onClick={() => setExpandedPayout(expandedPayout === 'usdc' ? null : 'usdc')}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#FAFAF9] transition-colors"
            >
              <div className="w-9 h-9 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet size={18} className="text-[#6366f1]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[#1A1A1A] font-semibold text-sm">USDC</h4>
                <p className="text-xs text-[#888888]">Base network wallet · Instant</p>
              </div>
              <ChevronRight
                size={16}
                className={`text-[#A3A3A3] transition-transform duration-200 flex-shrink-0 ${expandedPayout === 'usdc' ? 'rotate-90' : ''}`}
              />
            </button>
            {expandedPayout === 'usdc' && (
              <div className="px-4 pb-4 pt-0 border-t border-[rgba(0,0,0,0.06)]">
                <div className="pt-4">
                  <ConnectWalletSection user={user} />
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Transaction History (completed tasks only) ── */}
      <div>
        <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Completed tasks</h3>

        {completedTransactions.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {completedTransactions.map(tx => {
              const isAvailable = tx.status === 'available'
              const isWithdrawn = tx.status === 'withdrawn'
              const isUsdc = tx.payout_method === 'usdc'
              const taskUrl = tx.task_id ? `/tasks/${tx.task_id}` : null

              const cardContent = (
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[#1A1A1A] font-medium text-sm md:text-base truncate">
                        {tx.task_title || `Task #${tx.task_id?.substring(0, 8)}`}
                      </p>
                      <span className={`
                        px-2 py-0.5 rounded text-[11px] font-medium flex-shrink-0
                        ${isAvailable ? 'bg-teal/8 text-teal' : ''}
                        ${isWithdrawn ? 'bg-[#F5F3F0] text-[#525252]' : ''}
                      `}>
                        {isAvailable ? 'Ready to withdraw' : 'Withdrawn'}
                      </span>
                      {isUsdc ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] flex-shrink-0">
                          USDC
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F5F2ED] text-[#8A8A8A] flex-shrink-0">
                          Bank
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-[#888888]">
                        Completed {new Date(tx.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      {isWithdrawn && tx.withdrawn_at && (
                        <p className="text-xs text-[#A3A3A3]">
                          Paid {new Date(tx.withdrawn_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <p className={`
                      text-lg md:text-xl font-bold
                      ${isAvailable ? 'text-teal' : ''}
                      ${isWithdrawn ? 'text-[#888888]' : ''}
                    `}>
                      ${(tx.amount_cents / 100).toFixed(2)}
                    </p>
                    {taskUrl && (
                      <ChevronRight size={14} className="text-[#A3A3A3]" />
                    )}
                  </div>
                </div>
              )

              return taskUrl ? (
                <a key={tx.id} href={taskUrl} className="block no-underline">
                  <Card
                    padding="none"
                    className="p-3 md:p-4 hover:shadow-v4-md transition-shadow cursor-pointer"
                  >
                    {cardContent}
                  </Card>
                </a>
              ) : (
                <Card
                  key={tx.id}
                  padding="none"
                  className="p-3 md:p-4"
                >
                  {cardContent}
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={<ArrowDownLeft size={22} />}
            title="No completed tasks yet"
            description="Your completed tasks and earnings will appear here"
          />
        )}
      </div>

      {/* ── Withdraw Modal ── */}
      {showWithdrawModal && (
        <>
          {/* eslint-disable-next-line irlwork/no-inline-card-pattern -- modal overlay needs custom styling */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowWithdrawModal(false)} />
            <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl">
              <div className="flex items-center justify-between p-5 pb-4 border-b border-[rgba(0,0,0,0.06)]">
                <h3 className="text-lg font-bold text-[#1A1A1A]">Withdraw funds</h3>
                {/* eslint-disable-next-line irlwork/no-inline-button-pattern -- modal close button */}
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="w-8 h-8 rounded-lg bg-[#F5F3F0] hover:bg-[#EDEBE8] flex items-center justify-center transition-colors"
                >
                  <X size={16} className="text-[#525252]" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                {/* Bank Transfer option */}
                {/* eslint-disable-next-line irlwork/no-inline-card-pattern -- modal option card */}
                <div className={`rounded-xl border-2 p-4 ${
                  bankReady
                    ? 'border-[#059669]/20 bg-[#F0FDF4]/50'
                    : 'border-[rgba(0,0,0,0.08)] bg-[#FAFAF9]'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-[#D1FAE5] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Landmark size={18} className="text-[#059669]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[#1A1A1A] font-semibold text-sm">Bank transfer</h4>
                      <p className="text-xs text-[#888888]">
                        {bankWithdrawAmount > 0 ? `$${bankWithdrawAmount.toFixed(2)} available` : 'No funds'} · 2-3 business days
                      </p>
                    </div>
                    {bankReady && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#D1FAE5] text-[#059669]">Connected</span>
                    )}
                  </div>
                  {bankReady && bankWithdrawAmount > 0 ? (
                    // eslint-disable-next-line irlwork/no-inline-button-pattern -- withdraw action uses green
                    <button
                      onClick={() => handleWithdraw('stripe')}
                      disabled={withdrawing}
                      className="w-full py-2.5 bg-[#059669] hover:bg-[#047857] disabled:bg-[#9ca3af] text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      {withdrawing ? 'Processing...' : `Withdraw $${bankWithdrawAmount.toFixed(2)} to bank`}
                    </button>
                  ) : bankReady ? (
                    <p className="text-xs text-[#A3A3A3] text-center py-1">No bank-eligible funds to withdraw</p>
                  ) : (
                    // eslint-disable-next-line irlwork/no-inline-button-pattern -- setup bank link
                    <button
                      onClick={() => { setShowWithdrawModal(false); setExpandedPayout('bank') }}
                      className="w-full py-2.5 bg-[#F5F3F0] hover:bg-[#EDEBE8] text-[#525252] rounded-lg text-sm font-medium transition-colors"
                    >
                      Set up bank transfer
                    </button>
                  )}
                </div>

                {/* USDC option */}
                {/* eslint-disable-next-line irlwork/no-inline-card-pattern -- modal option card */}
                <div className={`rounded-xl border-2 p-4 ${
                  walletReady
                    ? 'border-[#6366f1]/20 bg-[#EEF2FF]/50'
                    : 'border-[rgba(0,0,0,0.08)] bg-[#FAFAF9]'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Wallet size={18} className="text-[#6366f1]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[#1A1A1A] font-semibold text-sm">USDC</h4>
                      <p className="text-xs text-[#888888]">
                        {usdcAvailable > 0 ? `${usdcAvailable.toFixed(2)} USDC available` : 'No funds'} · Instant
                      </p>
                    </div>
                    {walletReady && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EEF2FF] text-[#6366f1]">Connected</span>
                    )}
                  </div>
                  {walletReady && usdcAvailable > 0 ? (
                    // eslint-disable-next-line irlwork/no-inline-button-pattern -- withdraw USDC uses indigo
                    <button
                      onClick={() => handleWithdraw('usdc')}
                      disabled={withdrawing}
                      className="w-full py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-[#9ca3af] text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      {withdrawing ? 'Processing...' : `Withdraw ${usdcAvailable.toFixed(2)} USDC`}
                    </button>
                  ) : walletReady ? (
                    <p className="text-xs text-[#A3A3A3] text-center py-1">No USDC funds to withdraw</p>
                  ) : (
                    // eslint-disable-next-line irlwork/no-inline-button-pattern -- setup wallet link
                    <button
                      onClick={() => { setShowWithdrawModal(false); setExpandedPayout('usdc') }}
                      className="w-full py-2.5 bg-[#F5F3F0] hover:bg-[#EDEBE8] text-[#525252] rounded-lg text-sm font-medium transition-colors"
                    >
                      Connect USDC wallet
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Withdrawal Confirmation Modal */}
      <ConfirmDialog
        open={!!showWithdrawConfirm}
        title="Confirm withdrawal"
        description={
          showWithdrawConfirm === 'usdc'
            ? `Withdraw ${usdcAvailable.toFixed(2)} USDC to your wallet?`
            : `Withdraw $${bankWithdrawAmount > 0 ? bankWithdrawAmount.toFixed(2) : balanceData?.available?.toFixed(2)} to your bank account?`
        }
        confirmLabel="Confirm withdrawal"
        cancelLabel="Cancel"
        onConfirm={executeWithdraw}
        onCancel={() => setShowWithdrawConfirm(false)}
      />
    </div>
  )
}

export default EarningsDashboard
