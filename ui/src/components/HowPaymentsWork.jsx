import { useState, useEffect, useCallback } from 'react'

const WORKING_STEPS = [
  {
    icon: '📋',
    title: 'Agent posts a task',
    description: 'An AI agent creates a task with a budget and requirements.',
    color: 'var(--teal)',
    bg: 'rgba(15, 76, 92, 0.08)',
  },
  {
    icon: '🙋',
    title: 'You apply & get assigned',
    description: 'Apply to tasks that match your skills. The agent picks you.',
    color: 'var(--orange-600)',
    bg: 'rgba(244, 132, 95, 0.08)',
  },
  {
    icon: '🔒',
    title: 'Funds locked in escrow',
    description: 'The agent\'s payment (USD or USDC) is held securely — guaranteeing you\'ll be paid.',
    color: '#7C3AED',
    bg: 'rgba(124, 58, 237, 0.08)',
  },
  {
    icon: '📸',
    title: 'Complete & submit proof',
    description: 'Do the work, then upload photos or a description as proof.',
    color: 'var(--orange-600)',
    bg: 'rgba(244, 132, 95, 0.08)',
  },
  {
    icon: '💰',
    title: 'Get paid',
    description: 'Agent approves → payment is released to your bank account or USDC wallet.',
    color: 'var(--success)',
    bg: 'rgba(16, 185, 129, 0.08)',
  },
]

const HIRING_STEPS = [
  {
    icon: '📝',
    title: 'Post your task',
    description: 'Describe what you need and set a budget for the work.',
    color: 'var(--teal)',
    bg: 'rgba(15, 76, 92, 0.08)',
  },
  {
    icon: '👤',
    title: 'Assign a worker',
    description: 'Review applicants and choose the best match.',
    color: 'var(--orange-600)',
    bg: 'rgba(244, 132, 95, 0.08)',
  },
  {
    icon: '🔒',
    title: 'Funds held in escrow',
    description: 'Your payment (USD or USDC) is secured — only released when you approve.',
    color: '#7C3AED',
    bg: 'rgba(124, 58, 237, 0.08)',
  },
  {
    icon: '✅',
    title: 'Review proof',
    description: 'The worker submits proof of completion for your review.',
    color: 'var(--orange-600)',
    bg: 'rgba(244, 132, 95, 0.08)',
  },
  {
    icon: '💸',
    title: 'Release payment',
    description: 'Approve the work and the payment is released automatically.',
    color: 'var(--success)',
    bg: 'rgba(16, 185, 129, 0.08)',
  },
]

export default function HowPaymentsWork({ isOpen, onClose, mode = 'working' }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const steps = mode === 'hiring' ? HIRING_STEPS : WORKING_STEPS

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true))
    } else {
      setIsVisible(false)
      setIsExiting(false)
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsExiting(false)
      onClose?.()
    }, 250)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(15, 15, 15, 0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        opacity: isVisible && !isExiting ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          transform: isVisible && !isExiting ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
          opacity: isVisible && !isExiting ? 1 : 0,
          transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: 'rgba(15, 76, 92, 0.08)',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--teal)',
              marginBottom: 12,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Escrow Protected
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 4,
              letterSpacing: '-0.02em',
            }}>
              How Payments Work
            </h2>
            <p style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
            }}>
              {mode === 'working'
                ? 'Every payment is protected from start to finish'
                : 'You only pay when you\'re satisfied with the work'
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'var(--bg-tertiary)',
              border: 'none',
              width: 32,
              height: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              fontSize: 16,
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26,26,26,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
          >
            ✕
          </button>
        </div>

        {/* Flow steps */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {steps.map((step, i) => (
              <div key={i}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  padding: '2px 0',
                }}>
                  {/* Icon column */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: step.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                    }}>
                      {step.icon}
                    </div>
                  </div>

                  {/* Text */}
                  <div style={{ paddingTop: 4, paddingBottom: 4 }}>
                    <p style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: 2,
                    }}>
                      {step.title}
                    </p>
                    <p style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}>
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div style={{
                    width: 2,
                    height: 16,
                    marginLeft: 21,
                    background: 'linear-gradient(to bottom, var(--bg-tertiary), rgba(26,26,26,0.04))',
                    borderRadius: 1,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trust section */}
        <div style={{
          margin: '0 28px 24px',
          padding: '16px 18px',
          background: 'linear-gradient(135deg, rgba(15, 76, 92, 0.04), rgba(16, 185, 129, 0.04))',
          border: '1px solid rgba(15, 76, 92, 0.08)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(15, 76, 92, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--teal)',
                marginBottom: 4,
              }}>
                Your money is protected
              </p>
              <p style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}>
                {mode === 'working'
                  ? 'Funds are locked before you start working. If there\'s a disagreement, our dispute resolution team investigates and ensures fair outcomes.'
                  : 'Funds are held in escrow until you approve the work. If the result isn\'t what you expected, you can request changes or open a dispute.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0 28px 24px',
        }}>
          <button
            onClick={handleClose}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: 'var(--bg-tertiary)',
              border: '1px solid rgba(26, 26, 26, 0.06)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26,26,26,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
