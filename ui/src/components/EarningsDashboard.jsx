import { useState, useEffect } from 'react'
import { Timer, CreditCard, ArrowDownLeft } from 'lucide-react'
import API_URL from '../config/api'
import { useToast } from '../context/ToastContext'
import WithdrawalMethodPicker from './WithdrawalMethodPicker'
import ConnectBankButton from './ConnectBankButton'

function EarningsDashboard({ user }) {
  const toast = useToast()
  const [balanceData, setBalanceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawResult, setWithdrawResult] = useState(null)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    fetchBalance()
  }, [user])

  const fetchBalance = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/wallet/balance`, {
        headers: { Authorization: user.token || '' }
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

  const handleWithdraw = () => {
    if (!balanceData?.available_cents || balanceData.available_cents <= 0) {
      toast.error('No funds available to withdraw')
      return
    }

    setShowWithdrawConfirm('stripe')
  }

  const executeWithdraw = async () => {
    const method = showWithdrawConfirm
    setShowWithdrawConfirm(false)

    try {
      setWithdrawing(true)
      setWithdrawResult(null)

      const res = await fetch(`${API_URL}/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': user.token || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount_cents: balanceData.available_cents,
          method: 'stripe'
        })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Withdrawal failed')
      }

      setWithdrawResult({ ...result, method })

      // Refresh balance after successful withdrawal
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#333333]">Loading balance...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[rgba(255, 95, 87, 0.1)] border border-[#FF5F57]/20 rounded-xl p-4">
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

  const pendingTransactions = balanceData?.transactions?.filter(tx => tx.status === 'pending') || []
  const availableTransactions = balanceData?.transactions?.filter(tx => tx.status === 'available') || []
  const allTransactions = balanceData?.transactions || []

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Payment Account Setup */}
      <ConnectBankButton user={user} />

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
              ${withdrawResult.amount || withdrawResult.amount_withdrawn} is being transferred to your bank account
            </p>
          </div>
        </div>
      )}

      {/* Balance Cards Grid */}
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
            ${balanceData?.pending?.toFixed(2) || '0.00'}
          </p>

          {pendingTransactions.length > 0 ? (
            <div className="mt-3 md:mt-4 space-y-2">
              {pendingTransactions.slice(0, 3).map(tx => (
                <div key={tx.id} className="flex justify-between items-center text-xs md:text-sm py-2 border-t border-[rgba(0,0,0,0.06)]">
                  <div>
                    <p className="text-[#333333]">Task #{tx.task_id?.substring(0, 8)}</p>
                    <p className="text-xs text-[#A3A3A3]">{formatDate(tx.clears_at)}</p>
                  </div>
                  <p className="text-[#1A1A1A] font-semibold">
                    ${(tx.amount_cents / 100).toFixed(2)}
                  </p>
                </div>
              ))}
              {pendingTransactions.length > 3 && (
                <p className="text-xs text-[#A3A3A3] text-center pt-2">
                  +{pendingTransactions.length - 3} more pending
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
            ${balanceData?.available?.toFixed(2) || '0.00'}
          </p>

          {balanceData?.available_cents > 0 && (
            <div className="mt-3 md:mt-4">
              <WithdrawalMethodPicker
                user={user}
                availableBalance={balanceData?.available || 0}
                onWithdraw={handleWithdraw}
              />
            </div>
          )}

          {(!balanceData?.available_cents || balanceData.available_cents <= 0) && (
            <p className="text-[#A3A3A3] text-xs md:text-sm mt-3 md:mt-4">No funds available to withdraw yet</p>
          )}

          {availableTransactions.length > 0 && (
            <div className="mt-3 md:mt-4 space-y-2">
              {availableTransactions.slice(0, 2).map(tx => (
                <div key={tx.id} className="flex justify-between items-center text-xs md:text-sm py-2 border-t border-[rgba(0,0,0,0.06)]">
                  <p className="text-[#333333]">Task #{tx.task_id?.substring(0, 8)}</p>
                  <p className="text-[#1A1A1A] font-semibold">
                    ${(tx.amount_cents / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Transaction History</h3>

        {allTransactions.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {allTransactions.map(tx => {
              const isPending = tx.status === 'pending'
              const isAvailable = tx.status === 'available'
              const isWithdrawn = tx.status === 'withdrawn'

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
              Complete tasks to start earning
            </p>
          </div>
        )}
      </div>

      {/* Withdrawal Confirmation Modal */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-v4-xl">
            <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">Confirm Withdrawal</h3>
            <p className="text-[#333333] text-sm mb-5">
              Withdraw <span className="font-semibold text-[#1A1A1A]">${balanceData?.available?.toFixed(2)}</span> to your bank account?
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
