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
      {/* Wallet Connection Status */}
      <div className={`rounded-2xl p-5 border-2 shadow-v4-sm ${
        user.wallet_address
          ? 'bg-green-50 border-green-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
              user.wallet_address ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
            }`}>
              {user.wallet_address ? '✓' : '⚠️'}
            </div>
            <div>
              <p className={`font-semibold ${user.wallet_address ? 'text-green-700' : 'text-amber-700'}`}>
                {user.wallet_address ? 'Wallet Connected' : 'Wallet Not Connected'}
              </p>
              {user.wallet_address ? (
                <p className="text-sm text-gray-500 font-mono">
                  {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                </p>
              ) : (
                <p className="text-sm text-amber-600">Add a wallet address to withdraw earnings</p>
              )}
            </div>
          </div>
          {!user.wallet_address && (
            <button className="px-4 py-2 bg-amber-500 text-white rounded-xl font-medium text-sm hover:bg-amber-600 transition-colors shadow-v4-sm">
              Add Wallet
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {withdrawResult && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 shadow-v4-sm">
          <p className="text-green-700 font-semibold">Withdrawal Successful!</p>
          <p className="text-sm text-green-600 mt-1">
            ${withdrawResult.amount_withdrawn} sent to {withdrawResult.wallet_address?.substring(0, 10)}...
          </p>
          {withdrawResult.tx_hash && (
            <a
              href={`https://basescan.org/tx/${withdrawResult.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 hover:text-green-800 underline mt-2 inline-block"
            >
              View on BaseScan
            </a>
          )}
        </div>
      )}

      {/* Available Balance Card - Green - Prominent */}
      <div className="bg-white border-2 border-green-200 rounded-2xl p-6 shadow-v4-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-teal text-sm font-semibold uppercase tracking-wide">Available Balance</h3>
            <p className="text-xs text-gray-500 mt-1">Ready to withdraw</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 text-xl">
            💳
          </div>
        </div>

        <p className="text-5xl font-bold text-gray-900 mb-4">
          ${balanceData?.available?.toFixed(2) || '0.00'}
        </p>

        <button
          onClick={handleWithdraw}
          disabled={withdrawing || !balanceData?.available_cents || balanceData.available_cents <= 0 || !user.wallet_address}
          className={`
            w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200
            ${withdrawing || !balanceData?.available_cents || balanceData.available_cents <= 0 || !user.wallet_address
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-coral hover:bg-coral-dark text-white shadow-v4-md hover:shadow-v4-lg'
            }
          `}
        >
          {withdrawing ? 'Processing...' : 'Withdraw to Wallet'}
        </button>

        {availableTransactions.length > 0 && (
          <div className="mt-4 space-y-2">
            {availableTransactions.slice(0, 2).map(tx => (
              <div key={tx.id} className="flex justify-between items-center text-sm py-2 border-t border-gray-100">
                <p className="text-gray-600">Task #{tx.task_id?.substring(0, 8)}</p>
                <p className="text-teal font-semibold">
                  ${(tx.amount_cents / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Balance Card - Amber/Yellow */}
      <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 shadow-v4-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-amber-600 text-sm font-semibold uppercase tracking-wide">Pending</h3>
            <p className="text-xs text-gray-500 mt-1">In 48-hour dispute window</p>
          </div>
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 text-xl">
            ⏱️
          </div>
        </div>

        <p className="text-4xl font-bold text-amber-600">
          ${balanceData?.pending?.toFixed(2) || '0.00'}
        </p>

        {pendingTransactions.length > 0 ? (
          <div className="mt-4 space-y-2">
            {pendingTransactions.slice(0, 3).map(tx => (
              <div key={tx.id} className="flex justify-between items-center text-sm py-2 border-t border-amber-100">
                <div>
                  <p className="text-gray-700">Task #{tx.task_id?.substring(0, 8)}</p>
                  <p className="text-xs text-amber-600">{formatDate(tx.clears_at)}</p>
                </div>
                <p className="text-amber-600 font-semibold">
                  ${(tx.amount_cents / 100).toFixed(2)}
                </p>
              </div>
            ))}
            {pendingTransactions.length > 3 && (
              <p className="text-xs text-gray-500 text-center pt-2">
                +{pendingTransactions.length - 3} more pending
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm mt-4">No pending transactions</p>
        )}
      </div>

      {/* Transaction History */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h3>

        {allTransactions.length > 0 ? (
          <div className="space-y-3">
            {allTransactions.map(tx => {
              const isPending = tx.status === 'pending'
              const isAvailable = tx.status === 'available'
              const isWithdrawn = tx.status === 'withdrawn'

              return (
                <div
                  key={tx.id}
                  className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-v4-md transition-all duration-200 shadow-v4-sm"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 font-medium">
                          {tx.task_title || `Task #${tx.task_id?.substring(0, 8)}`}
                        </p>
                        <span className={`
                          px-2 py-0.5 rounded-full text-xs font-semibold
                          ${isPending ? 'bg-amber-100 text-amber-600' : ''}
                          ${isAvailable ? 'bg-green-100 text-green-600' : ''}
                          ${isWithdrawn ? 'bg-gray-100 text-gray-500' : ''}
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
                        <p className="text-xs text-amber-600 mt-1">
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
                        ${isPending ? 'text-amber-600' : ''}
                        ${isAvailable ? 'text-teal' : ''}
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
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-v4-sm">
            <div className="text-4xl mb-4">💸</div>
            <p className="text-gray-700 font-medium">No transactions yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Complete tasks to start earning USDC
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default EarningsDashboard
