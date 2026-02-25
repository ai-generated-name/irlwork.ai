import React, { useState, useEffect } from 'react'
import { Check, Sparkles, Crown, ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import MarketingFooter from '../components/Footer'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price_monthly: 0,
    price_annual: 0,
    description: 'Get started with the basics',
    features: [
      { label: 'Badge', value: 'None' },
      { label: 'Worker priority', value: 'Standard' },
      { label: 'Worker fee', value: '15%' },
      { label: 'Poster fee', value: '5%' },
      { label: 'Task posting', value: '5/month' },
    ],
  },
  {
    id: 'builder',
    name: 'Builder',
    price_monthly: 10,
    price_annual: 90,
    description: 'For active users who want lower fees',
    badge: { label: 'Builder', color: '#3B82F6' },
    features: [
      { label: 'Badge', value: 'Blue', highlight: true },
      { label: 'Worker priority', value: 'Priority', highlight: true },
      { label: 'Worker fee', value: '12.5%', highlight: true },
      { label: 'Poster fee', value: '2.5%', highlight: true },
      { label: 'Task posting', value: 'Unlimited', highlight: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price_monthly: 30,
    price_annual: 270,
    description: 'Maximum visibility and lowest fees',
    badge: { label: 'Pro', color: '#F59E0B' },
    popular: true,
    features: [
      { label: 'Badge', value: 'Gold', highlight: true },
      { label: 'Worker priority', value: 'Top of list', highlight: true },
      { label: 'Worker fee', value: '10%', highlight: true },
      { label: 'Poster fee', value: '0%', highlight: true },
      { label: 'Task posting', value: 'Unlimited', highlight: true },
    ],
  },
]

export default function PremiumPage({ user }) {
  const [loading, setLoading] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState(null)
  const [billingPeriod, setBillingPeriod] = useState('monthly')

  const currentTier = user?.subscription_tier || 'free'

  // Check URL params for success/cancel status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscription') === 'success') {
      setMessage({ type: 'success', text: 'Subscription activated! Your plan has been upgraded.' })
      // Trigger a sync check to ensure tier is updated
      fetchSubscription(true)
      // Clean URL
      window.history.replaceState({}, '', '/premium')
    } else if (params.get('subscription') === 'canceled') {
      setMessage({ type: 'info', text: 'Checkout was canceled. No changes were made.' })
      window.history.replaceState({}, '', '/premium')
    }
  }, [])

  useEffect(() => {
    if (user) fetchSubscription()
  }, [user])

  async function fetchSubscription(checkStripe = false) {
    try {
      const url = checkStripe ? `${API_URL}/subscription?check_stripe=true` : `${API_URL}/subscription`
      const res = await fetch(url, {
        headers: { Authorization: user?.token || '' }
      })
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription)
      }
    } catch (e) {
      console.error('Failed to fetch subscription:', e)
    }
  }

  async function handleCheckout(tier) {
    setLoading(tier)
    try {
      const res = await fetch(`${API_URL}/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user?.token || '',
        },
        body: JSON.stringify({ tier, billing_period: billingPeriod }),
      })
      const data = await res.json()
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start checkout' })
        setLoading(null)
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
      setLoading(null)
    }
  }

  async function handleManageSubscription() {
    setLoading('manage')
    try {
      const res = await fetch(`${API_URL}/subscription/portal`, {
        method: 'POST',
        headers: { Authorization: user?.token || '' },
      })
      const data = await res.json()
      if (data.portal_url) {
        window.location.href = data.portal_url
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to open billing portal' })
        setLoading(null)
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
      setLoading(null)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch(`${API_URL}/subscription/sync`, {
        method: 'POST',
        headers: { Authorization: user?.token || '' },
      })
      const data = await res.json()
      if (data.subscription) {
        setSubscription(data.subscription)
        setMessage({ type: 'success', text: 'Subscription synced successfully.' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to sync. Please try again.' })
    }
    setSyncing(false)
  }

  const cancelDate = subscription?.cancel_at_period_end && subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null

  function getDisplayPrice(tier) {
    if (tier.price_monthly === 0) return { main: '0', sub: null }
    if (billingPeriod === 'annual') {
      const effectiveMonthly = tier.price_annual / 12
      const formatted = effectiveMonthly % 1 === 0 ? effectiveMonthly.toString() : effectiveMonthly.toFixed(2)
      return {
        main: formatted,
        sub: `$${tier.price_annual}/year, billed annually`,
        savings: `Save $${tier.price_monthly * 12 - tier.price_annual}/yr`,
      }
    }
    return { main: tier.price_monthly.toString(), sub: null }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/dashboard" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <ArrowLeft size={20} />
          </a>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: 0 }}>Upgrade Your Plan</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Lower fees, higher priority, unlimited posting</p>
          </div>
        </div>
      </div>

      {/* Message banner */}
      {message && (
        <div style={{
          maxWidth: 1100, margin: '16px auto 0', padding: '12px 20px', borderRadius: 8,
          background: message.type === 'success' ? '#ecfdf5' : message.type === 'error' ? '#fef2f2' : '#eff6ff',
          color: message.type === 'success' ? '#065f46' : message.type === 'error' ? '#991b1b' : '#1e40af',
          fontSize: 14, fontWeight: 500,
        }}>
          {message.text}
        </div>
      )}

      {/* Cancellation notice */}
      {cancelDate && (
        <div style={{
          maxWidth: 1100, margin: '16px auto 0', padding: '12px 20px', borderRadius: 8,
          background: '#fef9c3', color: '#854d0e', fontSize: 14,
        }}>
          Your plan will downgrade to Free on {cancelDate}. You can re-activate anytime before then.
        </div>
      )}

      {/* Billing period toggle */}
      <div style={{ maxWidth: 1100, margin: '40px auto 0', padding: '0 24px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <span style={{
            fontSize: 14, fontWeight: billingPeriod === 'monthly' ? 600 : 400,
            color: billingPeriod === 'monthly' ? '#111' : '#6b7280',
          }}>
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(p => p === 'monthly' ? 'annual' : 'monthly')}
            style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', padding: 0,
              background: billingPeriod === 'annual' ? '#0f4c5c' : '#d1d5db',
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 11, background: '#fff',
              position: 'absolute', top: 2,
              left: billingPeriod === 'annual' ? 24 : 2,
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
          <span style={{
            fontSize: 14, fontWeight: billingPeriod === 'annual' ? 600 : 400,
            color: billingPeriod === 'annual' ? '#111' : '#6b7280',
          }}>
            Annual
          </span>
          {billingPeriod === 'annual' && (
            <span style={{
              background: '#ecfdf5', color: '#065f46', fontSize: 12, fontWeight: 600,
              padding: '3px 10px', borderRadius: 999, marginLeft: 4,
            }}>
              Save 25%
            </span>
          )}
        </div>
      </div>

      {/* Pricing cards */}
      <div style={{ maxWidth: 1100, margin: '24px auto 40px', padding: '0 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}>
          {TIERS.map(tier => {
            const isCurrent = currentTier === tier.id
            const isPopular = tier.popular
            const price = getDisplayPrice(tier)

            return (
              <div key={tier.id} style={{
                background: '#fff',
                borderRadius: 16,
                border: isCurrent ? '2px solid #0f4c5c' : isPopular ? '2px solid #F59E0B' : '1px solid #e5e7eb',
                padding: 32,
                position: 'relative',
                boxShadow: isPopular ? '0 4px 24px rgba(245,158,11,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                {/* Popular badge */}
                {isPopular && !isCurrent && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff',
                    padding: '4px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}>
                    MOST POPULAR
                  </div>
                )}

                {/* Current plan badge */}
                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: '#0f4c5c', color: '#fff',
                    padding: '4px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}>
                    CURRENT PLAN
                  </div>
                )}

                {/* Tier header */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                    {tier.id === 'pro' && <Crown size={20} color="#F59E0B" />}
                    {tier.id === 'builder' && <Sparkles size={20} color="#3B82F6" />}
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0 }}>{tier.name}</h2>
                  </div>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>{tier.description}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                    <span style={{ fontSize: 40, fontWeight: 800, color: '#111' }}>
                      ${price.main}
                    </span>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>/mo</span>
                  </div>
                  {price.sub && (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      {price.sub}
                    </div>
                  )}
                  {isCurrent && subscription?.billing_period && (
                    <div style={{ fontSize: 12, color: '#0f4c5c', marginTop: 4, fontWeight: 500 }}>
                      {subscription.billing_period === 'annual' ? 'Annual plan' : 'Monthly plan'}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginBottom: 24 }}>
                  {tier.features.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0', borderBottom: i < tier.features.length - 1 ? '1px solid #f9fafb' : 'none',
                    }}>
                      <span style={{ fontSize: 14, color: '#6b7280' }}>{f.label}</span>
                      <span style={{
                        fontSize: 14, fontWeight: 600,
                        color: f.highlight ? '#0f4c5c' : '#374151',
                      }}>
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <button
                    disabled
                    style={{
                      width: '100%', padding: '12px 0', borderRadius: 10,
                      background: '#f3f4f6', color: '#9ca3af', border: 'none',
                      fontSize: 14, fontWeight: 600, cursor: 'default',
                    }}
                  >
                    Current Plan
                  </button>
                ) : tier.id === 'free' ? (
                  currentTier !== 'free' ? (
                    <button
                      onClick={handleManageSubscription}
                      disabled={loading === 'manage'}
                      style={{
                        width: '100%', padding: '12px 0', borderRadius: 10,
                        background: '#fff', color: '#374151', border: '1px solid #d1d5db',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        opacity: loading === 'manage' ? 0.6 : 1,
                      }}
                    >
                      {loading === 'manage' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Manage Subscription'}
                    </button>
                  ) : null
                ) : (
                  <button
                    onClick={() => handleCheckout(tier.id)}
                    disabled={!!loading}
                    style={{
                      width: '100%', padding: '12px 0', borderRadius: 10,
                      background: tier.id === 'pro'
                        ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                        : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                      color: '#fff', border: 'none',
                      fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {loading === tier.id ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Redirecting...
                      </span>
                    ) : (
                      `Upgrade to ${tier.name}`
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Manage subscription / sync links */}
        <div style={{ textAlign: 'center', marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {currentTier !== 'free' && (
            <button
              onClick={handleManageSubscription}
              disabled={loading === 'manage'}
              style={{
                background: 'none', border: 'none', color: '#0f4c5c',
                fontSize: 14, fontWeight: 500, cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Manage Billing & Cancel
            </button>
          )}

          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              background: 'none', border: 'none', color: '#9ca3af',
              fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <RefreshCw size={13} style={syncing ? { animation: 'spin 1s linear infinite' } : undefined} />
            Not seeing your upgrade? Click to restore
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <MarketingFooter />
    </div>
  )
}
