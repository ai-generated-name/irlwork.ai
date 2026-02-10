import { useState, useEffect } from 'react'
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
        headers: { Authorization: user.id }
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

    // Require wallet address for non-stripe withdrawals
    if (method !== 'stripe' && !user?.wallet_address) {
      toast.error('Please add a wallet address in your profile settings first')
      return
    }

    setShowWithdrawConfirm(method || 'usdc')
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
          'Authorization': user.id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount_cents: balanceData.available_cents,
          method: method || 'usdc'
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
        <div className="text-[#525252]">Loading balance...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#FEE2E2] border border-[#DC2626]/20 rounded-xl p-4">
        <p className="text-[#DC2626]">Error: {error}</p>
        <button
          onClick={fetchBalance}
          className="mt-2 text-sm text-[#DC2626] hover:text-[#B91C1C] underline"
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
      {/* Success Message */}
      {withdrawResult && (
        <div className="bg-[#D1FAE5] border border-[#059669]/20 rounded-xl p-4">
          <p className="text-[#059669] font-semibold">Withdrawal Successful!</p>
          <p className="text-sm text-[#059669]/80 mt-1">
            {withdrawResult.method === 'stripe'
              ? `$${withdrawResult.amount_withdrawn} is being transferred to your bank account`
              : `$${withdrawResult.amount_withdrawn} sent to ${withdrawResult.wallet_address?.substring(0, 10)}...`
            }
          </p>
          {withdrawResult.tx_hash && (
            <a
              href={`https://basescan.org/tx/${withdrawResult.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#059669] hover:text-[#047857] underline mt-2 inline-block"
            >
              View on BaseScan
            </a>
          )}
        </div>
      )}

      {/* Balance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Pending Balance Card - Amber/Yellow */}
        <div className="bg-[#FEF3C7] border-2 border-[#D97706]/20 rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <h3 className="text-[#D97706] text-xs md:text-sm font-medium uppercase tracking-wide">Pending</h3>
              <p className="text-xs text-[#D97706]/60 mt-0.5 md:mt-1">48-hour hold</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#D97706]/20 rounded-full flex items-center justify-center text-[#D97706] text-lg md:text-xl">
              ⏱️
            </div>
          </div>

          <p className="text-3xl md:text-4xl font-bold text-[#92400E]">
            ${balanceData?.pending?.toFixed(2) || '0.00'}
          </p>

          {pendingTransactions.length > 0 ? (
            <div className="mt-3 md:mt-4 space-y-2">
              {pendingTransactions.slice(0, 3).map(tx => (
                <div key={tx.id} className="flex justify-between items-center text-xs md:text-sm py-2 border-t border-[#D97706]/10">
                  <div>
                    <p className="text-[#92400E]">Task #{tx.task_id?.substring(0, 8)}</p>
                    <p className="text-xs text-[#D97706]/60">{formatDate(tx.clears_at)}</p>
                  </div>
                  <p className="text-[#92400E] font-semibold">
                    ${(tx.amount_cents / 100).toFixed(2)}
                  </p>
                </div>
              ))}
              {pendingTransactions.length > 3 && (
                <p className="text-xs text-[#D97706]/60 text-center pt-2">
                  +{pendingTransactions.length - 3} more pending
                </p>
              )}
            </div>
          ) : (
            <p className="text-[#D97706]/60 text-xs md:text-sm mt-3 md:mt-4">No pending transactions</p>
          )}
        </div>

        {/* Available Balance Card - Green */}
        <div className="bg-[#D1FAE5] border-2 border-[#059669]/20 rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <h3 className="text-[#059669] text-xs md:text-sm font-medium uppercase tracking-wide">Available</h3>
              <p className="text-xs text-[#059669]/60 mt-0.5 md:mt-1">Ready to withdraw</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#059669]/20 rounded-full flex items-center justify-center text-[#059669] text-lg md:text-xl">
              💳
            </div>
          </div>

          <p className="text-3xl md:text-4xl font-bold text-[#065F46]">
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
            <div className="mt-3 md:mt-4">
              <p className="text-[#059669]/60 text-xs md:text-sm">No funds available to withdraw yet</p>
              <div className="mt-2">
                <ConnectBankButton user={user} compact />
              </div>
            </div>
          )}

          {availableTransactions.length > 0 && (
            <div className="mt-3 md:mt-4 space-y-2">
              {availableTransactions.slice(0, 2).map(tx => (
                <div key={tx.id} className="flex justify-between items-center text-xs md:text-sm py-2 border-t border-[#059669]/10">
                  <p className="text-[#065F46]">Task #{tx.task_id?.substring(0, 8)}</p>
                  <p className="text-[#065F46] font-semibold">
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
                  className="bg-white border-2 border-[rgba(26,26,26,0.08)] rounded-xl p-3 md:p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[#1A1A1A] font-medium text-sm md:text-base truncate">
                          {tx.task_title || `Task #${tx.task_id?.substring(0, 8)}`}
                        </p>
                        <span className={`
                          px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0
                          ${isPending ? 'bg-[#FEF3C7] text-[#D97706]' : ''}
                          ${isAvailable ? 'bg-[#D1FAE5] text-[#059669]' : ''}
                          ${isWithdrawn ? 'bg-[#F5F2ED] text-[#525252]' : ''}
                        `}>
                          {tx.status}
                        </span>
                      </div>

                      <p className="text-xs text-[#8A8A8A] mt-1">
                        {new Date(tx.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>

                      {isPending && tx.clears_at && (
                        <p className="text-xs text-[#D97706] mt-1">
                          Clears in {formatDate(tx.clears_at)}
                        </p>
                      )}

                      {isWithdrawn && tx.withdrawn_at && (
                        <p className="text-xs text-[#8A8A8A] mt-1">
                          Withdrawn {new Date(tx.withdrawn_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`
                        text-lg md:text-xl font-bold
                        ${isPending ? 'text-[#D97706]' : ''}
                        ${isAvailable ? 'text-[#059669]' : ''}
                        ${isWithdrawn ? 'text-[#525252]' : ''}
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
          <div className="bg-white border-2 border-[rgba(26,26,26,0.08)] rounded-xl p-8 md:p-12 text-center">
            <div className="text-3xl md:text-4xl mb-3 md:mb-4">💸</div>
            <p className="text-[#525252] font-medium text-sm md:text-base">No transactions yet</p>
            <p className="text-xs md:text-sm text-[#8A8A8A] mt-2">
              Complete tasks to start earning
            </p>
          </div>
        )}
      </div>

      {/* Wallet Info */}
      {user.wallet_address && (
        <div className="bg-white border-2 border-[rgba(26,26,26,0.08)] rounded-xl p-3 md:p-4">
          <p className="text-xs text-[#8A8A8A] mb-1">Withdrawal Address</p>
          <p className="text-[#1A1A1A] font-mono text-xs md:text-sm break-all">
            {user.wallet_address}
          </p>
        </div>
      )}

      {/* Withdrawal Confirmation Modal */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Withdrawal</h3>
            <p className="text-gray-600 mb-4">
              Withdraw ${balanceData?.available?.toFixed(2)} to {showWithdrawConfirm === 'stripe' ? 'your bank account' : `${user.wallet_address?.substring(0, 10)}...`}?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowWithdrawConfirm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button onClick={executeWithdraw} className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857]">
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
