import { useState, useEffect, useCallback } from 'react'
import { FileText, User, Hammer, CheckCircle, Wallet } from 'lucide-react'

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Hiring Mode',
    subtitle: 'Everything you need to get real-world work done',
    features: [
      {
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        ),
        title: 'Post tasks',
        description: 'Describe what you need done and set a budget',
      },
      {
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-2v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        ),
        title: 'Browse verified humans',
        description: 'Find workers by skill, location, and rating',
      },
      {
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
        title: 'Escrow payments',
        description: 'Funds are protected until work is verified',
      },
    ],
  },
  {
    id: 'post-task',
    title: 'Post Your First Task',
    subtitle: 'It only takes a minute to get started',
    steps: [
      { number: '1', text: 'Click "Create Task" from My Tasks', accent: true },
      { number: '2', text: 'Add a title, description, and budget' },
      { number: '3', text: 'Choose a category and location' },
      { number: '4', text: 'Verified humans will apply within minutes' },
    ],
    tip: 'Be specific in your description — it helps humans understand exactly what you need and deliver better results.',
  },
  {
    id: 'payments',
    title: 'How Payments Work',
    subtitle: 'Secure escrow protects both sides',
    flow: [
      { icon: <FileText size={20} />, label: 'Post task', sublabel: 'Set your budget' },
      { icon: <User size={20} />, label: 'Assign worker', sublabel: 'Funds go to escrow' },
      { icon: <Hammer size={20} />, label: 'Work completed', sublabel: 'Worker submits proof' },
      { icon: <CheckCircle size={20} />, label: 'You approve', sublabel: 'Review the work' },
      { icon: <Wallet size={20} />, label: 'Payment released', sublabel: 'Worker gets paid' },
    ],
    safety: 'If anything goes wrong, our dispute resolution team steps in to help. You\'re never charged without seeing results.',
  },
  {
    id: 'connect',
    title: 'Connect Your AI Agent',
    subtitle: 'Give any AI agent the ability to hire humans — just copy one prompt',
    connectAgent: {
      steps: [
        { number: '1', text: 'Go to the Connect Agent page' },
        { number: '2', text: 'Copy the prompt into your AI agent (Claude, ChatGPT, etc.)' },
        { number: '3', text: 'Your agent will walk you through creating an account and getting an API key' },
      ],
      tip: 'The prompt tells your agent how to help you sign up and configure everything. Just paste it and follow along.',
      href: '/connect-agent',
    },
  },
]

export default function AgentOnboardingWizard({ user, onComplete, onNavigate }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1
  const progress = ((currentStep + 1) / STEPS.length) * 100

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  const handleComplete = useCallback(() => {
    setIsExiting(true)
    localStorage.setItem('irlwork_agent_onboarding_completed', 'true')
    setTimeout(() => {
      onComplete?.()
    }, 300)
  }, [onComplete])

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
      window.location.href = '/connect-agent'
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1)
  }

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
        background: 'rgba(15, 15, 15, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity: isVisible && !isExiting ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleComplete() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          transform: isVisible && !isExiting ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
          opacity: isVisible && !isExiting ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Progress */}
        <div style={{ height: 3, background: 'var(--bg-tertiary)' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--teal), var(--teal-light))',
            borderRadius: '0 2px 2px 0',
            transition: 'width 0.4s var(--ease-smooth)',
          }} />
        </div>

        <div style={{ padding: '28px 32px 24px' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              background: 'rgba(0, 0, 0, 0.08)',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--teal)',
            }}>
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <button
              onClick={handleComplete}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Skip
            </button>
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 6,
            letterSpacing: '-0.02em',
          }}>
            {step.title}
          </h2>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            marginBottom: 24,
          }}>
            {step.subtitle}
          </p>

          {/* Step 1: Features grid */}
          {step.features && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8 }}>
              {step.features.map((feat, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '16px 18px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--teal)',
                    flexShrink: 0,
                  }}>
                    {feat.icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{feat.title}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{feat.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Numbered steps */}
          {step.steps && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {step.steps.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 16px',
                      background: s.accent ? 'rgba(232, 133, 61, 0.06)' : 'var(--bg-tertiary)',
                      border: s.accent ? '1px solid rgba(232, 133, 61, 0.15)' : '1px solid rgba(0, 0, 0, 0.04)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: s.accent ? 'linear-gradient(135deg, var(--orange-600), var(--orange-500))' : 'rgba(0, 0, 0, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      color: s.accent ? 'white' : 'var(--text-secondary)',
                      flexShrink: 0,
                    }}>
                      {s.number}
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: s.accent ? 500 : 400 }}>{s.text}</p>
                  </div>
                ))}
              </div>
              {step.tip && (
                <div style={{
                  marginTop: 14,
                  padding: '12px 16px',
                  background: 'rgba(22, 163, 74, 0.06)',
                  border: '1px solid rgba(22, 163, 74, 0.12)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>Tip: </span>
                  {step.tip}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Payment flow */}
          {step.flow && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                padding: '4px 0',
              }}>
                {step.flow.map((f, i) => (
                  <div key={i}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '10px 0',
                    }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: 'var(--bg-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        flexShrink: 0,
                      }}>
                        {f.icon}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>{f.label}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{f.sublabel}</p>
                      </div>
                    </div>
                    {i < step.flow.length - 1 && (
                      <div style={{
                        width: 2,
                        height: 12,
                        marginLeft: 19,
                        background: 'var(--bg-tertiary)',
                        borderRadius: 1,
                      }} />
                    )}
                  </div>
                ))}
              </div>
              {step.safety && (
                <div style={{
                  marginTop: 12,
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.04)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--teal)' }}>Protected: </span>
                  {step.safety}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Connect Agent */}
          {step.connectAgent && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {step.connectAgent.steps.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 16px',
                      background: i === 0 ? 'rgba(0, 0, 0, 0.06)' : 'var(--bg-tertiary)',
                      border: i === 0 ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(0, 0, 0, 0.04)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: i === 0 ? 'linear-gradient(135deg, var(--teal), var(--teal-light))' : 'rgba(0, 0, 0, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      color: i === 0 ? 'white' : 'var(--text-secondary)',
                      flexShrink: 0,
                    }}>
                      {s.number}
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: i === 0 ? 500 : 400 }}>{s.text}</p>
                  </div>
                ))}
              </div>
              {step.connectAgent.tip && (
                <div style={{
                  marginTop: 14,
                  padding: '12px 16px',
                  background: 'rgba(22, 163, 74, 0.06)',
                  border: '1px solid rgba(22, 163, 74, 0.12)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>Tip: </span>
                  {step.connectAgent.tip}
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                style={{
                  padding: '12px 20px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: 'var(--accent-orange)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-md)',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)'
                e.target.style.boxShadow = 'var(--shadow-lg)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'var(--shadow-md)'
              }}
            >
              {isLastStep ? 'Go to Connect Agent →' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
