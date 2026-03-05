import React, { useState, useEffect, useCallback } from 'react'
import { Copy, Check, RefreshCw, Wallet } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

/**
 * USDC deposit section for the Hiring-mode Payments tab.
 * Shows the user's personal Circle deposit address (or a generate button).
 * Displays USDC available + escrow balances with sync-from-chain support.
 */
export default function UsdcDepositSection({ user }) {
  const [walletInfo, setWalletInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)
  const [syncMessage, setSyncMessage] = useState(null)

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

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/wallet/sync-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user?.token || ''
        }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.synced) {
          setSyncMessage(`+${parseFloat(data.credited).toFixed(2)} USDC detected`)
        } else {
          setSyncMessage('Balance is up to date')
        }
        await fetchWalletInfo()
        setTimeout(() => setSyncMessage(null), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to sync balance')
      }
    } catch (e) {
      setError('Network error. Please try again.')
    } finally {
      setSyncing(false)
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
      <div className="bg-white border border-[rgba(220,200,180,0.35)] rounded-[20px] p-5 animate-pulse">
        <div className="h-4 bg-[rgba(220,200,180,0.15)] rounded w-1/3 mb-3" />
        <div className="h-10 bg-[rgba(220,200,180,0.15)] rounded mb-3" />
        <div className="h-3 bg-[rgba(220,200,180,0.10)] rounded w-2/3" />
      </div>
    )
  }

  const hasWallet = !!walletInfo?.circle_wallet_address

  // State: No wallet generated
  if (!hasWallet) {
    return (
      <div className="bg-white border border-[rgba(220,200,180,0.35)] rounded-[20px] p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-[rgba(232,112,61,0.08)] rounded-[11px] flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-[#E8703D]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1410]">Pay with USDC on Base</p>
            <p className="text-xs text-[rgba(26,20,16,0.50)] mt-1">
              Generate a unique deposit address to fund your account with USDC. Deposits are detected automatically.
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-2.5 px-4 rounded-[11px] font-semibold text-sm text-white transition-colors"
          style={{ background: generating ? 'rgba(220,200,180,0.45)' : 'linear-gradient(135deg, #F0905A 0%, #E8703D 100%)', borderRadius: 20 }}
        >
          {generating ? 'Generating...' : 'Generate Deposit Address'}
        </button>
        {error && <p className="text-xs text-[#DC2626] mt-2">{error}</p>}
      </div>
    )
  }

  // State: Wallet exists
  const addr = walletInfo.circle_wallet_address
  const usdcAvailable = walletInfo.usdc_available_balance || '0'
  const usdcEscrow = walletInfo.usdc_escrow_balance || '0'

  return (
    <div className="bg-white border border-[rgba(220,200,180,0.35)] rounded-[20px] p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-[rgba(26,158,106,0.08)] rounded-[11px] flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-[#1A9E6A]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1A1410]">USDC Wallet Active</p>
          <p className="text-xs text-[rgba(26,20,16,0.50)] mt-1">
            Send USDC on Base to your deposit address below. Deposits are confirmed automatically.
          </p>
        </div>
      </div>

      {/* Deposit address */}
      <div className="bg-[rgba(220,200,180,0.15)] rounded-[11px] p-3 mb-3">
        <p className="text-xs text-[rgba(26,20,16,0.50)] mb-1">Your Deposit Address (Base)</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-mono text-[#1A1410] break-all select-all flex-1">{addr}</p>
          <button onClick={handleCopy} className="p-1.5 rounded hover:bg-[rgba(220,200,180,0.25)] transition-colors flex-shrink-0" title="Copy address">
            {copied ? <Check size={14} className="text-[#1A9E6A]" /> : <Copy size={14} className="text-[rgba(26,20,16,0.50)]" />}
          </button>
        </div>
      </div>

      {/* Balance display */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-[#FAFAF8] rounded-[11px] p-3">
          <p className="text-xs text-[rgba(26,20,16,0.50)] mb-0.5">Available</p>
          <p className="text-base font-semibold text-[#1A1410]">{parseFloat(usdcAvailable).toFixed(2)} <span className="text-xs font-normal text-[rgba(26,20,16,0.50)]">USDC</span></p>
        </div>
        <div className="bg-[#FAFAF8] rounded-[11px] p-3">
          <p className="text-xs text-[rgba(26,20,16,0.50)] mb-0.5">In Escrow</p>
          <p className="text-base font-semibold text-[#1A1410]">{parseFloat(usdcEscrow).toFixed(2)} <span className="text-xs font-normal text-[rgba(26,20,16,0.50)]">USDC</span></p>
        </div>
      </div>

      {/* Sync + network info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-[rgba(26,20,16,0.50)]">
          <span>Network: Base</span>
          <span>Token: USDC</span>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs font-medium text-[rgba(26,20,16,0.50)] hover:text-[#1A1410] transition-colors disabled:opacity-50"
          title="Sync balance from blockchain"
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {/* Sync feedback */}
      {syncMessage && (
        <p className="text-xs text-[#1A9E6A] mt-2 text-right">{syncMessage}</p>
      )}
      {error && <p className="text-xs text-[#DC2626] mt-2">{error}</p>}
    </div>
  )
}
