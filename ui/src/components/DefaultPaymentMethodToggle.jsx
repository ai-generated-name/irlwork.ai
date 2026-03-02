import React, { useState, useEffect, useCallback } from 'react'
import { CreditCard, Wallet, Check } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

/**
 * Toggle between Stripe and USDC as the default payment method for new tasks.
 * Shown on the Hiring-mode Payments tab for users who have both methods configured.
 */
export default function DefaultPaymentMethodToggle({ user }) {
  const [defaultMethod, setDefaultMethod] = useState('stripe')
  const [walletInfo, setWalletInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/wallet/balance`, {
        headers: { Authorization: user?.token || '' }
      })
      if (res.ok) {
        const data = await res.json()
        setWalletInfo(data)
        setDefaultMethod(data.default_payment_method || 'stripe')
      }
    } catch (e) {
      console.error('Failed to fetch payment status:', e)
    } finally {
      setLoading(false)
    }
  }, [user?.token])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleSwitch = async (method) => {
    if (method === defaultMethod || saving) return
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch(`${API_URL}/settings/default-payment-method`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user?.token || ''
        },
        body: JSON.stringify({ payment_method: method })
      })
      const data = await res.json()
      if (res.ok) {
        setDefaultMethod(method)
        setToast({ type: 'success', text: `Default payment method updated to ${method === 'usdc' ? 'USDC' : 'Credit Card'}` })
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to update' })
      }
    } catch (e) {
      setToast({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-[rgba(26,26,26,0.08)] rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
        <div className="h-12 bg-gray-100 rounded" />
      </div>
    )
  }

  const hasCard = !!walletInfo?.has_bank || !!user?.stripe_customer_id
  const hasWallet = !!walletInfo?.circle_wallet_address
  const usdcBalance = parseFloat(walletInfo?.usdc_available_balance || '0')

  // Only one method: show confirmation, no toggle
  if (!hasCard && !hasWallet) return null
  if (hasCard && !hasWallet) {
    return (
      <div className="bg-white border border-[rgba(26,26,26,0.08)] rounded-xl p-5">
        <div className="flex items-center gap-2 text-sm text-[#1A1A1A]">
          <CreditCard size={16} className="text-[#E07A5F]" />
          <span className="font-medium">Payment Method: Credit Card</span>
          <Check size={14} className="text-green-600" />
        </div>
        <p className="text-xs text-[#8A8A8A] mt-2">Want to pay with USDC? Generate a deposit address above to get started.</p>
      </div>
    )
  }
  if (!hasCard && hasWallet) {
    return (
      <div className="bg-white border border-[rgba(26,26,26,0.08)] rounded-xl p-5">
        <div className="flex items-center gap-2 text-sm text-[#1A1A1A]">
          <Wallet size={16} className="text-blue-600" />
          <span className="font-medium">Payment Method: USDC</span>
          <Check size={14} className="text-green-600" />
        </div>
        <p className="text-xs text-[#8A8A8A] mt-2">Want to pay with card? Add a payment method in the section above.</p>
      </div>
    )
  }

  // Both methods: show toggle
  return (
    <div className="bg-white border border-[rgba(26,26,26,0.08)] rounded-xl p-5">
      <p className="text-xs font-medium text-[#525252] mb-1">Default payment method for new tasks</p>
      <p className="text-[11px] text-[#8A8A8A] mb-3">You can override this when assigning individual tasks.</p>

      <div className="flex gap-2 mb-3">
        {/* Stripe option */}
        <button
          onClick={() => handleSwitch('stripe')}
          disabled={saving}
          className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-left ${
            defaultMethod === 'stripe'
              ? 'border-[#E07A5F] bg-orange-50'
              : 'border-[rgba(26,26,26,0.08)] bg-white hover:bg-gray-50'
          }`}
        >
          <CreditCard size={16} className={defaultMethod === 'stripe' ? 'text-[#E07A5F]' : 'text-[#8A8A8A]'} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${defaultMethod === 'stripe' ? 'text-[#1A1A1A]' : 'text-[#525252]'}`}>
              Credit Card
            </p>
          </div>
          {defaultMethod === 'stripe' && <Check size={14} className="text-[#E07A5F] flex-shrink-0" />}
        </button>

        {/* USDC option */}
        <button
          onClick={() => handleSwitch('usdc')}
          disabled={saving}
          className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-left ${
            defaultMethod === 'usdc'
              ? 'border-[#E07A5F] bg-orange-50'
              : 'border-[rgba(26,26,26,0.08)] bg-white hover:bg-gray-50'
          }`}
        >
          <Wallet size={16} className={defaultMethod === 'usdc' ? 'text-[#E07A5F]' : 'text-[#8A8A8A]'} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${defaultMethod === 'usdc' ? 'text-[#1A1A1A]' : 'text-[#525252]'}`}>
              USDC on Base
            </p>
          </div>
          {defaultMethod === 'usdc' && <Check size={14} className="text-[#E07A5F] flex-shrink-0" />}
        </button>
      </div>

      {/* Context text based on selection */}
      {defaultMethod === 'stripe' && (
        <p className="text-xs text-[#8A8A8A]">Your card will be charged when you assign workers.</p>
      )}
      {defaultMethod === 'usdc' && usdcBalance > 0 && (
        <p className="text-xs text-[#8A8A8A]">Available: {usdcBalance.toFixed(2)} USDC — funds are locked from your balance when you assign workers.</p>
      )}
      {defaultMethod === 'usdc' && usdcBalance === 0 && (
        <p className="text-xs text-amber-600 font-medium">Balance is $0 — deposit USDC to your address before creating tasks.</p>
      )}

      {/* Toast */}
      {toast && (
        <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {toast.text}
        </div>
      )}
    </div>
  )
}
