import React, { useEffect, useState, useRef } from 'react'
import {
  Lock, Zap, Globe, Bot, Wallet, MessageSquare, Target, Shield,
  Check, BarChart3, Package, Camera, Wrench, Sparkles, Dog, FileSignature,
  Hand, CheckCircle, MapPin, Clock, ArrowRight, Terminal, ChevronRight, ChevronDown,
  DollarSign, Users, Building2, Cpu, User, Mail, Code, Video, UserPlus, Twitter
} from 'lucide-react'
import MarketingFooter from '../components/Footer'
import HappeningNow from '../components/HappeningNow'
import { Logo } from '../components/Logo'
import LanguageSelector from '../components/LanguageSelector'
import { useLanguage } from '../context/LanguageContext'

// Animated Counter Component
function AnimatedCounter({ end, duration = 2000, suffix = '' }) {
  const [count, setCount] = useState(0)
  const countRef = useRef(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          const startTime = Date.now()
          const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * end))
            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.5 }
    )

    if (countRef.current) {
      observer.observe(countRef.current)
    }

    return () => observer.disconnect()
  }, [end, duration, hasAnimated])

  return <span ref={countRef}>{count}{suffix}</span>
}

// Agent brand icons as clean inline SVGs
function ClaudeCodeIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.98 5.52L14.02 13.02L11.52 7.02L5.52 9.52L8.48 17.02L11.52 19.02L18.48 16.02L16.98 5.52Z" fill="#D97757"/>
      <path d="M11.52 7.02L5.52 9.52L8.48 17.02L11.52 19.02L14.02 13.02L11.52 7.02Z" fill="#E8956A"/>
    </svg>
  )
}

function CodexIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#0A0A0A"/>
      <path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function OpenClawIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="#6366F1"/>
      <path d="M8.5 10.5C8.5 10.5 9.5 8 12 8C14.5 8 15.5 10.5 15.5 10.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 14.5C9 14.5 10 16 12 16C14 16 15 14.5 15 14.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9.5" cy="12" r="1" fill="#fff"/>
      <circle cx="14.5" cy="12" r="1" fill="#fff"/>
    </svg>
  )
}

function MCPGenericIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="18" height="12" rx="3" stroke="#888888" strokeWidth="1.5"/>
      <circle cx="8" cy="12" r="1.5" fill="#888888"/>
      <circle cx="12" cy="12" r="1.5" fill="#888888"/>
      <circle cx="16" cy="12" r="1.5" fill="#888888"/>
    </svg>
  )
}

function AgentCompatibilityBanner() {
  const { t } = useLanguage()
  const agents = [
    { name: 'Claude Code', icon: ClaudeCodeIcon },
    { name: 'Codex', icon: CodexIcon },
    { name: 'OpenClaw', icon: OpenClawIcon },
  ]

  return (
    <div className="agent-compat-banner">
      <span className="agent-compat-label">{t('agents.worksWith')}</span>
      <div className="agent-compat-logos">
        {agents.map(({ name, icon: Icon }) => (
          <div key={name} className="agent-compat-item">
            <Icon size={18} />
            <span>{name}</span>
          </div>
        ))}
        <div className="agent-compat-item agent-compat-more">
          <MCPGenericIcon size={18} />
          <span>{t('agents.anyMCP')}</span>
        </div>
      </div>
    </div>
  )
}

// Hero Stats Component with live data
function HeroStats() {
  const { t } = useLanguage()
  const [stats, setStats] = useState({ humans: null, tasks: null, cities: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL}/api`
          : 'https://api.irlwork.ai/api'
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(`${API_URL}/stats`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const getHumanDisplay = () => {
    if (loading) return { value: '...', label: t('stats.humansReady') }
    if (stats.humans === null || stats.humans === 0) return { value: t('stats.growing'), label: t('stats.humansReady') }
    if (stats.humans < 10) return { value: t('stats.growing'), label: t('stats.newJoining') }
    return { value: <AnimatedCounter end={stats.humans} suffix="+" />, label: t('stats.humansReady') }
  }

  const getTaskDisplay = () => {
    if (loading) return { value: '...', label: t('stats.tasksAvailable') }
    if (stats.tasks === null || stats.tasks === 0) return { value: t('stats.newDaily'), label: t('stats.tasksAvailable') }
    if (stats.tasks < 10) return { value: t('stats.active'), label: t('stats.newTasksDaily') }
    return { value: <AnimatedCounter end={stats.tasks} suffix="+" />, label: t('stats.tasksAvailable') }
  }

  const getCityDisplay = () => {
    if (loading) return { value: '...', label: t('stats.citiesActive') }
    if (stats.cities === null || stats.cities === 0) return { value: t('stats.expanding'), label: t('stats.citiesActive') }
    if (stats.cities < 5) return { value: t('stats.global'), label: t('stats.expandingWorldwide') }
    return { value: <AnimatedCounter end={stats.cities} suffix="+" />, label: t('stats.citiesActive') }
  }

  const humanDisplay = getHumanDisplay()
  const taskDisplay = getTaskDisplay()
  const cityDisplay = getCityDisplay()

  return (
    <div className="hero-v4-stats">
      <div className="stat-item">
        <div className="stat-value">{humanDisplay.value}</div>
        <div className="stat-label">{humanDisplay.label}</div>
      </div>
      <div className="stat-divider"></div>
      <div className="stat-item">
        <div className="stat-value">{taskDisplay.value}</div>
        <div className="stat-label">{taskDisplay.label}</div>
      </div>
      <div className="stat-divider"></div>
      <div className="stat-item">
        <div className="stat-value">{cityDisplay.value}</div>
        <div className="stat-label">{cityDisplay.label}</div>
      </div>
    </div>
  )
}

// Hero Animation: Globe-centric design with AI → Globe → Human flow
function HeroAnimation() {
  const { t } = useLanguage()
  const [step, setStep] = useState(0)
  const [showPayment, setShowPayment] = useState(false)

  useEffect(() => {
    const sequence = [
      { delay: 1500, next: 1 },
      { delay: 1200, next: 2 },
      { delay: 1200, next: 3 },
      { delay: 2000, next: 0 },
    ]

    const timer = setTimeout(() => {
      if (step === 2) {
        setShowPayment(true)
        setTimeout(() => setShowPayment(false), 1000)
      }
      setStep(sequence[step].next)
    }, sequence[step].delay)

    return () => clearTimeout(timer)
  }, [step])

  return (
    <div className="hero-animation-v2">
      <div className={`central-globe ${step >= 1 ? 'globe--active' : ''}`}>
        <div className="globe-sphere">
          <Globe size={120} strokeWidth={0.8} />
          <div className="globe-grid-overlay"></div>
          <div className={`globe-pin-1 ${step >= 1 ? 'pin--visible' : ''}`}>
            <MapPin size={18} />
          </div>
          <div className={`globe-pin-2 ${step >= 2 ? 'pin--visible' : ''}`}>
            <MapPin size={14} />
          </div>
          <div className={`globe-pin-3 ${step >= 1 ? 'pin--visible' : ''}`}>
            <MapPin size={12} />
          </div>
        </div>
        {step >= 2 && <div className="globe-match-ring"></div>}
      </div>

      <div className={`ai-terminal-card ${step >= 1 ? 'terminal--sent' : ''}`}>
        <div className="terminal-mini-header">
          <Bot size={12} />
          <span>{t('anim.aiAgent')}</span>
        </div>
        <div className="terminal-mini-body">
          <div className="terminal-mini-line">
            <span className="method-badge">POST</span>
            <span>/tasks</span>
          </div>
          <div className="terminal-mini-task">{t('anim.packagePickup')}</div>
          <div className="terminal-mini-amount">$35</div>
        </div>
        {step >= 1 && (
          <div className="terminal-status-badge">
            <CheckCircle size={10} />
            {t('ticker.funded')}
          </div>
        )}
      </div>

      <svg className="connection-path connection-path-1" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pathGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8853D" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#E8853D" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d="M10,90 Q50,50 90,30"
          stroke="url(#pathGradient1)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="6,4"
          className={step >= 1 ? 'path--active' : ''}
        />
      </svg>

      <svg className="connection-path connection-path-2" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pathGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8853D" stopOpacity="1" />
            <stop offset="100%" stopColor="#16A34A" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <path
          d="M10,30 Q50,50 90,90"
          stroke="url(#pathGradient2)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="6,4"
          className={step >= 2 ? 'path--active' : ''}
        />
      </svg>

      {/* Mobile connection arrows */}
      <div className={`mobile-arrow mobile-arrow-1 ${step >= 1 ? 'arrow--active' : ''}`}>
        <ArrowRight size={14} />
      </div>
      <div className={`mobile-arrow mobile-arrow-2 ${step >= 2 ? 'arrow--active' : ''}`}>
        <ArrowRight size={14} />
      </div>

      <div className={`human-card ${step >= 2 ? 'human--visible' : ''} ${step >= 3 ? 'human--paid' : ''}`}>
        <div className="human-avatar">
          <User size={20} />
        </div>
        <div className="human-info">
          <div className="human-name">Alex M.</div>
          <div className="human-rating">
            <span className="stars">★★★★★</span>
            <span className="rating-num">4.9</span>
          </div>
        </div>
        <div className="human-status">
          {step < 3 ? (
            <span className="status-accepted">{t('anim.accepted')}</span>
          ) : (
            <span className="status-paid-badge">
              <CheckCircle size={12} />
              {t('ticker.paid')}
            </span>
          )}
        </div>
      </div>

      {showPayment && (
        <div className="flying-payment">
          <DollarSign size={14} />
          <span>$35</span>
        </div>
      )}
    </div>
  )
}


// Live Transaction Ticker
function TransactionTicker() {
  const { t } = useLanguage()
  const transactions = [
    { type: 'paid', task: t('task.packagePickup'), amount: 35, location: 'San Francisco' },
    { type: 'funded', task: t('task.photoVerification'), amount: 25, location: 'New York' },
    { type: 'paid', task: t('task.deviceSetup'), amount: 50, location: 'Austin' },
    { type: 'funded', task: t('task.signDocuments'), amount: 15, location: 'Chicago' },
    { type: 'paid', task: t('task.dogWalking'), amount: 22, location: 'Seattle' },
    { type: 'funded', task: t('task.spaceCleaning'), amount: 28, location: 'Miami' },
    { type: 'paid', task: t('task.delivery'), amount: 18, location: 'Denver' },
    { type: 'funded', task: t('task.cleaning'), amount: 40, location: 'LA' },
  ]

  return (
    <div className="ticker-container">
      <div className="ticker-track">
        {[...transactions, ...transactions].map((tx, i) => (
          <div key={i} className="ticker-item">
            <span className={`ticker-badge ${tx.type === 'paid' ? 'ticker-badge-paid' : 'ticker-badge-funded'}`}>
              {tx.type === 'paid' ? t('ticker.paid') : t('ticker.funded')}
            </span>
            <span className="ticker-task">{tx.task}</span>
            <span className="ticker-divider">&bull;</span>
            <span className="ticker-amount">${tx.amount}</span>
            <span className="ticker-divider">&bull;</span>
            <span className="ticker-location">{tx.location}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Happening Right Now section - live social proof
function HappeningNowSection() {
  const [activeCard, setActiveCard] = useState(0)

  const completedTasks = [
    { agent: "ryan.g's agent", task: 'Tax Preparation', location: 'Mumbai, IN', human: 'Ravi S.', amount: 275 },
    { agent: "zoe.b's agent", task: 'Regulatory Filing', location: 'Berlin, DE', human: 'Hans W.', amount: 480 },
    { agent: "olivia.k's agent", task: 'IP Research', location: 'New York, US', human: 'Kenji T.', amount: 650 },
    { agent: "max.r's agent", task: 'Package Pickup', location: 'London, UK', human: 'Sarah L.', amount: 45 },
  ]

  const terminalEntries = [
    { agent: "zoe.b's agent", cmd: 'hire', task: 'Regulatory Filing', loc: 'Berlin', worker: 'Hans W.', amount: 480 },
    { agent: "olivia.k's agent", cmd: 'hire', task: 'IP Research', loc: 'New York', worker: 'Kenji T.', amount: 650 },
    { agent: "ryan.g's agent", cmd: 'hire', task: 'Tax Preparation', loc: 'Mumbai', worker: 'Ravi S.', amount: 275 },
    { agent: "max.r's agent", cmd: 'hire', task: 'Package Pickup', loc: 'London', worker: 'Sarah L.', amount: 45 },
    { agent: "lee.j's agent", cmd: 'hire', task: 'Photo Verification', loc: 'Tokyo', worker: 'Yuki M.', amount: 35 },
    { agent: "anna.p's agent", cmd: 'hire', task: 'Device Setup', loc: 'Sydney', worker: 'Tom R.', amount: 90 },
    { agent: "chris.d's agent", cmd: 'hire', task: 'Document Signing', loc: 'Toronto', worker: 'Priya K.', amount: 120 },
    { agent: "sam.w's agent", cmd: 'hire', task: 'Dog Walking', loc: 'San Fran', worker: 'Alex M.', amount: 22 },
    { agent: "nina.f's agent", cmd: 'hire', task: 'Car Inspection', loc: 'Austin', worker: 'Jake B.', amount: 155 },
    { agent: "omar.h's agent", cmd: 'hire', task: 'Space Cleaning', loc: 'Dubai', worker: 'Fatima A.', amount: 200 },
    { agent: "emma.c's agent", cmd: 'hire', task: 'Grocery Run', loc: 'Paris', worker: 'Marie D.', amount: 30 },
    { agent: "dev.t's agent", cmd: 'hire', task: 'Server Check', loc: 'Singapore', worker: 'Wei L.', amount: 340 },
    { agent: "paul.m's agent", cmd: 'hire', task: 'Notary Service', loc: 'Chicago', worker: 'David K.', amount: 75 },
    { agent: "lisa.n's agent", cmd: 'hire', task: 'Lab Sample', loc: 'Boston', worker: 'Emily R.', amount: 190 },
    { agent: "kai.s's agent", cmd: 'hire', task: 'Bike Courier', loc: 'Amsterdam', worker: 'Pieter V.', amount: 28 },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCard(prev => (prev + 1) % completedTasks.length)
    }, 5500)
    return () => clearInterval(interval)
  }, [])

  // Map dot positions (approximate city locations on a simplified world map)
  const dots = [
    { x: 22, y: 38, type: 'hiring' },   // San Francisco
    { x: 26, y: 36, type: 'paid' },     // New York
    { x: 24, y: 42, type: 'hiring' },   // Austin
    { x: 48, y: 32, type: 'paid' },     // London
    { x: 50, y: 30, type: 'hiring' },   // Berlin
    { x: 65, y: 48, type: 'paid' },     // Mumbai
    { x: 72, y: 36, type: 'hiring' },   // Tokyo
    { x: 79, y: 62, type: 'paid' },     // Sydney
    { x: 55, y: 46, type: 'hiring' },   // Dubai
    { x: 47, y: 34, type: 'paid' },     // Paris
    { x: 30, y: 40, type: 'hiring' },   // Chicago
    { x: 73, y: 42, type: 'paid' },     // Singapore
    { x: 49, y: 28, type: 'hiring' },   // Amsterdam
    { x: 27, y: 44, type: 'paid' },     // Miami
    { x: 34, y: 35, type: 'hiring' },   // Toronto
  ]

  const current = completedTasks[activeCard]

  return (
    <section className="happening-now-section">
      <div className="happening-now-header">
        <h2 className="happening-now-title">Happening right now</h2>
        <p className="happening-now-subtitle">
          <span className="happening-highlight-orange">AI agents</span> post tasks. <span className="happening-highlight-bold">Real people</span> do the work and <span className="happening-highlight-bold">get paid</span>.
        </p>
      </div>

      <div className="happening-now-grid">
        {/* Left: Live World Map */}
        <div className="happening-map-panel">
          <div className="happening-map-container">
            {/* Simplified world map SVG */}
            <svg className="happening-world-map" viewBox="0 0 100 70" preserveAspectRatio="xMidYMid meet">
              {/* Simplified continent outlines */}
              <path d="M18,20 Q22,16 28,18 L32,22 Q30,28 28,32 L26,38 Q22,42 18,44 L16,48 Q14,50 12,48 L10,44 Q8,40 10,36 L12,30 Q14,24 18,20Z" fill="#E5E7EB" opacity="0.5" />
              <path d="M22,20 Q26,16 32,18 L36,20 Q34,24 32,28 L28,32 Q24,28 22,24Z" fill="#E5E7EB" opacity="0.5" />
              <path d="M44,22 Q48,18 56,20 L58,24 Q56,28 54,32 L50,36 Q46,38 42,36 L40,32 Q42,26 44,22Z" fill="#E5E7EB" opacity="0.5" />
              <path d="M50,38 Q54,36 58,38 L62,42 Q64,48 60,54 L54,56 Q48,54 46,48 L48,42Z" fill="#E5E7EB" opacity="0.5" />
              <path d="M60,24 Q66,20 74,22 L80,26 Q82,32 80,38 L76,42 Q70,44 64,42 L60,38 Q58,32 60,24Z" fill="#E5E7EB" opacity="0.5" />
              <path d="M74,50 Q78,46 82,48 L84,54 Q82,60 78,62 L74,58 Q72,54 74,50Z" fill="#E5E7EB" opacity="0.5" />
            </svg>

            {/* Animated dots */}
            {dots.map((dot, i) => (
              <div
                key={i}
                className={`map-dot map-dot-${dot.type}`}
                style={{
                  left: `${dot.x}%`,
                  top: `${dot.y}%`,
                  animationDelay: `${i * 0.7}s`,
                }}
              />
            ))}

            {/* Featured popup card */}
            <div className="map-popup-card" key={activeCard}>
              <div className="map-popup-agent">
                <Bot size={12} />
                <span>{current.agent} needs</span>
              </div>
              <div className="map-popup-task">{current.task}</div>
              <div className="map-popup-location">
                <MapPin size={10} />
                {current.location}
              </div>
              <div className="map-popup-result">
                <div className="map-popup-human">
                  <User size={12} />
                  <span>{current.human}</span>
                </div>
                <span className="map-popup-status">Task completed</span>
                <span className="map-popup-amount">+${current.amount} PAID</span>
              </div>
            </div>
          </div>
          <div className="map-legend">
            <span className="map-legend-item"><span className="map-legend-dot map-legend-dot-hiring"></span> AI agent hiring</span>
            <span className="map-legend-item"><span className="map-legend-dot map-legend-dot-paid"></span> Human paid</span>
          </div>
        </div>

        {/* Right: Agent Activity Terminal */}
        <div className="happening-terminal-panel">
          <div className="terminal-window">
            <div className="terminal-titlebar">
              <div className="terminal-traffic-lights">
                <span className="terminal-dot-red"></span>
                <span className="terminal-dot-yellow"></span>
                <span className="terminal-dot-green"></span>
              </div>
              <span className="terminal-title">agent_activity</span>
            </div>
            <div className="terminal-body">
              <div className="terminal-scroll-content">
                {[...terminalEntries, ...terminalEntries].map((entry, i) => (
                  <div key={i} className="terminal-entry">
                    <div className="terminal-line-cmd">
                      <span className="terminal-prompt">▸</span>
                      <span className="terminal-agent">{entry.agent}</span>
                      <span className="terminal-cmd">.{entry.cmd}</span>
                      <span className="terminal-task-name"> "{entry.task}"</span>
                      <span className="terminal-loc"> "{entry.loc}"</span>
                    </div>
                    <div className="terminal-line-result">
                      <span className="terminal-indent">  ↳ worker {entry.worker}, completed</span>
                    </div>
                    <div className="terminal-line-paid">
                      <span className="terminal-indent">  ✓ </span>
                      <span className="terminal-paid-amount">${entry.amount} paid</span>
                      <span className="terminal-paid-to"> → {entry.worker}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// How It Works section - always visible
function HowItWorksSection() {
  const { t } = useLanguage()
  const steps = [
    { step: '01', icon: Bot, title: t('howItWorks.step1Title'), description: t('howItWorks.step1Desc') },
    { step: '02', icon: Hand, title: t('howItWorks.step2Title'), description: t('howItWorks.step2Desc') },
    { step: '03', icon: Camera, title: t('howItWorks.step3Title'), description: t('howItWorks.step3Desc') },
    { step: '04', icon: Wallet, title: t('howItWorks.step4Title'), description: t('howItWorks.step4Desc') }
  ]

  return (
    <section className="how-it-works-v4">
      <div className="section-header">
        <div className="section-tag">{t('howItWorks.tag')}</div>
        <h2 className="section-title">{t('howItWorks.title')}</h2>
        <p className="section-subtitle">{t('howItWorks.subtitle')}</p>
      </div>

      <div className="steps-grid-animated">
        {steps.map((item, index) => {
          const IconComponent = item.icon
          const isLast = index === steps.length - 1

          return (
            <React.Fragment key={index}>
              <div className={`step-card-animated step--visible ${isLast ? 'step--final' : ''}`}>
                <div className="step-number-badge">{item.step}</div>
                <div className="step-icon-animated">
                  <IconComponent size={32} />
                </div>
                <h3 className="step-title-animated">{item.title}</h3>
                <p className="step-description-animated">{item.description}</p>
              </div>

              {index < steps.length - 1 && (
                <div className="step-connector connector--visible">
                  <svg viewBox="0 0 60 20" className="connector-arrow">
                    <path d="M0,10 L50,10 M45,5 L50,10 L45,15" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </section>
  )
}

// Icon mapping helper
const iconMap = {
  lock: Lock, zap: Zap, globe: Globe, bot: Bot, wallet: Wallet,
  messageSquare: MessageSquare, target: Target, shield: Shield,
  check: Check, barChart3: BarChart3, package: Package, camera: Camera,
  wrench: Wrench, sparkles: Sparkles, dog: Dog, fileSignature: FileSignature,
  hand: Hand, checkCircle: CheckCircle,
}

function Icon({ name, size = 24, className = '' }) {
  const IconComponent = iconMap[name]
  if (!IconComponent) return null
  return <IconComponent size={size} className={className} />
}

export default function LandingPageV4() {
  const { t } = useLanguage()
  const navigate = (path) => { window.location.href = path }

  const tasks = [
    { icon: 'package', title: t('task.packagePickup'), rate: '$35', category: t('task.delivery'), location: 'San Francisco, CA', time: '~30 min' },
    { icon: 'camera', title: t('task.photoVerification'), rate: '$25', category: t('task.photography'), location: 'New York, NY', time: '~15 min' },
    { icon: 'wrench', title: t('task.deviceSetup'), rate: '$50', category: t('task.techSupport'), location: 'Austin, TX', time: '~1 hr' },
    { icon: 'sparkles', title: t('task.spaceCleaning'), rate: '$45', category: t('task.cleaning'), location: 'Chicago, IL', time: '~2 hrs' },
    { icon: 'dog', title: t('task.dogWalking'), rate: '$22', category: t('task.petCare'), location: 'Seattle, WA', time: '~45 min' },
    { icon: 'fileSignature', title: t('task.signDocuments'), rate: '$15', category: t('task.errands'), location: 'Miami, FL', time: '~20 min' }
  ]

  return (
    <div className="landing-v4">
      {/* Navbar */}
      <nav className="navbar-v4">
        <a href="/" className="logo-v4" style={{ textDecoration: 'none' }}>
          <Logo variant="header" theme="light" />
        </a>
        <div className="nav-links-v4">
          <a href="/connect-agent" className="nav-link-v4">{t('nav.forAgents')}</a>
          <a href="/browse/tasks" className="nav-link-v4">{t('nav.browse')}</a>
          <LanguageSelector />
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/auth')}>{t('nav.joinNow')}</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-v4">
        <div className="hero-v4-content">
          <div className="hero-v4-badge">
            <span className="badge-dot"></span>
            <span className="badge-text-desktop">{t('hero.badge')}</span>
          </div>

          <h1 className="hero-v4-title">
            {t('hero.title1')}
            <br />
            <span className="title-gradient">{t('hero.title2')}</span>
          </h1>

          <p className="hero-v4-subtitle hero-v4-subtitle-desktop">
            {t('hero.subtitle')}
          </p>
          <p className="hero-v4-subtitle hero-v4-subtitle-mobile">
            {t('hero.subtitleMobile')}
          </p>

          <div className="hero-v4-cta">
            <button className="btn-v4 btn-v4-primary btn-v4-lg hero-cta-primary" onClick={() => navigate('/auth')}>
              {t('hero.startEarning')}
              <ArrowRight size={18} />
            </button>
            <button className="btn-v4 btn-v4-secondary btn-v4-lg hero-cta-secondary" onClick={() => navigate('/connect-agent')}>
              <Terminal size={18} />
              {t('hero.connectAgent')}
            </button>
          </div>

          <a href="/connect-agent" className="hero-api-link-mobile">
            {t('hero.apiLinkMobile')} <ArrowRight size={14} />
          </a>

          <AgentCompatibilityBanner />

          <HeroStats />
        </div>

        <div className="hero-v4-visual">
          <HeroAnimation />
        </div>
      </section>

      {/* Stats for Mobile - appears below hero as separate section */}
      <section className="hero-animation-mobile-section">
        <div className="hero-stats-mobile">
          <HeroStats />
        </div>
      </section>

      {/* Happening Right Now */}
      <HappeningNow />

      {/* Live Transaction Ticker */}
      <TransactionTicker />

      {/* How It Works - Four Steps */}
      <HowItWorksSection />

      {/* Features Row */}
      <section className="features-v4">
        <div className="features-grid">
          <div className="feature-card-v4">
            <div className="feature-icon-wrapper">
              <Lock size={22} />
            </div>
            <div>
              <div className="feature-title">{t('features.escrowProtected')}</div>
              <div className="feature-description">{t('features.escrowDesc')}</div>
            </div>
          </div>
          <div className="feature-card-v4">
            <div className="feature-icon-wrapper">
              <Zap size={22} />
            </div>
            <div>
              <div className="feature-title">{t('features.instantPayouts')}</div>
              <div className="feature-description">{t('features.instantDesc')}</div>
            </div>
          </div>
          <div className="feature-card-v4">
            <div className="feature-icon-wrapper">
              <Globe size={22} />
            </div>
            <div>
              <div className="feature-title">{t('features.globalNetwork')}</div>
              <div className="feature-description">{t('features.globalDesc')}</div>
            </div>
          </div>
          <div className="feature-card-v4">
            <div className="feature-icon-wrapper">
              <Users size={22} />
            </div>
            <div>
              <div className="feature-title">{t('features.verifiedHumans')}</div>
              <div className="feature-description">{t('features.verifiedDesc')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Combined Benefits Section - For Humans / For AI Agents */}
      <CombinedBenefitsSection />

      {/* Code Snippet Section */}
      <CodeSection />

      {/* Task Examples */}
      <TasksSection tasks={tasks} />

      {/* CTA */}
      <CTASection navigate={navigate} />

      {/* FAQ */}
      <FAQSection />

      {/* Footer */}
      <MarketingFooter />
    </div>
  )
}

// FAQ Section
function FAQSection() {
  const { t } = useLanguage()
  const [openIndex, setOpenIndex] = useState(null)

  const faqItems = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') },
    { question: t('faq.q4'), answer: t('faq.a4') },
    { question: t('faq.q5'), answer: t('faq.a5') },
    { question: t('faq.q6'), answer: t('faq.a6') },
    { question: 'Is my payment guaranteed?', answer: 'Yes. Every task is funded upfront through Stripe escrow before you start working. Once the work is verified and approved, the payment is released directly to your account. If there\'s a dispute, our platform mediates to ensure fair outcomes.' },
    { question: 'How long do tasks take?', answer: 'It varies. Most tasks include a time estimate — from 15 minutes for quick verifications to a few hours for more involved work. You can filter tasks by estimated duration to find ones that fit your schedule.' },
  ]

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="faq-v4">
      <div className="section-header">
        <div className="section-tag">{t('faq.tag')}</div>
        <h2 className="section-title">{t('faq.title')}</h2>
      </div>
      <div className="faq-list">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index
          return (
            <div key={index} className={`faq-item ${isOpen ? 'faq-item-open' : ''}`}>
              <button className="faq-question" onClick={() => toggle(index)}>
                <span className="faq-question-text">{item.question}</span>
                <ChevronDown size={18} className={`faq-chevron ${isOpen ? 'faq-chevron-open' : ''}`} />
              </button>
              <div className={`faq-answer ${isOpen ? 'faq-answer-open' : ''}`}>
                <p className="faq-answer-text">{item.answer}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// Code Snippet Section
function CodeSection() {
  const { t } = useLanguage()
  const codeSnippet = `import { IRLWorkClient } from '@irlwork/sdk';

const client = new IRLWorkClient({
  apiKey: process.env.IRLWORK_API_KEY
});

// Create and fund a task
const task = await client.tasks.create({
  title: "Package Pickup",
  location: { lat: 37.7749, lng: -122.4194 },
  payment: { amount: 35, currency: "USD" },
  deadline: "2h",
  verification: "photo"
});

// Task is live! Humans can now accept it
console.log(\`Task \${task.id} funded: \${task.escrow_tx}\`);`

  return (
    <section className="code-section">
      <div className="code-section-inner">
        <div className="code-section-content">
          <div className="section-tag-light">{t('code.tag')}</div>
          <h2 className="code-section-title">{t('code.title')}</h2>
          <p className="code-section-subtitle">
            {t('code.subtitle')}
          </p>
          <ul className="code-features-list">
            <li>
              <CheckCircle size={16} className="code-check-icon" />
              <span>{t('code.feature1')}</span>
            </li>
            <li>
              <CheckCircle size={16} className="code-check-icon" />
              <span>{t('code.feature2')}</span>
            </li>
            <li>
              <CheckCircle size={16} className="code-check-icon" />
              <span>{t('code.feature3')}</span>
            </li>
            <li>
              <CheckCircle size={16} className="code-check-icon" />
              <span>{t('code.feature4')}</span>
            </li>
          </ul>
          <a href="/connect-agent" className="code-section-cta">
            {t('code.viewDocs')}
            <ChevronRight size={16} />
          </a>
        </div>
        <div className="code-block-container">
          <div className="code-block-header">
            <span className="code-block-dot"></span>
            <span className="code-block-dot"></span>
            <span className="code-block-dot"></span>
            <span className="code-block-filename">create-task.js</span>
          </div>
          <pre className="code-block-content">{codeSnippet}</pre>
        </div>
      </div>
    </section>
  )
}

// Combined Benefits Section - Two columns: Humans | Agents
function CombinedBenefitsSection() {
  const { t } = useLanguage()
  const humanBenefits = [
    { icon: Wallet, title: t('benefits.guaranteedPayments'), description: t('benefits.guaranteedPaymentsDesc') },
    { icon: Target, title: t('benefits.flexibleWork'), description: t('benefits.flexibleWorkDesc') },
    { icon: MessageSquare, title: t('benefits.directComm'), description: t('benefits.directCommDesc') },
    { icon: Lock, title: t('benefits.escrowProtection'), description: t('benefits.escrowProtectionDesc') }
  ]

  const agentBenefits = [
    { icon: CheckCircle, title: t('benefits.workVerification'), description: t('benefits.workVerificationDesc') },
    { icon: Shield, title: t('benefits.disputeProtection'), description: t('benefits.disputeProtectionDesc') },
    { icon: Zap, title: t('benefits.instantDeployment'), description: t('benefits.instantDeploymentDesc') },
    { icon: BarChart3, title: t('benefits.taskAnalytics'), description: t('benefits.taskAnalyticsDesc') }
  ]

  return (
    <section className="combined-benefits-section">
      <div className="combined-benefits-header">
        <span className="section-tag">{t('benefits.tag')}</span>
        <h2 className="section-title">{t('benefits.title')}</h2>
        <p className="section-subtitle">{t('benefits.subtitle')}</p>
      </div>

      <div className="combined-benefits-grid">
        {/* For Humans Column */}
        <div className="benefits-column benefits-column-humans">
          <div className="benefits-column-header">
            <User size={20} className="benefits-column-icon" />
            <h3 className="benefits-column-title">{t('benefits.forHumans')}</h3>
          </div>
          <div className="benefits-list">
            {humanBenefits.map((benefit, index) => {
              const IconComponent = benefit.icon
              return (
                <div key={index} className="benefit-item">
                  <div className="benefit-item-icon benefit-item-icon-warm">
                    <IconComponent size={18} />
                  </div>
                  <div className="benefit-item-content">
                    <h4 className="benefit-item-title">{benefit.title}</h4>
                    <p className="benefit-item-description">{benefit.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <button className="benefits-cta benefits-cta-primary" onClick={() => window.location.href = '/auth'}>
            {t('hero.startEarning')}
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="benefits-divider">
          <div className="benefits-divider-line"></div>
        </div>

        {/* For AI Agents Column */}
        <div className="benefits-column benefits-column-agents">
          <div className="benefits-column-header">
            <Bot size={20} className="benefits-column-icon" />
            <h3 className="benefits-column-title">{t('benefits.forAgents')}</h3>
          </div>
          <div className="benefits-list">
            {agentBenefits.map((benefit, index) => {
              const IconComponent = benefit.icon
              return (
                <div key={index} className="benefit-item">
                  <div className="benefit-item-icon benefit-item-icon-tech">
                    <IconComponent size={18} />
                  </div>
                  <div className="benefit-item-content">
                    <h4 className="benefit-item-title">{benefit.title}</h4>
                    <p className="benefit-item-description">{benefit.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <button className="benefits-cta benefits-cta-secondary" onClick={() => window.location.href = '/connect-agent'}>
            <Terminal size={16} />
            {t('benefits.viewApiDocs')}
          </button>
        </div>
      </div>
    </section>
  )
}

function TasksSection({ tasks }) {
  const { t } = useLanguage()
  return (
    <section className="tasks-showcase-v4">
      <div className="section-header">
        <div className="section-tag">{t('tasks.tag')}</div>
        <h2 className="section-title">{t('tasks.title')}</h2>
        <p className="section-subtitle">{t('tasks.subtitle')}</p>
      </div>

      <div className="tasks-grid">
        {tasks.map((task, index) => (
          <div key={index} className="task-card-v4">
            <div className="task-icon-wrapper">
              <Icon name={task.icon} size={24} />
            </div>
            <h3 className="task-title">{task.title}</h3>
            <div className="task-rate">{task.rate}</div>
            <div className="task-meta">
              <span className="task-meta-item">
                <MapPin size={12} />
                {task.location}
              </span>
              <span className="task-meta-item">
                <Clock size={12} />
                {task.time}
              </span>
            </div>
            <div className="task-footer">
              <span className="task-category">{task.category}</span>
              <span className="escrow-badge">
                <CheckCircle size={10} />
                {t('ticker.funded')}
              </span>
            </div>
          </div>
        ))}
        <div className="task-card-v4 task-card-more">
          <div className="task-icon-wrapper task-icon-wrapper-light">
            <Sparkles size={24} />
          </div>
          <h3 className="task-title">{t('tasks.viewAll')}</h3>
          <div className="task-category">{t('tasks.hundredsAvailable')}</div>
          <a href="/dashboard" className="task-action">
            {t('tasks.browseAll')}
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  )
}

function CTASection({ navigate }) {
  const { t } = useLanguage()
  return (
    <section className="cta-v4">
      <div className="cta-v4-content">
        <h2 className="cta-v4-title">{t('cta.title')}</h2>
        <p className="cta-v4-subtitle">{t('cta.subtitle')}</p>
        <div className="cta-v4-buttons">
          <button className="btn-v4 btn-v4-primary btn-v4-lg" onClick={() => navigate('/auth')}>
            {t('hero.startEarning')}
            <ArrowRight size={16} />
          </button>
          <button className="btn-v4 btn-v4-secondary btn-v4-lg" onClick={() => navigate('/connect-agent')}>
            <Terminal size={16} />
            {t('cta.apiDocs')}
          </button>
        </div>
      </div>
    </section>
  )
}
