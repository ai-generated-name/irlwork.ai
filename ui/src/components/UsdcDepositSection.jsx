import React, { useState, useEffect, useCallback } from 'react'
import { Copy, Check, RefreshCw, Wallet } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

/**
 * USDC deposit section for the Hiring-mode Payments tab.
 * Shows the user's personal Circle deposit address (or a generate button).
 * Displays USDC available + escrow balances.
 */
export default function UsdcDepositSection({ user }) {
  const [walletInfo, setWalletInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  const fetchWalletInfo = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/wallet/balance`, {
        headers: { Authorization: user?.token || '' }
      })
      if (res.ok) {
        const data = await res.json()
        setWalletInfo(data)
      }
    } catch (e) {
      console.error('Failed to fetch wallet info:', e)
    } finally {
      setLoading(false)
    }
  }, [user?.token])

  useEffect(() => { fetchWalletInfo() }, [fetchWalletInfo])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/wallet/generate-deposit-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user?.token || ''
        }
      })
      if (res.ok) {
        await fetchWalletInfo()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to generate deposit address')
      }
    } catch (e) {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    if (walletInfo?.circle_wallet_address) {
      navigator.clipboard.writeText(walletInfo.circle_wallet_address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-[rgba(26,26,26,0.08)] rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
        <div className="h-10 bg-gray-100 rounded mb-3" />
        <div className="h-3 bg-gray-50 rounded w-2/3" />
      </div>
    )
  }

  const hasWallet = !!walletInfo?.circle_wallet_address

  // State: No wallet generated
  if (!hasWallet) {
    return (
      <div className="bg-white border border-[rgba(26,26,26,0.08)] rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">Pay with USDC on Base</p>
            <p className="text-xs text-[#525252] mt-1">
              Generate a unique deposit address to fund your account with USDC. Deposits are detected automatically.
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white transition-colors"
          style={{ background: generating ? '#ccc' : '#E07A5F' }}
        >
          {generating ? 'Generating...' : 'Generate Deposit Address'}
        </button>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
    )
  }

  // State: Wallet exists
  const addr = walletInfo.circle_wallet_address
  const truncated = `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const usdcAvailable = walletInfo.usdc_available_balance || '0'
  const usdcEscrow = walletInfo.usdc_escrow_balance || '0'

  return (
    <div className="bg-white border border-[rgba(26,26,26,0.08)] rounded-xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A]">USDC Wallet Active</p>
          <p className="text-xs text-[#525252] mt-1">
            Send USDC on Base to your deposit address below. Deposits are confirmed automatically.
          </p>
        </div>
      </div>

      {/* Deposit address */}
      <div className="bg-[#F5F2ED] rounded-lg p-3 mb-3">
        <p className="text-xs text-[#8A8A8A] mb-1">Your Deposit Address (Base)</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-mono text-[#1A1A1A] break-all select-all flex-1">{addr}</p>
          <button onClick={handleCopy} className="p-1.5 rounded hover:bg-[#e8e4de] transition-colors flex-shrink-0" title="Copy address">
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-[#8A8A8A]" />}
          </button>
        </div>
      </div>

      {/* Balance display */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-[#f8f8f6] rounded-lg p-3">
          <p className="text-xs text-[#8A8A8A] mb-0.5">Available</p>
          <p className="text-base font-semibold text-[#1A1A1A]">{parseFloat(usdcAvailable).toFixed(2)} <span className="text-xs font-normal text-[#8A8A8A]">USDC</span></p>
        </div>
        <div className="bg-[#f8f8f6] rounded-lg p-3">
          <p className="text-xs text-[#8A8A8A] mb-0.5">In Escrow</p>
          <p className="text-base font-semibold text-[#1A1A1A]">{parseFloat(usdcEscrow).toFixed(2)} <span className="text-xs font-normal text-[#8A8A8A]">USDC</span></p>
        </div>
      </div>

      {/* Network info */}
      <div className="flex items-center gap-4 text-xs text-[#8A8A8A]">
        <span>Network: Base</span>
        <span>Token: USDC</span>
        <span>Decimals: 6</span>
      </div>
    </div>
  )
}
