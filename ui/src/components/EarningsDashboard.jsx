import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function EarningsDashboard({ user }) {
  const [balanceData, setBalanceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawResult, setWithdrawResult] = useState(null)

  useEffect(() => {
    fetchBalance()
  }, [user])

  const fetchBalance = async () => {
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

  const handleWithdraw = async () => {
    if (!balanceData?.available_cents || balanceData.available_cents <= 0) {
      alert('No funds available to withdraw')
      return
    }

    if (!user.wallet_address) {
      alert('Please add a wallet address in your profile settings first')
      return
    }

    if (!confirm(`Withdraw $${balanceData.available.toFixed(2)} to ${user.wallet_address}?`)) {
      return
    }

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
          amount_cents: balanceData.available_cents // Withdraw all available
        })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Withdrawal failed')
      }

      setWithdrawResult(result)

      // Refresh balance after successful withdrawal
      setTimeout(() => {
        fetchBalance()
        setWithdrawResult(null)
      }, 3000)

    } catch (err) {
      alert(`Withdrawal failed: ${err.message}`)
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
        <div className="text-gray-400">Loading balance...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
        <button
          onClick={fetchBalance}
          className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
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
    <div className="space-y-6">
      {/* Success Message */}
      {withdrawResult && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-green-400 font-semibold">Withdrawal Successful!</p>
          <p className="text-sm text-green-300 mt-1">
            ${withdrawResult.amount_withdrawn} sent to {withdrawResult.wallet_address?.substring(0, 10)}...
          </p>
          {withdrawResult.tx_hash && (
            <a
              href={`https://basescan.org/tx/${withdrawResult.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-300 hover:text-green-200 underline mt-2 inline-block"
            >
              View on BaseScan
            </a>
          )}
        </div>
      )}

      {/* Pending Balance Card - Amber/Yellow */}
      <div className="bg-amber-50/5 border border-amber-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-amber-400 text-sm font-medium uppercase tracking-wide">Pending</h3>
            <p className="text-xs text-amber-500/60 mt-1">In 48-hour dispute window</p>
          </div>
          <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 text-xl">
            ⏱️
          </div>
        </div>

        <p className="text-4xl font-bold text-amber-300">
          ${balanceData?.pending?.toFixed(2) || '0.00'}
        </p>

        {pendingTransactions.length > 0 ? (
          <div className="mt-4 space-y-2">
            {pendingTransactions.slice(0, 3).map(tx => (
              <div key={tx.id} className="flex justify-between items-center text-sm py-2 border-t border-amber-500/10">
                <div>
                  <p className="text-amber-200">Task #{tx.task_id?.substring(0, 8)}</p>
                  <p className="text-xs text-amber-500/60">{formatDate(tx.clears_at)}</p>
                </div>
                <p className="text-amber-300 font-semibold">
                  ${(tx.amount_cents / 100).toFixed(2)}
                </p>
              </div>
            ))}
            {pendingTransactions.length > 3 && (
              <p className="text-xs text-amber-500/60 text-center pt-2">
                +{pendingTransactions.length - 3} more pending
              </p>
            )}
          </div>
        ) : (
          <p className="text-amber-500/60 text-sm mt-4">No pending transactions</p>
        )}
      </div>

      {/* Available Balance Card - Green */}
      <div className="bg-green-50/5 border border-green-500/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-green-400 text-sm font-medium uppercase tracking-wide">Available</h3>
            <p className="text-xs text-green-500/60 mt-1">Ready to withdraw</p>
          </div>
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xl">
            💳
          </div>
        </div>

        <p className="text-4xl font-bold text-green-300">
          ${balanceData?.available?.toFixed(2) || '0.00'}
        </p>

        {!user.wallet_address && (
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-yellow-400 text-sm">
              ⚠️ Add wallet address in profile to withdraw
            </p>
          </div>
        )}

        <button
          onClick={handleWithdraw}
          disabled={withdrawing || !balanceData?.available_cents || balanceData.available_cents <= 0 || !user.wallet_address}
          className={`
            mt-4 w-full py-3 px-4 rounded-lg font-semibold transition-all
            ${withdrawing || !balanceData?.available_cents || balanceData.available_cents <= 0 || !user.wallet_address
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
            }
          `}
        >
          {withdrawing ? 'Processing...' : 'Withdraw to Wallet'}
        </button>

        {availableTransactions.length > 0 && (
          <div className="mt-4 space-y-2">
            {availableTransactions.slice(0, 2).map(tx => (
              <div key={tx.id} className="flex justify-between items-center text-sm py-2 border-t border-green-500/10">
                <p className="text-green-200">Task #{tx.task_id?.substring(0, 8)}</p>
                <p className="text-green-300 font-semibold">
                  ${(tx.amount_cents / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Transaction History</h3>

        {allTransactions.length > 0 ? (
          <div className="space-y-3">
            {allTransactions.map(tx => {
              const isPending = tx.status === 'pending'
              const isAvailable = tx.status === 'available'
              const isWithdrawn = tx.status === 'withdrawn'

              return (
                <div
                  key={tx.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">
                          {tx.task_title || `Task #${tx.task_id?.substring(0, 8)}`}
                        </p>
                        <span className={`
                          px-2 py-0.5 rounded-full text-xs font-semibold
                          ${isPending ? 'bg-amber-500/20 text-amber-400' : ''}
                          ${isAvailable ? 'bg-green-500/20 text-green-400' : ''}
                          ${isWithdrawn ? 'bg-gray-500/20 text-gray-400' : ''}
                        `}>
                          {tx.status}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(tx.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>

                      {isPending && tx.clears_at && (
                        <p className="text-xs text-amber-400 mt-1">
                          Clears in {formatDate(tx.clears_at)}
                        </p>
                      )}

                      {isWithdrawn && tx.withdrawn_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Withdrawn {new Date(tx.withdrawn_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className={`
                        text-xl font-bold
                        ${isPending ? 'text-amber-400' : ''}
                        ${isAvailable ? 'text-green-400' : ''}
                        ${isWithdrawn ? 'text-gray-400' : ''}
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
          <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">💸</div>
            <p className="text-gray-400 font-medium">No transactions yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Complete tasks to start earning USDC
            </p>
          </div>
        )}
      </div>

      {/* Wallet Info */}
      {user.wallet_address && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Withdrawal Address</p>
          <p className="text-white font-mono text-sm">
            {user.wallet_address}
          </p>
        </div>
      )}
    </div>
  )
}

export default EarningsDashboard
