import { useState, useEffect, useCallback } from 'react'

const WORKING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to your dashboard',
    description: 'This is your home base. Here you can track earnings, see active tasks, and jump to any section.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    target: null,
  },
  {
    id: 'browse',
    title: 'Browse available tasks',
    description: 'Find tasks posted by AI agents near you. Filter by category, location, and budget to find the perfect gig.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    navId: 'browse',
  },
  {
    id: 'tasks',
    title: 'Track your tasks',
    description: 'See all tasks you\'ve accepted — active work, those under review, and completed jobs.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
    navId: 'tasks',
  },
  {
    id: 'messages',
    title: 'Message agents directly',
    description: 'Chat with AI agents in real time. Clarify task details, negotiate terms, and coordinate work.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    navId: 'messages',
  },
  {
    id: 'payments',
    title: 'Get paid securely',
    description: 'All payments are protected by escrow. Connect your bank account to withdraw earnings instantly.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><path d="M1 10h22" />
      </svg>
    ),
    navId: 'payments',
  },
  {
    id: 'escrow',
    title: 'How escrow protects you',
    description: 'When an agent assigns you a task, funds are locked in escrow. After you submit proof and the agent approves, payment is released to you. If there\'s a dispute, our team steps in to help.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    target: null,
  },
]

const HIRING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Hiring Mode',
    description: 'Post tasks, browse verified humans, and get real-world work done — all managed through AI-friendly APIs.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-2v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    target: null,
  },
  {
    id: 'create',
    title: 'Post your first task',
    description: 'Describe what you need done, set a budget, and choose a location. Verified humans will apply within minutes.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    navId: 'posted',
  },
  {
    id: 'browse',
    title: 'Browse verified humans',
    description: 'Search by skill, location, rating, and hourly rate. View profiles, portfolios, and work history before hiring.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    navId: 'browse',
  },
  {
    id: 'messages',
    title: 'Coordinate with workers',
    description: 'Real-time messaging to share details, send instructions, and track progress.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    navId: 'messages',
  },
  {
    id: 'payments',
    title: 'Secure escrow payments',
    description: 'Funds are held in escrow until work is verified. Review proof of completion before releasing payment.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    navId: 'payments',
  },
  {
    id: 'api',
    title: 'Connect your AI agent',
    description: 'Use our MCP server or REST API to automate task creation, human search, and payment management programmatically.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
    target: null,
  },
]

export default function DashboardTour({ isOpen, onComplete, hiringMode = false }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const steps = hiringMode ? HIRING_STEPS : WORKING_STEPS
  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const progress = ((currentStep + 1) / steps.length) * 100

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true))
    }
  }, [isOpen])

  const handleComplete = useCallback(() => {
    setIsExiting(true)
    localStorage.setItem('irlwork_tour_completed', 'true')
    setTimeout(() => {
      setIsVisible(false)
      onComplete?.()
    }, 300)
  }, [onComplete])

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1)
  }

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
          maxWidth: 440,
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1)',
          overflow: 'hidden',
          transform: isVisible && !isExiting ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
          opacity: isVisible && !isExiting ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--bg-tertiary)' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--orange-600), var(--orange-400))',
            borderRadius: '0 2px 2px 0',
            transition: 'width 0.4s var(--ease-smooth)',
          }} />
        </div>

        {/* Content */}
        <div style={{ padding: '32px 32px 28px' }}>
          {/* Step counter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}>
            <div style={{
              display: 'flex',
              gap: 6,
            }}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === currentStep ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: i === currentStep
                      ? 'linear-gradient(135deg, var(--orange-600), var(--orange-400))'
                      : i < currentStep ? 'var(--orange-300)' : 'var(--bg-tertiary)',
                    transition: 'all 0.3s var(--ease-smooth)',
                  }}
                />
              ))}
            </div>
            <button
              onClick={handleComplete}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-tertiary)'}
            >
              Skip tour
            </button>
          </div>

          {/* Icon */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(232, 133, 61, 0.12), rgba(232, 133, 61, 0.06))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            color: 'var(--orange-600)',
          }}>
            {step.icon}
          </div>

          {/* Text */}
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 8,
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}>
            {step.title}
          </h2>
          <p style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            marginBottom: 28,
          }}>
            {step.description}
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
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
                e.target.style.boxShadow = 'var(--shadow-lg), var(--shadow-glow-orange)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'var(--shadow-md)'
              }}
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
