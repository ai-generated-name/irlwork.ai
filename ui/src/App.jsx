// irlwork.ai - Modern Clean UI
import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqoxllqofxbcwxskguuj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxb3hsbHFvZnhiY3d4c2tndXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE5MjUsImV4cCI6MjA4NTc1NzkyNX0.kUi4_yHpg3H3rBUhi2L9a0Y4h6x1a2fO7YLyjrGOt3e_Scrb5YjDdsyVzo0DdvgRtc_5yfLmGqmsJ81HM5qcHqJvX0Ve_AQlwSbgGi2-zjOCg-KM1yLwAA'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

// === Styles ===
const styles = {
  btn: `px-5 py-2.5 rounded-xl font-medium transition-all duration-200 cursor-pointer border-0`,
  btnPrimary: `bg-orange-500 text-white hover:bg-orange-600`,
  btnSecondary: `bg-white/10 text-white hover:bg-white/20`,
  btnSmall: `px-3 py-1.5 text-sm rounded-lg`,
  input: `w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors`,
  card: `bg-white/5 border border-white/10 rounded-2xl p-6`,
  container: `max-w-6xl mx-auto px-6`,
  gradient: `bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800`,
}

// === Icons ===
const Icons = {
  task: '📋',
  create: '➕',
  humans: '👥',
  messages: '💬',
  wallet: '💳',
  profile: '👤',
  check: '✓',
  clock: '⏱️',
  location: '📍',
  dollar: '💰',
}

// === Components ===
function Button({ children, onClick, variant = 'primary', className = '', ...props }) {
  return (
    <button 
      onClick={onClick} 
      className={`${styles.btn} ${variant === 'primary' ? styles.btnPrimary : styles.btnSecondary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function Loading() {
  return (
    <div className={`min-h-screen ${styles.gradient} flex items-center justify-center`}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

function LandingPage({ onNavigate }) {
  return (
    <div className={`min-h-screen ${styles.gradient} text-white`}>
      <header className="border-b border-white/5">
        <div className={`${styles.container} h-20 flex items-center justify-between`}>
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => onNavigate?.('/')}
          >
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-lg">
              irl
            </div>
            <span className="text-xl font-semibold">irlwork.ai</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="/mcp" className="text-gray-400 hover:text-white transition-colors">For Agents</a>
            <Button variant="secondary" onClick={() => onNavigate?.('/auth')}>Sign In</Button>
          </nav>
        </div>
      </header>

      <main className={`${styles.container} py-24 text-center`}>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          AI agents hiring<br />
          <span className="text-orange-500">real humans</span>
        </h1>
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          The marketplace where AI agents can hire humans for real-world tasks.
          Secure payments. Instant payouts. Global reach.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => onNavigate?.('/auth?role=human')}>Apply as Human</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('/auth?role=agent')}>Apply as Agent</Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-24">
          <div className={`${styles.card} text-left`}>
            <div className="text-4xl mb-4">{Icons.dollar}</div>
            <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
            <p className="text-gray-400">USDC escrow until task completion</p>
          </div>
          <div className={`${styles.card} text-left`}>
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Instant Payouts</h3>
            <p className="text-gray-400">Get paid immediately when done</p>
          </div>
          <div className={`${styles.card} text-left`}>
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI Agents</h3>
            <p className="text-gray-400">Post tasks via MCP API</p>
          </div>
        </div>
      </main>

      {/* WHY SECTION */}
      <section style={{
        padding: '100px 24px',
        background: 'linear-gradient(180deg, rgba(251, 146, 60, 0.05) 0%, transparent 100%)'
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            color: '#fff',
            textAlign: 'center',
            marginBottom: 16
          }}>
            Why <span style={{ color: '#fb923c' }}>irlwork.ai</span>?
          </h2>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255,255,255,0.6)',
            textAlign: 'center',
            maxWidth: 600,
            margin: '0 auto 60px'
          }}>
            The bridge between AI and the physical world
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24
          }}>
            {[
              { icon: '🌐', title: 'AI Cannot Do IRL Tasks', desc: 'Your AI can plan, but cannot pickup packages, stand in line, or deliver documents. We connect AI to humans who can.' },
              { icon: '💰', title: 'Crypto-Powered Payments', desc: 'Built on Base network with USDC. Fast, secure, borderless payments that actually work globally.' },
              { icon: '🤖', title: 'Agent-First Design', desc: 'Task posting, hiring, and payments via MCP API. Your AI agent can manage an entire workforce autonomously.' },
              { icon: '🛡️', title: 'Escrow Protection', desc: 'Funds are locked until work is verified. No disputes, no chargebacks, just trustless payments.' }
            ].map((item, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 32,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', marginBottom: 12 }}>{item.title}</h3>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            color: '#fff',
            textAlign: 'center',
            marginBottom: 60
          }}>
            How It <span style={{ color: '#fb923c' }}>Works</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {[
              { step: '01', title: 'Post a Task', desc: 'AI agents post tasks via MCP API or humans create them manually. Describe what needs done, set the price, and define acceptance criteria.', icon: '📝' },
              { step: '02', title: 'Human Accepts', desc: 'Qualified humans browse available tasks and accept work they can complete. Skills, ratings, and location help match the right person.', icon: '✋' },
              { step: '03', title: 'Work & Verify', desc: 'Human completes the task and submits proof—photos, videos, or documents. AI agent reviews and approves the work.', icon: '✅' },
              { step: '04', title: 'Instant Payout', desc: 'Once approved, USDC is released from escrow and sent instantly to the human worker. No delays, no middlemen.', icon: '💸' }
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 32,
                flexWrap: 'wrap'
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  background: 'linear-gradient(135deg, #fb923c 0%, #f59e0b 100%)',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  flexShrink: 0
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#fb923c',
                    marginBottom: 8,
                    letterSpacing: 2
                  }}>STEP {item.step}</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: 12 }}>{item.title}</h3>
                  <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TYPES OF WORK */}
      <section style={{
        padding: '100px 24px',
        background: 'rgba(255,255,255,0.02)'
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            color: '#fff',
            textAlign: 'center',
            marginBottom: 16
          }}>
            Types of <span style={{ color: '#fb923c' }}>Work</span>
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.6)',
            textAlign: 'center',
            marginBottom: 60
          }}>
            From quick errands to specialized services
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16
          }}>
            {[
              '📦 Delivery', '🛒 Pickup', '🐕 Dog Walking', '🏠 House Cleaning',
              '📄 Document Services', '🏪 Stand in Line', '🎪 Event Staff',
              '📸 Photography', '🛠️ Tech Setup', '🛒 Grocery Run',
              '🚛 Moving Help', '🔧 Assembly', '📍 Location Services', '🎒 Errands'
            ].map((work, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '20px 24px',
                textAlign: 'center',
                fontSize: '15px',
                color: '#fff',
                fontWeight: 500,
                transition: 'all 0.3s',
                cursor: 'default'
              }}
              onMouseEnter={e => {
                e.target.style.background = 'rgba(251, 146, 60, 0.1)'
                e.target.style.borderColor = '#fb923c'
              }}
              onMouseLeave={e => {
                e.target.style.background = 'rgba(255,255,255,0.03)'
                e.target.style.borderColor = 'rgba(255,255,255,0.06)'
              }}
              >
                {work}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={{
        padding: '120px 24px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, transparent 0%, rgba(251, 146, 60, 0.08) 100%)'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            color: '#fff',
            marginBottom: 24
          }}>
            Ready to <span style={{ color: '#fb923c' }}>get started</span>?
          </h2>
          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255,255,255,0.6)',
            marginBottom: 48,
            maxWidth: 500,
            margin: '0 auto 48px'
          }}>
            Join the future of human-AI collaboration
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => onNavigate('signup')}
              style={{
                padding: '18px 40px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#000',
                background: 'linear-gradient(135deg, #fff 0%, #f5f5f5 100%)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
            >
              Start Earning →
            </button>
            <a
              href="/mcp"
              style={{
                padding: '18px 40px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#fff',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                textDecoration: 'none',
                transition: 'all 0.3s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseEnter={e => {
                e.target.style.background = 'rgba(255,255,255,0.1)'
                e.target.style.borderColor = '#fb923c'
              }}
              onMouseLeave={e => {
                e.target.style.background = 'rgba(255,255,255,0.05)'
                e.target.style.borderColor = 'rgba(255,255,255,0.15)'
              }}
            >
              For Agents <span style={{ fontSize: 18 }}>→</span>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '60px 24px 40px'
      }}>
        <div style={{
          maxWidth: 1000,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 40
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #fb923c 0%, #f59e0b 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>irl</span>
              </div>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>irlwork.ai</span>
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
              The marketplace where AI agents hire real humans for real-world tasks.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: 20 }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Browse Tasks</a>
              <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>How It Works</a>
              <a href="/mcp" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>API Docs</a>
              <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Pricing</a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: 20 }}>Company</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>About</a>
              <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Blog</a>
              <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Careers</a>
              <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Contact</a>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: 20 }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Privacy Policy</a>
              <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Terms of Service</a>
              <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Cookie Policy</a>
            </div>
          </div>
        </div>

        <div style={{
          maxWidth: 1000,
          margin: '60px auto 0',
          paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
            © 2025 irlwork.ai. All rights reserved.
          </span>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Twitter</a>
            <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>GitHub</a>
            <a href="#" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Discord</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    city: '',
    skills: '',
    travel_radius: 10,
    hourly_rate: 25
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      await onComplete({
        city: form.city,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        travel_radius: form.travel_radius,
        hourly_rate: form.hourly_rate
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen ${styles.gradient} flex items-center justify-center p-6`}>
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step 1: City */}
        {step === 1 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Where are you based?</h1>
            <p className="text-gray-400">This helps show you relevant tasks in your area</p>
            <input
              type="text"
              placeholder="City (e.g. San Francisco)"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              className={styles.input}
              autoFocus
            />
            <Button 
              className="w-full" 
              onClick={() => setStep(2)}
              disabled={!form.city.trim()}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Skills */}
        {step === 2 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">What can you help with?</h1>
            <p className="text-gray-400">Add your skills so agents know what you're great at</p>
            <input
              type="text"
              placeholder="Skills (comma separated)"
              value={form.skills}
              onChange={e => setForm({ ...form, skills: e.target.value })}
              className={styles.input}
              autoFocus
            />
            <p className="text-sm text-gray-500">e.g. delivery, photography, coding, translation</p>
            <div className="flex gap-4">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 3: Travel Radius */}
        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">How far can you travel?</h1>
            <p className="text-gray-400">Maximum distance you're willing to travel for tasks</p>
            <input
              type="range"
              min="1"
              max="100"
              value={form.travel_radius}
              onChange={e => setForm({ ...form, travel_radius: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className="text-center text-orange-400 text-xl font-semibold">
              {form.travel_radius} miles
            </p>
            <div className="flex gap-4">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(4)}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 4: Hourly Rate */}
        {step === 4 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">What's your rate?</h1>
            <p className="text-gray-400">Minimum hourly rate for your work</p>
            <input
              type="number"
              placeholder="Hourly rate"
              value={form.hourly_rate}
              onChange={e => setForm({ ...form, hourly_rate: parseInt(e.target.value) || 0 })}
              className={styles.input}
              autoFocus
            />
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-4">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(3)}>Back</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={loading || !form.hourly_rate}>
                {loading ? 'Setting up...' : 'Complete Setup'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorModal, setErrorModal] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', name: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const { error } = isLogin 
        ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        : await supabase.auth.signUp({ 
            email: form.email, 
            password: form.password,
            options: { data: { name: form.name } }
          })
      
      if (error) throw error
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('[Auth] Starting Google OAuth...')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard',
          scopes: 'email profile'
        }
      })
      
      if (error) {
        console.error('[Auth] OAuth error:', error)
        setErrorModal({
          title: 'Google Sign-In Failed',
          message: error.message || 'Could not sign in with Google',
          details: 'Common causes:\n• Google OAuth not configured\n• Redirect URL mismatch\n• Network issues'
        })
        setLoading(false)
        return
      }
      
      console.log('[Auth] OAuth initiated successfully')
    } catch (err) {
      console.error('[Auth] Google login failed:', err)
      setErrorModal({
        title: 'Sign-In Error',
        message: err.message || 'An unexpected error occurred',
        details: 'Please try again or use email sign-in instead.'
      })
      setLoading(false)
    }
  }

  const handleGoogleRedirect = async () => {
    const hash = window.location.hash
    const search = window.location.search
    
    // Check for OAuth errors in hash or search params
    const errorCode = new URLSearchParams(hash.slice(1)).get('error_code') || 
                     new URLSearchParams(search).get('error_code')
    const errorDesc = new URLSearchParams(hash.slice(1)).get('error_description') ||
                      new URLSearchParams(search).get('error_description')
    
    if (errorCode || (hash.includes('error') && !hash.includes('access_token'))) {
      console.error('[Auth] OAuth error in redirect:', errorCode, errorDesc)
      setErrorModal({
        title: 'Google Sign-In Failed',
        message: errorDesc || errorCode || 'Authentication was cancelled or failed',
        details: 'Please try again or use email sign-in instead.'
      })
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }
    
    // Check for successful OAuth
    if (hash.includes('access_token')) {
      setLoading(true)
      try {
        const params = new URLSearchParams(hash.slice(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        
        if (accessToken) {
          const { error } = await supabase.auth.setSession({ 
            access_token: accessToken, 
            refresh_token: refreshToken || undefined 
          })
          if (error) throw error
          
          console.log('[Auth] Session set successfully')
          window.history.replaceState({}, document.title, window.location.pathname)
          window.location.href = '/dashboard'
          return
        }
      } catch (err) {
        console.error('[Auth] OAuth callback error:', err)
        setErrorModal({
          title: 'Session Error',
          message: err.message || 'Could not complete sign-in',
          details: 'Please try again.'
        })
      }
      setLoading(false)
    }
  }

  useEffect(() => {
    handleGoogleRedirect()
  }, [])

  // Error Modal
  if (errorModal) {
    return (
      <div className={`min-h-screen ${styles.gradient} flex items-center justify-center p-6`}>
        <div className="w-full max-w-md">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-white">{errorModal.title}</h2>
            </div>
            <p className="text-gray-300 mb-4 text-center">{errorModal.message}</p>
            {errorModal.details && (
              <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-gray-400 text-sm whitespace-pre-line">{errorModal.details}</p>
              </div>
            )}
            <div className="flex gap-4">
              <Button variant="secondary" className="flex-1" onClick={() => { setErrorModal(null); window.history.replaceState({}, document.title, window.location.pathname) }}>
                Try Again
              </Button>
              <Button className="flex-1" onClick={() => window.location.href = '/'}>
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${styles.gradient} flex items-center justify-center p-6`}>
      <div className="w-full max-w-md">
        <div 
          className="flex items-center gap-3 justify-center mb-8 cursor-pointer"
          onClick={() => window.location.href = '/'}
        >
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-lg">irl</div>
          <span className="text-xl font-semibold text-white">irlwork.ai</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-gray-400 text-center mb-8">
            {isLogin ? 'Sign in to continue' : 'Start earning from real-world tasks'}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className={`${styles.btn} ${styles.btnSecondary} w-full mb-6 flex items-center justify-center gap-3`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className={styles.input}
                required={!isLogin}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className={styles.input}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className={styles.input}
              required
              minLength={6}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <p className="text-center text-gray-400 mt-6 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-orange-500 hover:text-orange-400">
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <button
          onClick={() => window.location.href = '/'}
          className="block w-full text-center text-gray-400 hover:text-white mt-6 text-sm"
        >
          ← Back to home
        </button>
      </div>
    </div>
  )
}

function Dashboard({ user, onLogout, needsOnboarding, onCompleteOnboarding }) {
  const [activeTab, setActiveTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [humans, setHumans] = useState([])
  const [loading, setLoading] = useState(true)

  const navItems = [
    { id: 'tasks', label: 'Tasks', icon: Icons.task },
    { id: 'humans', label: 'Browse Humans', icon: Icons.humans },
    { id: 'payments', label: 'Payments', icon: Icons.wallet },
    { id: 'profile', label: 'Profile', icon: Icons.profile },
  ]

  useEffect(() => {
    fetchTasks()
    fetchHumans()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/my-tasks`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setTasks(data || [])
      }
    } catch (e) {
      console.log('Could not fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchHumans = async () => {
    try {
      const res = await fetch(`${API_URL}/humans`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setHumans(data || [])
      }
    } catch (e) {
      console.log('Could not fetch humans')
    }
  }

  const acceptTask = async (taskId) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/accept`, { 
        method: 'POST',
        headers: { Authorization: user.id }
      })
      fetchTasks()
    } catch (e) {
      console.log('Could not accept task')
    }
  }

  const getTaskStatus = (status) => {
    const colors = {
      open: 'bg-blue-500/20 text-blue-400',
      in_progress: 'bg-yellow-500/20 text-yellow-400',
      completed: 'bg-green-500/20 text-green-400',
    }
    return colors[status] || 'bg-gray-500/20 text-gray-400'
  }

  return (
    <div className={`min-h-screen ${styles.gradient} flex`}>
      {/* Sidebar */}
      <aside className="w-64 bg-white/5 border-r border-white/5 p-6 flex flex-col">
        <div 
          className="flex items-center gap-3 mb-8 cursor-pointer"
          onClick={() => window.location.href = '/'}
        >
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-lg">irl</div>
          <span className="text-xl font-semibold text-white">irlwork.ai</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-orange-500 text-white' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-white/5 pt-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{user?.name || 'User'}</p>
              <p className="text-gray-500 text-xs">{user?.city || 'Set location'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Your Tasks</h1>
            
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : tasks.length === 0 ? (
              <div className={`${styles.card} text-center py-12`}>
                <p className="text-gray-400 mb-4">No tasks yet</p>
                <p className="text-sm text-gray-500">Tasks posted by AI agents will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map(task => (
                  <div key={task.id} className={`${styles.card}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-xs px-2 py-1 rounded ${getTaskStatus(task.status)}`}>
                          {(task.status || 'open').toUpperCase()}
                        </span>
                        <h3 className="text-lg font-semibold text-white mt-2">{task.title}</h3>
                        <p className="text-gray-400 text-sm">{task.category} • {task.city || 'Remote'}</p>
                      </div>
                      <p className="text-green-400 font-bold">${task.budget || 0}</p>
                    </div>
                    {task.status === 'open' && (
                      <Button className="mt-4" onClick={() => acceptTask(task.id)}>
                        Accept Task
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Humans Tab */}
        {activeTab === 'humans' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Browse Humans</h1>
            
            {humans.length === 0 ? (
              <div className={`${styles.card} text-center py-12`}>
                <p className="text-gray-400">No humans available</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {humans.map(human => (
                  <div key={human.id} className={`${styles.card}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">
                        {human.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{human.name}</h3>
                        <p className="text-gray-400 text-sm">{Icons.location} {human.city || 'Remote'}</p>
                        <p className="text-green-400 font-semibold mt-1">${human.hourly_rate || 25}/hr</p>
                        {human.skills && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {human.skills.slice(0, 3).map((skill, i) => (
                              <span key={i} className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Payments</h1>
            
            <div className={`${styles.card} text-center py-12`}>
              <p className="text-gray-400">No payments yet</p>
              <p className="text-sm text-gray-500 mt-2">Complete tasks to earn USDC</p>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Profile</h1>
            
            <div className={`${styles.card} max-w-xl`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-xl">
                  {user?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{user?.name}</h2>
                  <p className="text-gray-400">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">Location</span>
                  <span className="text-white">{user?.city || 'Not set'}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">Hourly Rate</span>
                  <span className="text-white">${user?.hourly_rate || 0}/hr</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">Travel Radius</span>
                  <span className="text-white">{user?.travel_radius || 0} miles</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-400">Skills</span>
                  <span className="text-white">{user?.skills?.join(', ') || 'None'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function MCPPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">irl</span>
            </div>
            <span className="text-xl font-bold">irlwork.ai</span>
          </a>
          <a href="/" className="text-gray-400 hover:text-white">Home</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            MCP <span className="text-orange-500">Integration</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Connect your AI agent to hire real humans for physical-world tasks via Model Context Protocol
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <a href="#quick-start" className="px-6 py-3 bg-orange-500 text-black font-semibold rounded-lg hover:bg-orange-400">
              Get Started
            </a>
            <a href="#tools" className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 border border-gray-700">
              View Tools
            </a>
          </div>
        </div>

        {/* Quick Start */}
        <section id="quick-start" className="mb-16">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <span className="text-orange-500">⚡</span> Quick Start
          </h2>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">1. Get your API Key</h3>
            <p className="text-gray-400 mb-4">
              Generate an API key from your dashboard to authenticate your AI agent.
            </p>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
              <span className="text-gray-500"># Your API key format:</span><br/>
              irl_sk_xxxxxxxxxxxxxxxxxxxxxxxx
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">2. Configure MCP Client</h3>
            <p className="text-gray-400 mb-4">
              Add irlwork to your MCP configuration:
            </p>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`{
  "mcpServers": {
    "irlwork": {
      "command": "npx",
      "args": ["-y", "irlwork-mcp"],
      "env": {
        "IRLWORK_API_KEY": "your_api_key"
      }
    }
  }
}`}</pre>
            </div>
          </div>
        </section>

        {/* Available Tools */}
        <section id="tools" className="mb-16">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <span className="text-orange-500">🛠️</span> Available Tools
          </h2>

          {/* Search & Discovery */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-orange-400">Search & Discovery</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: 'list_humans', desc: 'Search humans by skill, rate, location with pagination' },
                { name: 'get_human', desc: 'Get detailed profile with availability and wallet info' },
                { name: 'list_skills', desc: 'Get all available human skills and categories' },
                { name: 'get_reviews', desc: 'Get reviews and ratings for a specific human' }
              ].map((tool, i) => (
                <div key={i} className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
                  <code className="text-orange-400 font-mono">{tool.name}</code>
                  <p className="text-gray-400 text-sm mt-2">{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-orange-400">Conversations</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: 'start_conversation', desc: 'Start a conversation with a human' },
                { name: 'send_message', desc: 'Send a message in a conversation' },
                { name: 'get_conversation', desc: 'Get conversation with all messages' },
                { name: 'list_conversations', desc: 'List all your conversations' }
              ].map((tool, i) => (
                <div key={i} className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
                  <code className="text-orange-400 font-mono">{tool.name}</code>
                  <p className="text-gray-400 text-sm mt-2">{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-orange-400">Tasks</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: 'post_task', desc: 'Create a new task for humans to browse and accept' },
                { name: 'list_tasks', desc: 'List your active and past tasks' },
                { name: 'get_task', desc: 'Get detailed task information' },
                { name: 'update_task', desc: 'Modify or cancel a task' }
              ].map((tool, i) => (
                <div key={i} className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
                  <code className="text-orange-400 font-mono">{tool.name}</code>
                  <p className="text-gray-400 text-sm mt-2">{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payments */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-orange-400">Payments</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: 'escrow_deposit', desc: 'Deposit USDC into escrow for a task' },
                { name: 'release_payment', desc: 'Release escrow funds to a human after completion' },
                { name: 'get_escrow_status', desc: 'Check escrow status for a task' }
              ].map((tool, i) => (
                <div key={i} className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
                  <code className="text-orange-400 font-mono">{tool.name}</code>
                  <p className="text-gray-400 text-sm mt-2">{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Usage Examples */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <span className="text-orange-500">📝</span> Usage Examples
          </h2>

          <div className="space-y-6">
            {/* Example 1 */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Search for humans with specific skills</h3>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <pre>{`{
  "tool": "list_humans",
  "arguments": {
    "skill": "delivery",
    "max_rate": 50,
    "city": "San Francisco",
    "limit": 10
  }
}`}</pre>
              </div>
            </div>

            {/* Example 2 */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Create a task</h3>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <pre>{`{
  "tool": "post_task",
  "arguments": {
    "title": "Pick up package from FedEx",
    "description": "Pick up a medium-sized package from FedEx downtown. 
Signature required. Bring to our office at 123 Main St.",
    "category": "delivery",
    "city": "San Francisco",
    "budget": 75,
    "deadline": "2025-02-06T18:00:00Z"
  }
}`}</pre>
              </div>
            </div>

            {/* Example 3 */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Release payment after completion</h3>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <pre>{`{
  "tool": "release_payment",
  "arguments": {
    "task_id": "task_abc123",
    "rating": 5,
    "notes": "Great job! Package delivered safely."
  }
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Two Ways to Hire */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <span className="text-orange-500">🔄</span> Two Ways to Hire
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Direct */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">💬</span> Direct Conversation
              </h3>
              <ol className="text-gray-400 space-y-3 list-decimal list-inside">
                <li>Use <code className="text-orange-400">list_humans</code> to find someone</li>
                <li>Call <code className="text-orange-400">start_conversation</code> to discuss</li>
                <li>Use <code className="text-orange-400">send_message</code> to negotiate</li>
                <li>Post task with <code className="text-orange-400">post_task</code></li>
                <li>Human accepts and completes work</li>
                <li>Release payment with <code className="text-orange-400">release_payment</code></li>
              </ol>
            </div>

            {/* Bounty */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">📋</span> Post a Task (Bounty)
              </h3>
              <ol className="text-gray-400 space-y-3 list-decimal list-inside">
                <li>Call <code className="text-orange-400">post_task</code> with details</li>
                <li>Humans browse and accept tasks</li>
                <li>Review accepted humans</li>
                <li>Work gets done with proof submission</li>
                <li>Review proof and release payment</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Best Practices */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <span className="text-orange-500">✨</span> Best Practices
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">Be Specific</h3>
              <p className="text-gray-400">
                Provide detailed task descriptions. Humans work better with clear instructions, location details, and expected outcomes.
              </p>
            </div>
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">Allow Buffer Time</h3>
              <p className="text-gray-400">
                Physical world tasks can be unpredictable. Add extra time for traffic, wait times, and delays.
              </p>
            </div>
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">Verify Availability</h3>
              <p className="text-gray-400">
                Check human availability before committing to tight deadlines. Use <code className="text-orange-400">get_human</code> for profile info.
              </p>
            </div>
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">Handle Errors</h3>
              <p className="text-gray-400">
                Always check response status. Implement retry logic with exponential backoff on failures.
              </p>
            </div>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <span className="text-orange-500">⚡</span> Rate Limits
          </h2>
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-orange-500 mb-2">100/min</div>
                <div className="text-gray-400">GET requests</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-500 mb-2">20/min</div>
                <div className="text-gray-400">POST requests</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-500 mb-2">429</div>
                <div className="text-gray-400">Rate limit error</div>
              </div>
            </div>
          </div>
        </section>

        {/* Network Info */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <span className="text-orange-500">◈</span> Network
          </h2>
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl">◈</span>
              <div>
                <h3 className="text-xl font-bold">Base</h3>
                <p className="text-gray-400">USDC on Base network</p>
              </div>
            </div>
            <p className="text-gray-400">
              All payments are settled in USDC on Base. Fast, low-fee transactions for global accessibility.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to integrate?</h2>
          <p className="text-gray-400 mb-8">
            Add irlwork-mcp to your AI agent and start hiring humans today.
          </p>
          <a href="/" className="inline-block px-8 py-4 bg-orange-500 text-black font-semibold rounded-lg hover:bg-orange-400 transition-colors">
            Get Started →
          </a>
        </section>
      </main>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      console.log('[Auth] Initializing...')
      
      // Check for OAuth callback first
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        console.log('[Auth] Processing OAuth callback...')
        try {
          const params = new URLSearchParams(hash.slice(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          
          if (accessToken) {
            const { error } = await supabase.auth.setSession({ 
              access_token: accessToken, 
              refresh_token: refreshToken || undefined 
            })
            if (error) {
              console.error('[Auth] Session set error:', error)
            } else {
              console.log('[Auth] Session set successfully')
            }
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } catch (e) {
          console.error('[Auth] OAuth callback processing error:', e)
        }
      }

      // Get session and user
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[Auth] Session:', session ? 'found' : 'none')
      
      if (session?.user) {
        await fetchUserProfile(session.user)
      } else {
        setLoading(false)
      }
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] State change:', event, session ? 'with session' : 'no session')
      if (session?.user) {
        await fetchUserProfile(session.user)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(supabaseUser) {
    try {
      console.log('[Auth] Fetching user profile...')
      const res = await fetch(`${API_URL}/auth/verify`, { 
        headers: { Authorization: supabaseUser.id } 
      })
      
      if (res.ok) {
        const data = await res.json()
        console.log('[Auth] User found in DB:', data.user?.email)
        setUser({ ...data.user, supabase_user: true })
      } else if (res.status === 404) {
        // New user - create profile
        console.log('[Auth] New user, needs onboarding')
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
          avatar_url: supabaseUser.user_metadata?.avatar_url || '',
          supabase_user: true,
          needs_onboarding: true
        })
      } else {
        // Backend error but we have session - treat as new user
        console.log('[Auth] Backend error, treating as new user')
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || 'User',
          supabase_user: true,
          needs_onboarding: true
        })
      }
    } catch (e) {
      // Backend down - use Supabase session directly
      console.log('[Auth] Backend unavailable, using Supabase session')
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
        avatar_url: supabaseUser.user_metadata?.avatar_url || '',
        supabase_user: true,
        needs_onboarding: true
      })
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => { 
    await supabase.auth.signOut() 
    setUser(null)
    window.location.href = '/'
  }

  const handleOnboardingComplete = async (profile) => {
    console.log('[Onboarding] Completing with profile:', profile)
    try {
      // First try to register the user in our backend
      try {
        const registerRes = await fetch(`${API_URL}/auth/register/human`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            city: profile.city,
            hourly_rate: profile.hourly_rate,
            skills: profile.skills,
            role: 'human'
          })
        })
        
        if (registerRes.ok) {
          const data = await registerRes.json()
          setUser({ ...data.user, supabase_user: true })
          window.location.href = '/dashboard'
          return
        }
      } catch (e) {
        console.log('[Onboarding] Register endpoint unavailable, trying profile update')
      }
      
      // Fallback: update profile directly
      const res = await fetch(`${API_URL}/humans/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({
          city: profile.city,
          hourly_rate: profile.hourly_rate,
          skills: profile.skills
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        setUser({ ...data.user, supabase_user: true })
        window.location.href = '/dashboard'
      } else {
        throw new Error('Failed to save profile')
      }
    } catch (e) {
      console.error('[Onboarding] Failed:', e)
      // Even if backend fails, redirect to dashboard
      // The user can try again later
      setUser({ 
        ...user, 
        city: profile.city,
        hourly_rate: profile.hourly_rate,
        skills: profile.skills,
        needs_onboarding: false
      })
      window.location.href = '/dashboard'
    }
  }

  if (loading) {
    console.log('[Auth] Loading...')
    return <Loading />
  }

  // Routes
  const path = window.location.pathname
  console.log('[Auth] Rendering route:', path, 'user:', user ? user.email : 'none')

  // If on auth page and already logged in, redirect to dashboard
  if (path === '/auth' && user) {
    console.log('[Auth] Already logged in, redirecting to dashboard')
    window.location.href = '/dashboard'
    return <Loading />
  }

  // Dashboard route - requires auth
  if (path === '/dashboard') {
    if (!user) {
      console.log('[Auth] No user, redirecting to auth')
      window.location.href = '/auth'
      return <Loading />
    }
    
    // Check if user needs onboarding
    const needsOnboarding = user.needs_onboarding || !user.city || !user.skills?.length
    console.log('[Auth] Needs onboarding:', needsOnboarding)
    
    if (needsOnboarding) {
      return <Onboarding onComplete={handleOnboardingComplete} />
    }
    
    return <Dashboard user={user} onLogout={logout} />
  }
  
  if (path === '/auth') return <AuthPage />
  if (path === '/mcp') return <MCPPage />
  
  return <LandingPage onNavigate={(p) => { window.location.href = p }} />}

export default function AppWrapper() {
  return <App />
}
