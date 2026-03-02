import { useState, useEffect, useRef, useMemo } from 'react'
import { Timer, CreditCard, ArrowDownLeft, ChevronDown, Landmark, Wallet, Filter } from 'lucide-react'
import API_URL from '../config/api'
import { useToast } from '../context/ToastContext'
import { supabase } from '../context/AuthContext'
import WithdrawalMethodPicker from './WithdrawalMethodPicker'
import ConnectBankButton from './ConnectBankButton'
import ConnectWalletSection from './ConnectWalletSection'

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
        <div className="earnings-flow-label">Complete Task</div>
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
        <div className="earnings-flow-label">48hr Review Hold</div>
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
        <div className="earnings-flow-label">Available to Withdraw</div>
      </div>
    </div>
  )
}

// Section navigation button row
const SECTIONS = [
  { id: 'balance', label: 'Balance' },
  { id: 'payout', label: 'Payout Options' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'how-it-works', label: 'How Earnings Work' },
]

function EarningsDashboard({ user }) {
  const toast = useToast()
  const [balanceData, setBalanceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawResult, setWithdrawResult] = useState(null)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [balanceFilter, setBalanceFilter] = useState('all') // 'all' | 'stripe' | 'usdc'
  const [showFlowDiagram, setShowFlowDiagram] = useState(false)

  // Section refs for scroll-to navigation
  const sectionRefs = {
    balance: useRef(null),
    payout: useRef(null),
    transactions: useRef(null),
    'how-it-works': useRef(null),
  }

  useEffect(() => {
    if (!user?.id || !user?.token) {
      setLoading(false)
      return
    }
    fetchBalance()
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

      if (!res.ok) {
        throw new Error('Failed to fetch balance')
      }

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

  const handleWithdraw = (method) => {
    if (!balanceData?.available_cents || balanceData.available_cents <= 0) {
      toast.error('No funds available to withdraw')
      return
    }
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

      if (!res.ok) {
        throw new Error(result.error || 'Withdrawal failed')
      }

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

    if (diffHours < 0) {
      return 'Available now'
    } else if (diffHours < 24) {
      return `${diffHours}h remaining`
    } else {
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays}d ${diffHours % 24}h`
    }
  }

  const scrollToSection = (id) => {
    sectionRefs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
          Retry
        </button>
      </div>
    )
  }

  const allTransactions = balanceData?.transactions || []
  const stripeAvailable = (balanceData?.stripe_available_cents || 0) / 100
  const usdcAvailable = (balanceData?.usdc_available_cents || 0) / 100

  // Compute filtered pending/available based on selected payout method
  const filteredPendingTransactions = allTransactions.filter(tx => {
    if (tx.status !== 'pending') return false
    if (balanceFilter === 'all') return true
    if (balanceFilter === 'usdc') return tx.payout_method === 'usdc'
    return tx.payout_method !== 'usdc' // 'stripe' = everything non-usdc
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

  return (
    <div className="space-y-5 md:space-y-7">

      {/* ── Section Navigation ── */}
      <nav className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {SECTIONS.map(section => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className="flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg border border-[rgba(0,0,0,0.08)] bg-white text-[#525252] hover:text-[#1A1A1A] hover:border-[rgba(0,0,0,0.15)] hover:shadow-sm transition-all"
          >
            {section.label}
          </button>
        ))}
      </nav>

      {/* ── Balance Cards (top of page) ── */}
      <div ref={sectionRefs.balance}>
        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-4">
          <Filter size={14} className="text-[#888888]" />
          {[
            { key: 'all', label: 'All' },
            { key: 'stripe', label: 'Bank Transfer' },
            { key: 'usdc', label: 'USDC' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setBalanceFilter(opt.key)}
              className={`
                px-3 py-1.5 text-xs font-semibold rounded-lg transition-all
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Pending Balance Card */}
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div>
                <h3 className="text-[#888888] text-xs md:text-sm font-medium uppercase tracking-wider">Pending</h3>
                <p className="text-xs text-[#A3A3A3] mt-0.5 md:mt-1">48-hour hold</p>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 bg-[#F5F3F0] rounded-lg flex items-center justify-center">
                <Timer size={18} className="text-[#888888]" />
              </div>
            </div>

            <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A] tracking-tight">
              ${filteredPendingAmount.toFixed(2)}
            </p>

            {filteredPendingTransactions.length > 0 ? (
              <div className="mt-3 md:mt-4 space-y-2">
                {filteredPendingTransactions.slice(0, 3).map(tx => (
                  <div key={tx.id} className="flex justify-between items-center text-xs md:text-sm py-2 border-t border-[rgba(0,0,0,0.06)]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[#333333]">Task #{tx.task_id?.substring(0, 8)}</p>
                        {tx.payout_method === 'usdc' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">USDC</span>
                        )}
                      </div>
                      <p className="text-xs text-[#A3A3A3]">{formatDate(tx.clears_at)}</p>
                    </div>
                    <p className="text-[#1A1A1A] font-semibold">
                      ${(tx.amount_cents / 100).toFixed(2)}
                    </p>
                  </div>
                ))}
                {filteredPendingTransactions.length > 3 && (
                  <p className="text-xs text-[#A3A3A3] text-center pt-2">
                    +{filteredPendingTransactions.length - 3} more pending
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[#A3A3A3] text-xs md:text-sm mt-3 md:mt-4">No pending transactions</p>
            )}
          </div>

          {/* Available Balance Card */}
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-teal" />
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div>
                <h3 className="text-teal text-xs md:text-sm font-medium uppercase tracking-wider">Available</h3>
                <p className="text-xs text-[#A3A3A3] mt-0.5 md:mt-1">Ready to withdraw</p>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 bg-teal/8 rounded-lg flex items-center justify-center">
                <CreditCard size={18} className="text-teal" />
              </div>
            </div>

            <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A] tracking-tight">
              ${filteredAvailableAmount.toFixed(2)}
            </p>

            {balanceData?.available_cents > 0 && (
              <div className="mt-3 md:mt-4">
                <WithdrawalMethodPicker
                  user={user}
                  availableBalance={balanceData?.available || 0}
                  stripeAvailable={stripeAvailable}
                  usdcAvailable={usdcAvailable}
                  onWithdraw={handleWithdraw}
                />
              </div>
            )}

            {(!balanceData?.available_cents || balanceData.available_cents <= 0) && (
              <p className="text-[#A3A3A3] text-xs md:text-sm mt-3 md:mt-4">No funds available to withdraw yet</p>
            )}

            {filteredAvailableTransactions.length > 0 && (
              <div className="mt-3 md:mt-4 space-y-2">
                {filteredAvailableTransactions.slice(0, 2).map(tx => (
                  <div key={tx.id} className="flex justify-between items-center text-xs md:text-sm py-2 border-t border-[rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[#333333]">Task #{tx.task_id?.substring(0, 8)}</p>
                      {tx.payout_method === 'usdc' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">USDC</span>
                      )}
                    </div>
                    <p className="text-[#1A1A1A] font-semibold">
                      ${(tx.amount_cents / 100).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Message */}
      {withdrawResult && (
        <div className="bg-white border border-teal/20 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-teal/8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-[#1A1A1A] font-semibold text-sm">Withdrawal Successful</p>
            <p className="text-sm text-[#333333] mt-0.5">
              {withdrawResult.method === 'usdc'
                ? `${withdrawResult.amount} USDC sent to your wallet`
                : `$${withdrawResult.amount || withdrawResult.amount_withdrawn} is being transferred to your bank account`}
            </p>
          </div>
        </div>
      )}

      {/* ── Payout Options — 2-column grid ── */}
      <div ref={sectionRefs.payout}>
        <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Payout Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Bank Transfer */}
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl overflow-hidden">
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#F5F3F0] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Landmark size={20} className="text-[#525252]" />
                </div>
                <div>
                  <h4 className="text-[#1A1A1A] font-semibold text-sm md:text-base">Bank Transfer</h4>
                  <p className="text-xs text-[#888888]">Direct deposit via Stripe</p>
                </div>
              </div>
              <ConnectBankButton user={user} />
            </div>
          </div>

          {/* USDC */}
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl overflow-hidden">
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#EEF2FF] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wallet size={20} className="text-[#6366f1]" />
                </div>
                <div>
                  <h4 className="text-[#1A1A1A] font-semibold text-sm md:text-base">USDC</h4>
                  <p className="text-xs text-[#888888]">Base network wallet payout</p>
                </div>
              </div>
              <ConnectWalletSection user={user} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Transaction History ── */}
      <div ref={sectionRefs.transactions}>
        <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Transaction History</h3>

        {allTransactions.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {allTransactions.map(tx => {
              const isPending = tx.status === 'pending'
              const isAvailable = tx.status === 'available'
              const isWithdrawn = tx.status === 'withdrawn'
              const isUsdc = tx.payout_method === 'usdc'

              return (
                <div
                  key={tx.id}
                  className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-3 md:p-4 hover:shadow-v4-md transition-shadow"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[#1A1A1A] font-medium text-sm md:text-base truncate">
                          {tx.task_title || `Task #${tx.task_id?.substring(0, 8)}`}
                        </p>
                        <span className={`
                          px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide flex-shrink-0
                          ${isPending ? 'bg-[#F5F3F0] text-[#888888]' : ''}
                          ${isAvailable ? 'bg-teal/8 text-teal' : ''}
                          ${isWithdrawn ? 'bg-[#F5F3F0] text-[#333333]' : ''}
                        `}>
                          {tx.status}
                        </span>
                        {isUsdc && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 flex-shrink-0">
                            USDC
                          </span>
                        )}
                        {!isUsdc && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F5F2ED] text-[#8A8A8A] flex-shrink-0">
                            Bank
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#888888] mt-1">
                        {new Date(tx.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>

                      {isPending && tx.clears_at && (
                        <p className="text-xs text-[#A3A3A3] mt-1">
                          Clears in {formatDate(tx.clears_at)}
                        </p>
                      )}

                      {isWithdrawn && tx.withdrawn_at && (
                        <p className="text-xs text-[#888888] mt-1">
                          Withdrawn {new Date(tx.withdrawn_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`
                        text-lg md:text-xl font-bold
                        ${isPending ? 'text-[#1A1A1A]' : ''}
                        ${isAvailable ? 'text-teal' : ''}
                        ${isWithdrawn ? 'text-[#888888]' : ''}
                      `}>
                        ${(tx.amount_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-8 md:p-12 text-center">
            <div className="w-12 h-12 bg-[#F5F3F0] rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4">
              <ArrowDownLeft size={22} className="text-[#888888]" />
            </div>
            <p className="text-[#333333] font-medium text-sm md:text-base">No transactions yet</p>
            <p className="text-xs md:text-sm text-[#A3A3A3] mt-1.5">
              Your earnings will appear here once you complete your first task
            </p>
          </div>
        )}
      </div>

      {/* ── How Earnings Work ── */}
      <div ref={sectionRefs['how-it-works']}>
        <button
          className={`earnings-flow-toggle ${showFlowDiagram ? 'expanded' : ''}`}
          onClick={() => setShowFlowDiagram(!showFlowDiagram)}
        >
          How earnings work
          <ChevronDown size={14} />
        </button>
        {showFlowDiagram && <PaymentFlowDiagram />}
      </div>

      {/* Withdrawal Confirmation Modal */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-v4-xl">
            <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">Confirm Withdrawal</h3>
            <p className="text-[#333333] text-sm mb-5">
              {showWithdrawConfirm === 'usdc'
                ? <>Withdraw <span className="font-semibold text-[#1A1A1A]">{usdcAvailable.toFixed(2)} USDC</span> to your wallet?</>
                : <>Withdraw <span className="font-semibold text-[#1A1A1A]">${stripeAvailable > 0 ? stripeAvailable.toFixed(2) : balanceData?.available?.toFixed(2)}</span> to your bank account?</>}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowWithdrawConfirm(false)} className="px-4 py-2.5 text-[#333333] hover:bg-[#F5F3F0] rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={executeWithdraw} className="px-5 py-2.5 bg-teal text-white rounded-xl text-sm font-semibold hover:bg-teal-dark transition-colors">
                Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EarningsDashboard
