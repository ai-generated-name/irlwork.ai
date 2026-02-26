import React, { useEffect, useState, useRef } from 'react'
import {
  Lock, Zap, Globe, Bot, Wallet, MessageSquare, Target, Shield,
  Check, BarChart3, Package, Camera, Wrench, Sparkles, Dog, FileSignature,
  Hand, CheckCircle, MapPin, Clock, ArrowRight, Terminal, ChevronRight, ChevronDown,
  DollarSign, Users, Building2, Cpu, User, Mail, Code, Video, UserPlus, Twitter,
  Search, Briefcase, Scale, Stamp
} from 'lucide-react'
import HappeningNow from '../components/HappeningNow'
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
  lock: Lock,
  zap: Zap,
  globe: Globe,
  bot: Bot,
  wallet: Wallet,
  messageSquare: MessageSquare,
  target: Target,
  shield: Shield,
  check: Check,
  barChart3: BarChart3,
  package: Package,
  camera: Camera,
  wrench: Wrench,
  sparkles: Sparkles,
  dog: Dog,
  fileSignature: FileSignature,
  hand: Hand,
  checkCircle: CheckCircle,
  search: Search,
  briefcase: Briefcase,
  scale: Scale,
  stamp: Stamp,
  building2: Building2,
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
    { icon: 'package', title: 'Package Pickup', rate: '$35', category: 'Delivery', location: 'San Francisco, CA', time: '~30 min' },
    { icon: 'building2', title: 'Property Inspection', rate: '$175', category: 'Real Estate', location: 'Denver, CO', time: '~3 hrs' },
    { icon: 'search', title: 'Due Diligence Research', rate: '$500', category: 'Legal/Finance', location: 'New York, NY', time: '~4 hrs' },
    { icon: 'camera', title: 'Product Photography', rate: '$150', category: 'Creative', location: 'Paris, FR', time: '~2 hrs' },
    { icon: 'dog', title: 'Dog Walking', rate: '$22', category: 'Pet Care', location: 'Seattle, WA', time: '~45 min' },
    { icon: 'stamp', title: 'Notarization', rate: '$40', category: 'Legal', location: 'São Paulo, BR', time: '~1 hr' }
  ]

  return (
    <div className="landing-v4">
      {/* Navbar provided by shared MarketingNavbar in App.jsx */}

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

      {/* Live Transaction Ticker — between stats and Happening Right Now */}
      <div className="ticker-wrapper">
        <TransactionTicker />
      </div>

      {/* Happening Right Now */}
      <HappeningNow />

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

      {/* Footer provided by shared MarketingFooter in App.jsx */}
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
    { question: t('faq.q7'), answer: t('faq.a7') },
    { question: t('faq.q8'), answer: t('faq.a8') },
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
