import React, { useState, useEffect } from 'react'
import { BadgeCheck, ArrowLeft, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../context/AuthContext'
import { navigate } from '../utils/navigate'
import { usePageTitle } from '../hooks/usePageTitle'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

async function getFreshToken(fallback) {
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) return session.access_token
  }
  return fallback || ''
}

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
    description: 'Enhanced visibility and lower fees',
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
    description: 'Max visibility and lowest fees',
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
  usePageTitle('Premium')
  const [loading, setLoading] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState(null)
  const [billingPeriod, setBillingPeriod] = useState('monthly')
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  const [expandedTier, setExpandedTier] = useState(null)

  const currentTier = user?.subscription_tier || 'free'

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Check URL params for success/cancel status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscription') === 'success') {
      setMessage({ type: 'success', text: 'Subscription activated. Your plan has been upgraded.' })
      fetchSubscription(true)
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
      const token = await getFreshToken(user?.token)

      const url = checkStripe ? `${API_URL}/subscription?check_stripe=true` : `${API_URL}/subscription`
      const res = await fetch(url, {
        headers: { Authorization: token }
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
    if (!user) {
      navigate('/auth')
      return
    }
    setLoading(tier)
    setMessage(null)
    try {
      const token = await getFreshToken(user?.token)

      if (!token) {
        setMessage({ type: 'error', text: 'Session expired. Please refresh the page and try again.' })
        setLoading(null)
        return
      }
      const res = await fetch(`${API_URL}/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({ tier, billing_period: billingPeriod }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not start checkout. Please try again.' })
        setLoading(null)
        return
      }
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        setMessage({ type: 'error', text: 'Could not start checkout. Please try again.' })
        setLoading(null)
      }
    } catch (e) {
      console.error('[Premium] checkout error:', e)
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
      setLoading(null)
    }
  }

  async function handleManageSubscription() {
    if (!user) {
      navigate('/auth')
      return
    }
    setLoading('manage')
    try {
      const token = await getFreshToken(user?.token)
      const res = await fetch(`${API_URL}/subscription/portal`, {
        method: 'POST',
        headers: { Authorization: token },
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: res.status === 401 ? 'Please sign in to manage billing.' : (data.error || 'Could not open billing portal. Please try again.') })
        setLoading(null)
        return
      }
      if (data.portal_url) {
        window.location.href = data.portal_url
      } else {
        setMessage({ type: 'error', text: 'Could not open billing portal. Please try again.' })
        setLoading(null)
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
      setLoading(null)
    }
  }

  async function handleSync() {
    if (!user) {
      navigate('/auth')
      return
    }
    setSyncing(true)
    try {
      const token = await getFreshToken(user?.token)
      const res = await fetch(`${API_URL}/subscription/sync`, {
        method: 'POST',
        headers: { Authorization: token },
      })
      if (!res.ok) {
        setMessage({ type: 'error', text: res.status === 401 ? 'Please sign in to sync.' : 'Failed to sync. Please try again.' })
        setSyncing(false)
        return
      }
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
        sub: `$${tier.price_annual}/yr billed annually`,
        savings: `Save $${tier.price_monthly * 12 - tier.price_annual}/yr`,
      }
    }
    return { main: tier.price_monthly.toString(), sub: null }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-secondary)', borderBottom: '1px solid rgba(26,26,26,0.06)',
        padding: isMobile ? '12px 16px' : '16px 24px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12 }}>
          <a href="/dashboard" style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <ArrowLeft size={isMobile ? 18 : 20} />
          </a>
          <div>
            <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>Upgrade your plan</h1>
            <p style={{ fontSize: isMobile ? 12 : 13, color: 'var(--text-secondary)', margin: 0 }}>Lower fees, higher priority, unlimited posting</p>
          </div>
        </div>
      </div>

      {/* Message banner */}
      {message && (
        <div style={{
          maxWidth: 1100, margin: '16px auto 0', padding: isMobile ? '10px 16px' : '12px 20px', borderRadius: 'var(--radius-md)',
          background: message.type === 'success' ? 'var(--success-bg)' : message.type === 'error' ? 'var(--error-bg)' : 'rgba(59,130,246,0.08)',
          color: message.type === 'success' ? '#065f46' : message.type === 'error' ? '#991b1b' : '#1e40af',
          fontSize: isMobile ? 13 : 14, fontWeight: 500, marginLeft: isMobile ? 16 : 'auto', marginRight: isMobile ? 16 : 'auto',
        }}>
          {message.text}
        </div>
      )}

      {/* Cancellation notice */}
      {cancelDate && (
        <div style={{
          maxWidth: 1100, margin: '16px auto 0', padding: isMobile ? '10px 16px' : '12px 20px', borderRadius: 'var(--radius-md)',
          background: 'var(--warning-bg)', color: '#854d0e', fontSize: isMobile ? 13 : 14,
          marginLeft: isMobile ? 16 : 'auto', marginRight: isMobile ? 16 : 'auto',
        }}>
          Your plan will downgrade to Free on {cancelDate}. You can re-activate anytime before then.
        </div>
      )}

      {/* Billing period toggle */}
      <div style={{ maxWidth: 1100, margin: isMobile ? '20px auto 0' : '40px auto 0', padding: isMobile ? '0 16px' : '0 24px', textAlign: 'center' }}>
        <div className="premium-billing-toggle">
          <button
            className={billingPeriod === 'monthly' ? 'active' : ''}
            onClick={() => setBillingPeriod('monthly')}
          >
            Monthly
          </button>
          <button
            className={billingPeriod === 'annual' ? 'active' : ''}
            onClick={() => setBillingPeriod('annual')}
          >
            Annual
            <span className="premium-save-badge">-25%</span>
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div style={{ maxWidth: 1100, margin: isMobile ? '16px auto 24px' : '24px auto 40px', padding: isMobile ? '0 16px' : '0 24px' }}>
        <div
          style={isMobile ? {
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          } : {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {isMobile && (
            <div className="premium-plan-tabs">
              {TIERS.map(t => (
                <button
                  key={t.id}
                  className={`premium-plan-tab ${expandedTier === t.id || (!expandedTier && t.id === currentTier) ? 'active' : ''}`}
                  onClick={() => {
                    setExpandedTier(t.id)
                    const el = document.getElementById(`plan-${t.id}`)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
          {TIERS.map(tier => {
            const isCurrent = currentTier === tier.id
            const isPopular = tier.popular
            const price = getDisplayPrice(tier)
            const isExpanded = expandedTier === tier.id

            return (
              <div key={tier.id} id={`plan-${tier.id}`} style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: isCurrent ? '2px solid var(--orange-600)' : isPopular ? '2px solid var(--orange-400)' : '1px solid rgba(26,26,26,0.06)',
                padding: isMobile ? 16 : 28,
                position: 'relative',
                boxShadow: isPopular ? '0 4px 24px rgba(224,122,95,0.1)' : 'var(--shadow-sm)',
                transition: 'box-shadow 0.2s, transform 0.2s',
                ...(isMobile ? {
                  width: '100%',
                } : {}),
              }}>
                {/* Popular badge */}
                {isPopular && !isCurrent && (
                  <div style={{
                    position: 'absolute', top: isMobile ? -10 : -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))', color: '#fff',
                    padding: isMobile ? '3px 10px' : '4px 16px', borderRadius: 999,
                    fontSize: isMobile ? 10 : 12, fontWeight: 700,
                    letterSpacing: '0.05em', fontFamily: 'var(--font-display)',
                    whiteSpace: 'nowrap',
                  }}>
                    MOST POPULAR
                  </div>
                )}

                {/* Current plan badge */}
                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: isMobile ? -10 : -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--bg-dark)', color: '#fff',
                    padding: isMobile ? '3px 10px' : '4px 16px', borderRadius: 999,
                    fontSize: isMobile ? 10 : 12, fontWeight: 700,
                    letterSpacing: '0.05em', fontFamily: 'var(--font-display)',
                    whiteSpace: 'nowrap',
                  }}>
                    CURRENT PLAN
                  </div>
                )}

                {/* Tier header */}
                <div style={{ textAlign: 'center', marginBottom: isMobile ? 12 : 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: isMobile ? 4 : 8 }}>
                    {tier.id === 'builder' && <BadgeCheck size={isMobile ? 16 : 20} color="#3B82F6" />}
                    {tier.id === 'pro' && <BadgeCheck size={isMobile ? 16 : 20} color="#F59E0B" />}
                    <h2 style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>{tier.name}</h2>
                  </div>
                  <p style={{ fontSize: isMobile ? 11 : 13, color: 'var(--text-secondary)', margin: isMobile ? '0 0 8px' : '0 0 16px' }}>{tier.description}</p>
                  <div style={{ minHeight: isMobile ? 50 : 70, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                      <span style={{ fontSize: isMobile ? 28 : 40, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        ${price.main}
                      </span>
                      <span style={{ fontSize: isMobile ? 12 : 14, color: 'var(--text-tertiary)' }}>/mo</span>
                    </div>
                    {price.sub ? (
                      <div style={{ fontSize: isMobile ? 10 : 12, color: 'var(--text-tertiary)', marginTop: isMobile ? 2 : 4 }}>
                        {price.sub}
                      </div>
                    ) : (
                      <div style={{ fontSize: isMobile ? 10 : 12, marginTop: isMobile ? 2 : 4, visibility: 'hidden' }}>&nbsp;</div>
                    )}
                    {isCurrent && subscription?.billing_period && (
                      <div style={{ fontSize: isMobile ? 10 : 12, color: 'var(--orange-600)', marginTop: 2, fontWeight: 500 }}>
                        {subscription.billing_period === 'annual' ? 'Annual plan' : 'Monthly plan'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Features — always shown */}
                <div style={{ borderTop: '1px solid rgba(26,26,26,0.04)', paddingTop: isMobile ? 10 : 20, marginBottom: isMobile ? 10 : 24 }}>
                  {tier.features.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: isMobile ? '6px 0' : '10px 0',
                      borderBottom: i < tier.features.length - 1 ? '1px solid rgba(26,26,26,0.03)' : 'none',
                    }}>
                      <span style={{ fontSize: isMobile ? 12 : 14, color: 'var(--text-secondary)' }}>{f.label}</span>
                      <span style={{
                        fontSize: isMobile ? 12 : 14, fontWeight: 600,
                        color: f.highlight ? 'var(--orange-700)' : 'var(--text-primary)',
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
                      width: '100%', padding: isMobile ? '12px 0' : '12px 0', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: 'none',
                      fontSize: isMobile ? 13 : 14, fontWeight: 600, cursor: 'default',
                    }}
                  >
                    Current plan
                  </button>
                ) : tier.id === 'free' ? (
                  currentTier !== 'free' ? (
                    <button
                      onClick={handleManageSubscription}
                      disabled={loading === 'manage'}
                      style={{
                        width: '100%', padding: isMobile ? '12px 0' : '12px 0', borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                        border: '1px solid rgba(26,26,26,0.1)',
                        fontSize: isMobile ? 13 : 14, fontWeight: 600, cursor: 'pointer',
                        opacity: loading === 'manage' ? 0.6 : 1,
                      }}
                    >
                      {loading === 'manage' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Manage subscription'}
                    </button>
                  ) : null
                ) : (
                  <button
                    onClick={() => handleCheckout(tier.id)}
                    disabled={!!loading}
                    style={{
                      width: '100%', padding: isMobile ? '12px 0' : '12px 0', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-dark)',
                      color: '#fff', border: 'none',
                      fontSize: isMobile ? 13 : 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
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
        <div style={{ textAlign: 'center', marginTop: isMobile ? 20 : 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: isMobile ? '0 16px' : 0 }}>
          {currentTier !== 'free' && (
            <button
              onClick={handleManageSubscription}
              disabled={loading === 'manage'}
              style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                fontSize: isMobile ? 13 : 14, fontWeight: 500, cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Manage billing & cancel
            </button>
          )}

          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              background: 'none', border: 'none', color: 'var(--text-tertiary)',
              fontSize: isMobile ? 12 : 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
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
        .premium-scroll-row::-webkit-scrollbar {
          display: none;
        }
      `}</style>

    </div>
  )
}
