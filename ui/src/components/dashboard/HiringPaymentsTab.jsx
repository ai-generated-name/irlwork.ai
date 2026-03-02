// Hiring mode payments — collapsible payment methods, default selector, transaction history
import React, { lazy, Suspense, useState } from 'react'
import Loading from '../Loading'
import { Card } from '../ui'

const StripeProvider = lazy(() => import('../StripeProvider'))
const PaymentMethodForm = lazy(() => import('../PaymentMethodForm'))
const PaymentMethodList = lazy(() => import('../PaymentMethodList'))
const UsdcDepositSection = lazy(() => import('../UsdcDepositSection'))
const DefaultPaymentMethodToggle = lazy(() => import('../DefaultPaymentMethodToggle'))

export default function HiringPaymentsTab({
  user,
  postedTasks,
}) {
  const [cardSectionOpen, setCardSectionOpen] = useState(true)
  const [usdcSectionOpen, setUsdcSectionOpen] = useState(false)
  const [savedCards, setSavedCards] = useState([])

  const hasCards = savedCards.length > 0

  return (
    <div className="space-y-5 md:space-y-6">
      <h1 className="dashboard-v4-page-title">Payments</h1>

      {/* Payment Overview Stats */}
      {(() => {
        const fundedTasks = postedTasks.filter(t => t.escrow_amount && (t.escrow_status === 'deposited' || t.escrow_status === 'released' || t.escrow_status === 'refunded'))
        const totalSpent = fundedTasks.filter(t => t.escrow_status === 'deposited' || t.escrow_status === 'released').reduce((sum, t) => sum + (t.escrow_amount || 0), 0)
        const inEscrow = fundedTasks.filter(t => t.escrow_status === 'deposited').reduce((sum, t) => sum + (t.escrow_amount || 0), 0)
        const released = fundedTasks.filter(t => t.escrow_status === 'released').reduce((sum, t) => sum + (t.escrow_amount || 0), 0)

        return (
          <>
            {/* Stats Row */}
            <div className="payment-stats-grid">
              <div className="payment-stat-card">
                <span className="payment-stat-label">Total Spent</span>
                <span className="payment-stat-value">${(totalSpent / 100).toFixed(2)}</span>
              </div>
              <div className="payment-stat-card">
                <span className="payment-stat-label">In Escrow</span>
                <span className="payment-stat-value">${(inEscrow / 100).toFixed(2)}</span>
              </div>
              <div className="payment-stat-card">
                <span className="payment-stat-label">Released</span>
                <span className="payment-stat-value payment-stat-value--accent">${(released / 100).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Methods — Collapsible Rows */}
            <div>
              <h3 className="text-base md:text-lg font-bold text-[#1A1A1A] mb-3">Payment Methods</h3>
              <div className="space-y-2">

                {/* Credit Card Row */}
                <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setCardSectionOpen(!cardSectionOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 md:py-3.5 hover:bg-[#FAFAF8] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F5F3F0] flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-[#525252]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-[#1A1A1A]">Credit Card</p>
                        <p className="text-xs text-[#888888]">
                          {hasCards ? `${savedCards.length} card${savedCards.length > 1 ? 's' : ''} saved` : 'No cards added'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasCards && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#D1FAE5] text-[#059669]">Active</span>
                      )}
                      <svg className={`w-4 h-4 text-[#888888] transition-transform duration-200 ${cardSectionOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  <div style={{
                    maxHeight: cardSectionOpen ? '600px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease-in-out',
                  }}>
                    <div className="px-4 pb-4 border-t border-[rgba(0,0,0,0.06)]">
                      <Suspense fallback={<div className="py-4 text-center text-sm text-[#888888]">Loading...</div>}>
                        <StripeProvider>
                          <div className="pt-3">
                            <PaymentMethodList
                              user={user}
                              onUpdate={(refresh) => { window.__refreshPaymentMethods = refresh; }}
                              onMethodsLoaded={(m) => setSavedCards(m)}
                            />
                            <PaymentMethodForm user={user} onSaved={() => { if (window.__refreshPaymentMethods) window.__refreshPaymentMethods(); }} />
                          </div>
                        </StripeProvider>
                      </Suspense>
                    </div>
                  </div>
                </div>

                {/* USDC on Base Row */}
                <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setUsdcSectionOpen(!usdcSectionOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 md:py-3.5 hover:bg-[#FAFAF8] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-[#1A1A1A]">USDC on Base</p>
                        <p className="text-xs text-[#888888]">Send USDC to fund tasks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB]">Available</span>
                      <svg className={`w-4 h-4 text-[#888888] transition-transform duration-200 ${usdcSectionOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  <div style={{
                    maxHeight: usdcSectionOpen ? '500px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease-in-out',
                  }}>
                    <div className="px-4 pb-4 border-t border-[rgba(0,0,0,0.06)]">
                      <div className="pt-3">
                        <Suspense fallback={<div className="py-4 text-center text-sm text-[#888888]">Loading...</div>}>
                          <UsdcDepositSection user={user} />
                        </Suspense>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Default Payment Method */}
            <div>
              <h3 className="text-base md:text-lg font-bold text-[#1A1A1A] mb-3">Default Payment Method</h3>
              <Suspense fallback={<Loading />}>
                <DefaultPaymentMethodToggle user={user} />
              </Suspense>
            </div>

            {/* Transaction History */}
            <div>
              <h3 className="text-base md:text-lg font-bold text-[#1A1A1A] mb-3">Transaction History</h3>
              {fundedTasks.length > 0 ? (
                <div className="space-y-2">
                  {[...fundedTasks]
                    .sort((a, b) => new Date(b.escrow_deposited_at || b.created_at) - new Date(a.escrow_deposited_at || a.created_at))
                    .map(task => {
                    const isReleased = task.escrow_status === 'released'
                    const isDeposited = task.escrow_status === 'deposited'
                    const isRefunded = task.escrow_status === 'refunded'
                    const isPendingReview = task.status === 'pending_review'
                    const isDisputed = task.status === 'disputed'
                    const isUsdc = task.payment_method === 'usdc'

                    const statusLabel = isReleased ? 'Released' : isRefunded ? 'Refunded' : isPendingReview ? 'In Review' : isDisputed ? 'Disputed' : 'In Escrow'
                    const statusColor = isReleased ? 'bg-[#D1FAE5] text-[#059669]'
                      : isRefunded ? 'bg-[#FEE2E2] text-[#DC2626]'
                      : isPendingReview ? 'bg-[#DBEAFE] text-[#1E40AF]'
                      : isDisputed ? 'bg-[#FEE2E2] text-[#DC2626]'
                      : isDeposited ? 'bg-[#FEF3C7] text-[#92400E]'
                      : 'bg-[#F5F3F0] text-[#525252]'

                    return (
                      <Card
                        key={task.id}
                        padding="none"
                        className="p-3 md:p-4 hover:shadow-v4-md hover:border-[rgba(0,0,0,0.14)] transition-all cursor-pointer group"
                        onClick={() => window.location.href = `/tasks/${task.id}`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[#1A1A1A] font-medium text-sm md:text-base truncate group-hover:text-[#0F4C5C] transition-colors">
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {/* Payment method badge */}
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${
                                isUsdc ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F5F3F0] text-[#525252]'
                              }`}>
                                {isUsdc ? (
                                  <><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1" /></svg>USDC</>
                                ) : (
                                  <><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3" /></svg>Card</>
                                )}
                              </span>
                              {/* Date/time */}
                              <span className="text-[11px] text-[#888888]">
                                {task.escrow_deposited_at
                                  ? new Date(task.escrow_deposited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                  : 'Pending deposit'}
                              </span>
                              {task.assignee && (
                                <span className="text-[11px] text-[#A3A3A3] hidden md:inline">&middot; {task.assignee.name}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                            <p className="text-base md:text-lg font-bold text-[#1A1A1A]">
                              {isRefunded ? '-' : ''}${(task.escrow_amount / 100).toFixed(2)}
                            </p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Card padding="none" className="p-8 md:p-10 text-center">
                  <div className="w-10 h-10 bg-[#F5F3F0] rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-[#888888]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                  </div>
                  <p className="text-[#333333] font-medium text-sm">No transactions yet</p>
                  <p className="text-xs text-[#A3A3A3] mt-1">Fund a task to see your payment history</p>
                </Card>
              )}
            </div>
          </>
        )
      })()}
    </div>
  )
}
