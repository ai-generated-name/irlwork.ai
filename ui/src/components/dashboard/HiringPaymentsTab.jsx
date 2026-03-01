// Extracted from Dashboard.jsx — hiring mode payments overview and management
import React, { lazy, Suspense } from 'react'
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
  return (
          <div className="space-y-4 md:space-y-6">
            <h1 className="dashboard-v4-page-title">Payments</h1>

            {/* Payment Flow Explainer */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(15,76,92,0.06), rgba(224,122,95,0.06))',
              border: '1px solid rgba(15,76,92,0.12)',
              borderRadius: 16,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'rgba(15,76,92,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F4C5C" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>How payments work</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  When you assign a worker, your payment is held in escrow. Once you approve the completed work, the payment is released to the worker.
                </p>
              </div>
            </div>

            {/* Payment Overview */}
            {(() => {
              const paidTasks = postedTasks.filter(t => t.escrow_amount && t.escrow_status)
              const totalSpent = paidTasks.reduce((sum, t) => sum + (t.escrow_amount || 0), 0)
              const inEscrow = paidTasks.filter(t => t.status === 'in_progress').reduce((sum, t) => sum + (t.escrow_amount || 0), 0)
              const released = paidTasks.filter(t => t.status === 'paid' || t.status === 'completed').reduce((sum, t) => sum + (t.escrow_amount || 0), 0)
              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card padding="md">
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">Total spent</p>
                      <p className="text-2xl md:text-3xl font-bold text-[#1A1A1A] tracking-tight mt-1" style={{ fontFamily: 'DM Mono, monospace' }}>${(totalSpent / 100).toFixed(2)}</p>
                    </Card>
                    <Card padding="md">
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">In escrow</p>
                      <p className="text-2xl md:text-3xl font-bold text-[#1A1A1A] tracking-tight mt-1" style={{ fontFamily: 'DM Mono, monospace' }}>${(inEscrow / 100).toFixed(2)}</p>
                    </Card>
                    <Card padding="md" className="col-span-2 md:col-span-1">
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">Released</p>
                      <p className="text-2xl md:text-3xl font-bold text-teal tracking-tight mt-1" style={{ fontFamily: 'DM Mono, monospace' }}>${(released / 100).toFixed(2)}</p>
                    </Card>
                  </div>

                  {/* Transaction History */}
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Transaction History</h3>

                    {paidTasks.length > 0 ? (
                      <div className="space-y-2 md:space-y-3">
                        {paidTasks.map(task => {
                          const isReleased = task.status === 'paid'
                          const isCompleted = task.status === 'completed'
                          const isInProgress = task.status === 'in_progress'

                          return (
                            <Card
                              key={task.id}
                              padding="none"
                              className="p-3 md:p-4 hover:shadow-v4-md transition-shadow"
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[#1A1A1A] font-medium text-sm md:text-base truncate">
                                      {task.title}
                                    </p>
                                    <span className={`
                                      px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide flex-shrink-0
                                      ${isReleased ? 'bg-teal/8 text-teal' : ''}
                                      ${isCompleted ? 'bg-teal/8 text-teal' : ''}
                                      ${isInProgress ? 'bg-[#F5F3F0] text-[#888888]' : ''}
                                      ${!isReleased && !isCompleted && !isInProgress ? 'bg-[#F5F3F0] text-[#333333]' : ''}
                                    `}>
                                      {isReleased ? 'Released' : isCompleted ? 'Completed' : isInProgress ? 'In Escrow' : task.escrow_status === 'deposited' ? 'Deposited' : task.escrow_status}
                                    </span>
                                    {task.payment_method === 'usdc' && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] flex-shrink-0">USDC</span>
                                    )}
                                  </div>

                                  <p className="text-xs text-[#888888] mt-1">
                                    {task.escrow_deposited_at
                                      ? new Date(task.escrow_deposited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                      : 'Pending deposit'}
                                    {task.assignee && <> &middot; {task.assignee.name}</>}
                                  </p>
                                </div>

                                <div className="text-right flex-shrink-0">
                                  <p className={`
                                    text-lg md:text-xl font-bold
                                    ${isReleased || isCompleted ? 'text-[#1A1A1A]' : ''}
                                    ${isInProgress ? 'text-[#1A1A1A]' : ''}
                                    ${!isReleased && !isCompleted && !isInProgress ? 'text-[#888888]' : ''}
                                  `}>
                                    ${(task.escrow_amount / 100).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    ) : (
                      <Card padding="none" className="p-8 md:p-12 text-center">
                        <div className="w-12 h-12 bg-[#F5F3F0] rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                          <svg className="w-6 h-6 text-[#888888]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                          </svg>
                        </div>
                        <p className="text-[#333333] font-medium text-sm md:text-base">No transactions yet</p>
                        <p className="text-xs md:text-sm text-[#A3A3A3] mt-1.5">
                          Fund a task to see your payment history
                        </p>
                      </Card>
                    )}
                  </div>
                </>
              )
            })()}

            {/* Payment Methods */}
            <div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Payment Methods</h3>
              <Suspense fallback={<Loading />}>
                <StripeProvider>
                  <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <h4 className="text-sm font-medium text-[#333333] mb-3">Saved Cards</h4>
                      <PaymentMethodList user={user} onUpdate={(refresh) => { window.__refreshPaymentMethods = refresh; }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#333333] mb-3">Add new card</h4>
                      <PaymentMethodForm user={user} onSaved={() => { if (window.__refreshPaymentMethods) window.__refreshPaymentMethods(); }} />
                    </div>
                    <Card padding="none" className="p-4 text-xs text-[#888888]">
                      When you assign a worker to a task, your default card will be charged automatically. Please ensure you have a card saved before assigning workers.
                    </Card>
                  </div>
                </StripeProvider>
              </Suspense>
            </div>

            {/* USDC Payment Option */}
            <div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">USDC Payments</h3>
              <div style={{ maxWidth: 520 }}>
                <Suspense fallback={<Loading />}>
                  <UsdcDepositSection user={user} />
                </Suspense>
              </div>
            </div>

            {/* Default Payment Method Toggle */}
            <div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Default Payment Method</h3>
              <div style={{ maxWidth: 520 }}>
                <Suspense fallback={<Loading />}>
                  <DefaultPaymentMethodToggle user={user} />
                </Suspense>
              </div>
            </div>
          </div>
  )
}
