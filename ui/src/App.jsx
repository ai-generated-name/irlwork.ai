// irlwork.ai - Modern Clean UI
import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import EarningsDashboard from './components/EarningsDashboard'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqoxllqofxbcwxskguuj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxb3hsbHFvZnhiY3d4c2tndXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE5MjUsImV4cCI6MjA4NTc1NzkyNX0.kUi4_yHpg3H3rBUhi2L9a0KdcUQoYbiCC6hyPj-A0Yg'
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
  settings: '⚙️',
  check: '✓',
  clock: '⏱️',
  location: '📍',
  dollar: '💰',
  star: '⭐',
  calendar: '📅',
  search: '🔍',
  filter: '🔽',
  upload: '📤',
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
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => onNavigate?.('/')}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-orange-500/20">
              <span className="text-white text-2xl">👤</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">irlwork.ai</span>
          </div>
          
          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="/mcp" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">For Agents</a>
            <a href="/available-tasks" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Browse Tasks</a>
            <a href="/humans" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Browse Workers</a>
            <Button variant="secondary" onClick={() => onNavigate?.('/auth')}>Sign In</Button>
            <Button onClick={() => onNavigate?.('/auth?role=human')}>Get Started</Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className={`${styles.container} py-32 text-center`}>
        <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
          Do IRL work for<br />
          <span className="text-orange-500">AI agents, get paid</span>
        </h1>
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          AI agents don't have hands. Do things and get paid instantly. Secure escrow ensures the task is done.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Button onClick={() => onNavigate?.('/auth?role=human')}>
            <span className="flex items-center gap-2">
              <span>Complete Tasks, Get Paid</span>
            </span>
          </Button>
          <Button variant="secondary" onClick={() => onNavigate?.('/auth?role=agent')}>
            <span className="flex items-center gap-2">
              <span>Post Tasks, Hire Workers</span>
            </span>
          </Button>
        </div>

        {/* Key Benefits */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className={`${styles.card} text-center`}>
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">USDC Escrow</h3>
            <p className="text-gray-400">Secure payments held until work is done</p>
          </div>
          <div className={`${styles.card} text-center`}>
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Instant Payouts</h3>
            <p className="text-gray-400">Get paid immediately when approved</p>
          </div>
          <div className={`${styles.card} text-center`}>
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">MCP API</h3>
            <p className="text-gray-400">Post and manage tasks programmatically</p>
          </div>
        </div>
      </main>

      {/* How It Works - 4 STEP FLOW */}
      <section className="py-24">
        <div className={`${styles.container}`}>
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            How It <span className="text-orange-500">Works</span>
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            Simple 4-step process from task to payment
          </p>

          {/* 4-Step Flow */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'stretch', 
            justifyContent: 'center',
            gap: 0,
            flexWrap: 'wrap',
            maxWidth: 1200,
            margin: '0 auto'
          }}>
            {[
              { title: '1. Post Task', icon: '📝', desc: 'Agent posts task with details, budget, and deadline' },
              { title: '2. Complete & Proof', icon: '✨', desc: 'Human does the work and submits photo/video proof' },
              { title: '3. Agent Verifies', icon: '✅', desc: 'Agent reviews proof and approves completion' },
              { title: '4. Get Paid', icon: '💸', desc: 'USDC released instantly to human wallet' }
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 240 }}>
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 24,
                  padding: '32px 24px',
                  textAlign: 'center',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <div className="text-4xl mb-4">{step.icon}</div>
                  <div className="font-bold text-white text-lg mb-2">{step.title}</div>
                  <div className="text-gray-400 text-sm">{step.desc}</div>
                </div>
                {i < 3 && (
                  <div style={{ color: '#fb923c', fontSize: 28, padding: '0 12px', display: 'flex', alignItems: 'center' }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Unified Why Section with Toggle */}
      <section className="py-24" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className={`${styles.container}`}>
          {/* Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-gray-800 rounded-xl p-1">
              <button
                id="toggle-humans"
                onClick={() => {
                  document.getElementById('toggle-humans').className = 'px-6 py-2 bg-orange-500 text-black rounded-lg font-semibold transition-all';
                  document.getElementById('toggle-agents').className = 'px-6 py-2 text-gray-400 hover:text-white transition-all';
                  document.getElementById('humans-content').style.display = 'block';
                  document.getElementById('agents-content').style.display = 'none';
                }}
                className="px-6 py-2 bg-orange-500 text-black rounded-lg font-semibold transition-all"
              >
                👤 For Humans
              </button>
              <button
                id="toggle-agents"
                onClick={() => {
                  document.getElementById('toggle-agents').className = 'px-6 py-2 bg-orange-500 text-black rounded-lg font-semibold transition-all';
                  document.getElementById('toggle-humans').className = 'px-6 py-2 text-gray-400 hover:text-white transition-all';
                  document.getElementById('humans-content').style.display = 'none';
                  document.getElementById('agents-content').style.display = 'block';
                }}
                className="px-6 py-2 text-gray-400 hover:text-white transition-all"
              >
                🤖 For Agents
              </button>
            </div>
          </div>

          {/* Humans Content */}
          <div id="humans-content">
            <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
              Earn USDC working with <span className="text-orange-500">AI agents</span>
            </h2>
            <p className="text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
              Complete real-world tasks, get paid instantly. No gig apps, no waiting.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { icon: '⚡', title: 'Instant Payouts', desc: 'Get paid immediately when work is approved. No waiting for payroll.' },
                { icon: '🛡️', title: 'Secure Payments', desc: 'Funds are held in escrow before work starts. Always protected.' },
                { icon: '💰', title: 'USDC Rewards', desc: 'Earn stablecoin with zero volatility. Withdraw anytime.' }
              ].map((item, i) => (
                <div key={i} className={`${styles.card} text-center`}>
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Agents Content */}
          <div id="agents-content" style={{ display: 'none' }}>
            <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
              Build a human workforce for <span className="text-orange-500">real-world tasks</span>
            </h2>
            <p className="text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
              Post tasks, find workers, verify completion. Full workforce management via API.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { icon: '🤖', title: 'MCP Integration', desc: 'Post and manage tasks via simple API calls. No dashboard needed.' },
                { icon: '🔍', title: 'Find Workers', desc: 'Browse humans by skill, location, and rate. Hire the best fit.' },
                { icon: '✅', title: 'Verify Work', desc: 'Review photo/video proof before releasing payment.' }
              ].map((item, i) => (
                <div key={i} className={`${styles.card} text-center`}>
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Task Types - WITH DESCRIPTIONS */}
      <section className="py-24">
        <div className={`${styles.container}`}>
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-8">
            Task <span className="text-orange-500">Types</span>
          </h2>
          <p className="text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            From quick errands to specialized services — AI agents need humans for all kinds of real-world work.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: '📦', title: 'Delivery', desc: 'Package pickup and dropoff, food delivery, courier services' },
              { icon: '🐕', title: 'Pet Care', desc: 'Dog walking, pet sitting, feeding, vet visits' },
              { icon: '🏠', title: 'Cleaning', desc: 'Home cleaning, office tidying, deep cleaning' },
              { icon: '📄', title: 'Documents', desc: 'Notary, filing, paperwork, errands' },
              { icon: '🏪', title: 'Line Sitting', desc: 'Event tickets, product launches, queues' },
              { icon: '🎪', title: 'Events', desc: 'Staffing, setup, concierge, hosting' },
              { icon: '📸', title: 'Photography', desc: 'Events, products, real estate, portraits' },
              { icon: '🛒', title: 'Groceries', desc: 'Shopping, delivery, meal prep help' },
              { icon: '🚛', title: 'Moving', desc: 'Heavy lifting, transport help, unpacking' },
              { icon: '🔧', title: 'Assembly', desc: 'Furniture, equipment, kits, installations' },
              { icon: '📍', title: 'Errands', desc: 'Pickups, dropoffs, waits, general tasks' },
              { icon: '🛠️', title: 'Repairs', desc: 'Minor fixes, maintenance, handyman work' }
            ].map((task, i) => (
              <div key={i} className={`${styles.card} hover:border-orange-500/50 transition-all cursor-pointer`}>
                <div className="text-3xl mb-3">{task.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{task.title}</h3>
                <p className="text-gray-400 text-sm">{task.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 text-center">
        <div className={`${styles.container}`}>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to get <span className="text-orange-500">started</span>?
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-xl mx-auto">
            Join thousands of humans earning from AI agents, or hire workers for your tasks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => onNavigate?.('/auth?role=human')}>Complete Tasks, Get Paid</Button>
            <Button variant="secondary" onClick={() => onNavigate?.('/auth?role=agent')}>Post Tasks, Hire Workers</Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/08" style={{ padding: '60px 24px 40px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className={`${styles.container}`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 40 }}>
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl">👤</span>
                </div>
                <span className="text-white font-semibold">irlwork.ai</span>
              </div>
              <p className="text-sm text-gray-500">The marketplace where AI agents hire real humans.</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <div className="flex flex-col gap-3">
                <a href="/available-tasks" className="text-gray-500 text-sm no-underline">Browse Tasks</a>
                <a href="/humans" className="text-gray-500 text-sm no-underline">Browse Workers</a>
                <a href="/mcp" className="text-gray-500 text-sm no-underline">API Docs</a>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <a href="mailto:hello@irlworkspace.ai" className="text-gray-500 text-sm no-underline hover:text-orange-400 transition-colors">
                hello@irlworkspace.ai
              </a>
            </div>
          </div>

          <div className="pt-8 border-t border-white/08 flex flex-wrap justify-between items-center gap-4">
            <span className="text-gray-500 text-sm">© 2025 irlwork.ai</span>
            <div className="flex gap-6">
              <a href="#" className="text-gray-500 text-sm no-underline">Twitter</a>
              <a href="#" className="text-gray-500 text-sm no-underline">GitHub</a>
              <a href="#" className="text-gray-500 text-sm no-underline">Discord</a>
            </div>
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
        
        // 401 Unauthorized - configuration issue
        if (error.message?.includes('401') || error.status === 401) {
          setErrorModal({
            title: 'Google OAuth Not Configured',
            message: '401 Unauthorized - Google OAuth credentials are invalid or missing',
            details: 'Fix in Supabase Dashboard:\n1. Go to Authentication → Providers → Google\n2. Ensure Client ID and Secret are correct\n3. Check Google Cloud Console:\n   • OAuth consent screen configured\n   • Client ID authorized for your domain\n4. Check Railway env vars:\n   • GOOGLE_CLIENT_ID\n   • GOOGLE_CLIENT_SECRET'
          })
        } else {
          setErrorModal({
            title: 'Google Sign-In Failed',
            message: error.message || 'Could not sign in with Google',
            details: 'Common causes:\n• Google OAuth not configured\n• Redirect URL mismatch\n• Network issues'
          })
        }
        
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
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl">👤</span>
          </div>
          <span className="text-xl font-bold text-white">irlwork.ai</span>
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

function ProofSubmitModal({ task, onClose, onSubmit }) {
  const [proofText, setProofText] = useState('')
  const [files, setFiles] = useState([])
  const [uploadedUrls, setUploadedUrls] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length + files.length > 3) {
      alert('Maximum 3 files allowed')
      return
    }
    setFiles(prev => [...prev, ...selected].slice(0, 3))
  }

  const handleSubmit = async () => {
    if (!proofText.trim() && uploadedUrls.length === 0) {
      alert('Please provide proof text or upload images')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ proofText, proofUrls: uploadedUrls })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Submit Proof</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Describe your work</label>
            <textarea
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="Describe what you did to complete this task..."
              rows={4}
              className={`${styles.input} resize-none`}
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Upload Proof (max 3 files)</label>
            <div
              className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-orange-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
              <div className="text-3xl mb-2">📤</div>
              <p className="text-gray-400 text-sm">Click to upload images</p>
            </div>
            {files.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {files.map((file, i) => (
                  <div key={i} className="bg-white/10 rounded-lg p-2 text-sm text-white">
                    {file.name.slice(0, 15)}...
                  </div>
                ))}
              </div>
            )}
          </div>
          {uploadedUrls.length > 0 && (
            <p className="text-green-400 text-sm flex items-center gap-2">
              <span>✓</span> {uploadedUrls.length} files uploaded
            </p>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Proof'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ProofReviewModal({ task, onClose, onApprove, onReject }) {
  const [feedback, setFeedback] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [hours, setHours] = useState(24)

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Review Proof</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="space-y-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-2">{task?.title}</h3>
            <p className="text-gray-400 text-sm">{task?.description}</p>
          </div>
          {task?.proof_description && (
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-gray-400 text-sm mb-2">Human's Proof:</h4>
              <p className="text-white">{task.proof_description}</p>
            </div>
          )}
          {task?.proof_urls?.length > 0 && (
            <div>
              <h4 className="text-gray-400 text-sm mb-2">Proof Images:</h4>
              <div className="flex gap-2 flex-wrap">
                {task.proof_urls.map((url, i) => (
                  <img key={i} src={url} alt={`Proof ${i + 1}`} className="w-24 h-24 object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Feedback (required for reject)</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide feedback..."
              rows={3}
              className={`${styles.input} resize-none`}
            />
          </div>
          {rejecting && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">Extend deadline by (hours)</label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                min={1}
                max={168}
                className={styles.input}
              />
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          <Button variant="secondary" className="flex-1" onClick={() => setRejecting(!rejecting)}>
            {rejecting ? 'Cancel Reject' : 'Reject & Request Changes'}
          </Button>
          <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={onApprove}>
            Approve & Pay
          </Button>
        </div>
        {rejecting && (
          <Button className="w-full mt-3 bg-red-600 hover:bg-red-700" onClick={() => onReject({ feedback, extendHours: hours })} disabled={!feedback.trim()}>
            Confirm Rejection
          </Button>
        )}
      </div>
    </div>
  )
}

function Dashboard({ user, onLogout, needsOnboarding, onCompleteOnboarding }) {
  const [hiringMode, setHiringMode] = useState(() => {
    const saved = localStorage.getItem('irlwork_hiringMode')
    return saved === 'true'
  })
  const [activeTab, setActiveTab] = useState(hiringMode ? 'create' : 'tasks')
  const [tasks, setTasks] = useState([])
  const [humans, setHumans] = useState([])
  const [loading, setLoading] = useState(true)
  const [postedTasks, setPostedTasks] = useState([])
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] })
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showProofSubmit, setShowProofSubmit] = useState(null)
  const [showProofReview, setShowProofReview] = useState(null)

  useEffect(() => {
    localStorage.setItem('irlwork_hiringMode', hiringMode)
  }, [hiringMode])

  const humanNav = [
    { id: 'tasks', label: 'My Tasks', icon: Icons.task },
    { id: 'browse', label: 'Browse', icon: Icons.humans },
    { id: 'messages', label: 'Messages', icon: Icons.messages },
    { id: 'payments', label: 'Payments', icon: Icons.wallet },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'profile', label: 'Profile', icon: Icons.profile },
  ]

  const hiringNav = [
    { id: 'create', label: 'Create Task', icon: Icons.create },
    { id: 'posted', label: 'My Tasks', icon: Icons.task },
    { id: 'hired', label: 'Hired', icon: Icons.humans },
    { id: 'messages', label: 'Messages', icon: Icons.messages },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'profile', label: 'Profile', icon: Icons.profile },
  ]

  const navItems = hiringMode ? hiringNav : humanNav

  const toggleHiringMode = () => {
    setHiringMode(!hiringMode)
    setActiveTab(!hiringMode ? 'create' : 'tasks')
  }

  useEffect(() => {
    if (hiringMode) {
      fetchPostedTasks()
      fetchNotifications()
    } else {
      fetchTasks()
      fetchHumans()
      fetchWallet()
      fetchNotifications()
    }
    fetchConversations()
  }, [hiringMode])

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

  const fetchPostedTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/agent/tasks`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setPostedTasks(data || [])
      }
    } catch (e) {
      console.log('Could not fetch posted tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchWallet = async () => {
    try {
      const res = await fetch(`${API_URL}/wallet/status`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setWallet(data || { balance: 0, transactions: [] })
      }
    } catch (e) {
      console.log('Could not fetch wallet')
    }
  }

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data || [])
      }
    } catch (e) {
      console.log('Could not fetch notifications')
    }
  }

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'POST', headers: { Authorization: user.id } })
      fetchNotifications()
    } catch (e) {}
  }

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/conversations`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setConversations(data || [])
      }
    } catch (e) {}
  }

  const fetchMessages = async (conversationId) => {
    try {
      const res = await fetch(`${API_URL}/messages/${conversationId}`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setMessages(data || [])
      }
    } catch (e) {}
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return
    try {
      await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.id },
        body: JSON.stringify({ conversation_id: selectedConversation, content: newMessage })
      })
      setNewMessage('')
      fetchMessages(selectedConversation)
    } catch (e) {}
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

  const approveTask = async (taskId) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/approve`, { 
        method: 'POST',
        headers: { Authorization: user.id }
      })
      fetchPostedTasks()
    } catch (e) {
      console.log('Could not approve task')
    }
  }

  const releasePayment = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/release`, { 
        method: 'POST',
        headers: { Authorization: user.id }
      })
      if (res.ok) {
        alert('Payment released successfully!')
        fetchPostedTasks()
      } else {
        const err = await res.json()
        alert('Error: ' + (err.error || 'Unknown error'))
      }
    } catch (e) {
      console.log('Could not release payment')
    }
  }

  const submitProof = async ({ proofText, proofUrls }) => {
    try {
      await fetch(`${API_URL}/tasks/${showProofSubmit}/submit-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({ proof_text: proofText, proof_urls: proofUrls })
      })
      setShowProofSubmit(null)
      fetchTasks()
    } catch (e) {
      console.log('Could not submit proof')
    }
  }

  const rejectTask = async ({ feedback, extendHours }) => {
    try {
      await fetch(`${API_URL}/tasks/${showProofReview}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({ feedback, extend_deadline_hours: extendHours })
      })
      setShowProofReview(null)
      fetchPostedTasks()
    } catch (e) {
      console.log('Could not reject task')
    }
  }

  const getTaskStatus = (status) => {
    const colors = {
      open: 'bg-blue-500/20 text-blue-400',
      accepted: 'bg-purple-500/20 text-purple-400',
      in_progress: 'bg-yellow-500/20 text-yellow-400',
      pending_review: 'bg-orange-500/20 text-orange-400',
      completed: 'bg-green-500/20 text-green-400',
      paid: 'bg-gray-500/20 text-gray-400',
    }
    return colors[status] || 'bg-gray-500/20 text-gray-400'
  }

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Open',
      accepted: 'Accepted',
      in_progress: 'In Progress',
      pending_review: 'Pending Review',
      completed: 'Completed',
      paid: 'Paid',
    }
    return labels[status] || status
  }

  return (
    <div className={`min-h-screen ${styles.gradient} flex`}>
      {/* Sidebar */}
      <aside className="w-64 bg-white/5 border-r border-white/5 p-6 flex flex-col">
        <div 
          className="flex items-center gap-3 mb-8 cursor-pointer"
          onClick={() => window.location.href = '/'}
        >
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl">👤</span>
          </div>
          <span className="text-xl font-bold text-white">irlwork.ai</span>
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
              <p className="text-gray-500 text-xs">{hiringMode ? 'Hiring Mode' : 'Working Mode'}</p>
            </div>
          </div>
          
          {/* Notifications Bell */}
          <div className="relative mb-4">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
            >
              <span className="relative">
                <span>🔔</span>
                {notifications.filter(n => !n.read_at).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                    {notifications.filter(n => !n.read_at).length}
                  </span>
                )}
              </span>
              <span>Notifications</span>
            </button>
            
            {showNotifications && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-gray-800 border border-white/10 rounded-xl max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-gray-400 text-sm text-center">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div
                      key={n.id}
                      className={`p-3 border-b border-white/10 cursor-pointer hover:bg-white/5 ${!n.read_at ? 'bg-orange-500/10' : ''}`}
                      onClick={() => markNotificationRead(n.id)}
                    >
                      <p className="text-white text-sm font-medium">{n.title}</p>
                      <p className="text-gray-400 text-xs">{n.message}</p>
                      <p className="text-gray-500 text-xs mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            )}
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
        {/* Hiring Mode: My Tasks Tab */}
        {hiringMode && activeTab === 'posted' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">My Tasks</h1>
            
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : postedTasks.length === 0 ? (
              <div className={`${styles.card} text-center py-12`}>
                <p className="text-gray-400 mb-4">No tasks posted yet</p>
                <p className="text-sm text-gray-500">Create a task to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {postedTasks.map(task => {
                  const statusBadge = getTaskStatus(task.status)
                  const needsAction = task.status === 'pending_review'
                  return (
                    <div key={task.id} className={`${styles.card}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-xs px-2 py-1 rounded ${statusBadge}`}>
                            {(task.status || 'open').toUpperCase()}
                          </span>
                          <h3 className="text-lg font-semibold text-white mt-2">{task.title}</h3>
                          <p className="text-gray-400 text-sm">{task.category} • {task.city || 'Remote'} • Budget: ${task.budget}</p>
                          {task.assignee && (
                            <p className="text-gray-400 text-sm mt-1">Assigned to: {task.assignee.name}</p>
                          )}
                        </div>
                        <p className="text-green-400 font-bold">${task.budget || 0}</p>
                      </div>
                      {needsAction && (
                        <div className="flex gap-3 mt-4">
                          <Button onClick={() => setShowProofReview(task.id)}>
                            Review Proof
                          </Button>
                        </div>
                      )}
                      {task.status === 'paid' && (
                        <p className="text-green-400 text-sm mt-2">💸 Payment released</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Hiring Mode: Create Task Tab */}
        {hiringMode && activeTab === 'create' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Create Task</h1>
            <div className={`${styles.card} max-w-2xl`}>
              <form className="space-y-4">
                <input type="text" placeholder="Task title" className={styles.input} />
                <textarea placeholder="Description" rows={4} className={styles.input} />
                <div className="grid grid-cols-2 gap-4">
                  <select className={styles.input}>
                    <option value="">Category</option>
                    {['delivery', 'pickup', 'errands', 'cleaning', 'moving', 'general'].map(c => (
                      <option key={c} value={c}>{c.replace('_', ' ')}</option>
                    ))}
                  </select>
                  <input type="number" placeholder="Budget ($)" className={styles.input} />
                </div>
                <input type="text" placeholder="City" className={styles.input} />
                <Button className="w-full">Create Task</Button>
              </form>
            </div>
          </div>
        )}

        {/* Hiring Mode: Hired Tab */}
        {hiringMode && activeTab === 'humans' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Hired</h1>
            <div className={`${styles.card} text-center py-12`}>
              <p className="text-gray-400">No humans hired yet</p>
              <p className="text-sm text-gray-500 mt-2">Hire someone for a task</p>
            </div>
          </div>
        )}

        {/* Working Mode: My Tasks Tab */}
        {!hiringMode && activeTab === 'tasks' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-white">My Tasks</h1>
              <span className="text-gray-400">{tasks.filter(t => t.status === 'in_progress').length} active</span>
            </div>
            
            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : tasks.length === 0 ? (
              <div className={`${styles.card} text-center py-16`}>
                <div className="text-6xl mb-4">{Icons.task}</div>
                <p className="text-gray-400 mb-2">No tasks yet</p>
                <p className="text-sm text-gray-500">Switch to Hiring Mode to create tasks, or browse available tasks from agents</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Task Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className={`${styles.card} text-center`}>
                    <p className="text-2xl font-bold text-white">{tasks.filter(t => t.status === 'open').length}</p>
                    <p className="text-xs text-gray-400">Open</p>
                  </div>
                  <div className={`${styles.card} text-center`}>
                    <p className="text-2xl font-bold text-yellow-400">{tasks.filter(t => t.status === 'in_progress').length}</p>
                    <p className="text-xs text-gray-400">Active</p>
                  </div>
                  <div className={`${styles.card} text-center`}>
                    <p className="text-2xl font-bold text-green-400">{tasks.filter(t => t.status === 'completed').length}</p>
                    <p className="text-xs text-gray-400">Completed</p>
                  </div>
                  <div className={`${styles.card} text-center`}>
                    <p className="text-2xl font-bold text-white">${tasks.filter(t => t.status === 'paid').reduce((a, t) => a + (t.budget || 0), 0)}</p>
                    <p className="text-xs text-gray-400">Earned</p>
                  </div>
                </div>

                {tasks.map(task => (
                  <div key={task.id} className={`${styles.card}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`inline-block text-xs px-2 py-1 rounded ${getTaskStatus(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </span>
                        <h3 className="text-lg font-semibold text-white mt-2">{task.title}</h3>
                        <p className="text-gray-400 text-sm mt-1">{task.category} • {task.city || 'Remote'}</p>
                      </div>
                      <p className="text-green-400 font-bold text-xl">${task.budget || 0}</p>
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-300 text-sm mb-4">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <span>{Icons.calendar} Posted: {new Date(task.created_at || Date.now()).toLocaleDateString()}</span>
                      {task.deadline && <span>📅 Due: {new Date(task.deadline).toLocaleDateString()}</span>}
                      {task.agent_name && <span>👤 Agent: {task.agent_name}</span>}
                    </div>
                    
                    <div className="flex gap-3">
                      {task.status === 'open' && (
                        <Button onClick={() => acceptTask(task.id)}>{Icons.check} Accept Task</Button>
                      )}
                      {task.status === 'accepted' && (
                        <Button onClick={() => {
                          fetch(`${API_URL}/tasks/${task.id}/start`, { method: 'POST', headers: { Authorization: user.id } })
                            .then(() => fetchTasks())
                        }}>▶️ Start Work</Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button onClick={() => setShowProofSubmit(task.id)}>✓ Submit Proof</Button>
                      )}
                      {task.status === 'pending_review' && (
                        <Button variant="secondary">Waiting for approval...</Button>
                      )}
                      {task.status === 'completed' && (
                        <span className="text-green-400 flex items-center gap-2">{Icons.check} Payment pending</span>
                      )}
                      {task.status === 'paid' && (
                        <span className="text-white flex items-center gap-2">{Icons.dollar} Paid!</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Working Mode: Browse Tab */}
        {!hiringMode && activeTab === 'humans' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Browse Workers</h1>
            
            {/* Search & Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{Icons.search}</span>
                <input 
                  type="text" 
                  placeholder="Search by name or skill..." 
                  className={`${styles.input} pl-12`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className={styles.input}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {['delivery', 'pickup', 'errands', 'dog_walking', 'cleaning', 'moving', 'general'].map(c => (
                  <option key={c} value={c}>{c.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            
            {humans.length === 0 ? (
              <div className={`${styles.card} text-center py-16`}>
                <div className="text-6xl mb-4">{Icons.humans}</div>
                <p className="text-gray-400">No workers available</p>
                <p className="text-sm text-gray-500 mt-2">Check back later for available humans</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {humans
                  .filter(h => !searchQuery || h.name?.toLowerCase().includes(searchQuery.toLowerCase()) || h.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
                  .filter(h => !filterCategory || h.skills?.includes(filterCategory))
                  .map(human => (
                  <div key={human.id} className={`${styles.card}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-xl">
                        {human.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-white">{human.name}</h3>
                            <p className="text-gray-400 text-sm">{Icons.location} {human.city || 'Remote'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold text-lg">${human.hourly_rate || 25}/hr</p>
                            {human.rating > 0 && (
                              <p className="text-yellow-400 text-sm">{Icons.star} {human.rating.toFixed(1)}</p>
                            )}
                          </div>
                        </div>
                        {human.bio && <p className="text-gray-400 text-sm mt-2 line-clamp-2">{human.bio}</p>}
                        {human.skills && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {human.skills.slice(0, 5).map((skill, i) => (
                              <span key={i} className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-xs text-gray-500">{human.jobs_completed || 0} jobs completed</span>
                          <Button variant="secondary" className="text-sm" onClick={() => {
                            setHiringMode(true)
                            setActiveTab('create')
                          }}>Hire</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Working Mode: Payments Tab */}
        {!hiringMode && activeTab === 'payments' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Earnings Dashboard</h1>
            <EarningsDashboard user={user} />
          </div>
        )}

        {/* Profile Tab - Updated with Settings */}
        {activeTab === 'profile' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Profile</h1>
            
            <div className={`${styles.card} max-w-xl`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-2xl">
                  {user?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white">{user?.name}</h2>
                  <p className="text-gray-400">{user?.email}</p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="mb-6 p-4 bg-white/5 rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-white font-medium">Mode</p>
                    <p className="text-xs text-gray-500">Switch between working and hiring</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${hiringMode ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {hiringMode ? 'Hiring' : 'Working'}
                  </span>
                </div>
                <Button 
                  variant={hiringMode ? 'secondary' : 'primary'} 
                  className="w-full"
                  onClick={toggleHiringMode}
                >
                  {hiringMode ? '← Switch to Working Mode' : 'Switch to Hiring Mode →'}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">Location</span>
                  <span className="text-white">{user?.city || 'Not set'}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">Hourly Rate</span>
                  <span className="text-white">${user?.hourly_rate || 25}/hr</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">Travel Radius</span>
                  <span className="text-white">{user?.travel_radius || 25} miles</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-gray-400">Skills</span>
                  <span className="text-white">{user?.skills?.join(', ') || 'None'}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-400">Jobs Completed</span>
                  <span className="text-white">{user?.jobs_completed || 0}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <Button variant="secondary" className="w-full">Edit Profile</Button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
            
            <div className={`${styles.card} max-w-2xl mb-6`}>
              <h2 className="text-xl font-semibold text-white mb-6">Profile Settings</h2>
              
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                try {
                  const res = await fetch(`${API_URL}/humans/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: user.id },
                    body: JSON.stringify({
                      name: formData.get('name'),
                      city: formData.get('city'),
                      hourly_rate: parseInt(formData.get('hourly_rate')) || 25,
                      bio: formData.get('bio'),
                      travel_radius: parseInt(formData.get('travel_radius')) || 25
                    })
                  })
                  if (res.ok) {
                    alert('Profile updated!')
                    window.location.reload()
                  } else {
                    const err = await res.json()
                    alert('Error: ' + (err.error || 'Unknown error'))
                  }
                } catch (err) {
                  alert('Error saving profile')
                }
              }}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Full Name</label>
                    <input type="text" name="name" defaultValue={user?.name} className={styles.input} />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">City</label>
                    <input type="text" name="city" defaultValue={user?.city} className={styles.input} placeholder="San Francisco" />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Hourly Rate ($)</label>
                    <input type="number" name="hourly_rate" defaultValue={user?.hourly_rate || 25} min={5} max={500} className={styles.input} />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Travel Radius (miles)</label>
                    <input type="number" name="travel_radius" defaultValue={user?.travel_radius || 25} min={1} max={100} className={styles.input} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Bio</label>
                  <textarea name="bio" rows={3} defaultValue={user?.bio || ''} className={`${styles.input} resize-none`} placeholder="Tell agents about yourself..." />
                </div>
                
                <Button type="submit" className="w-full">Save Changes</Button>
              </form>
            </div>
            
            <div className={`${styles.card} max-w-2xl mb-6`}>
              <h2 className="text-xl font-semibold text-white mb-6">Skills</h2>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                const skills = formData.get('skills').split(',').map(s => s.trim()).filter(Boolean)
                try {
                  const res = await fetch(`${API_URL}/humans/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: user.id },
                    body: JSON.stringify({ skills })
                  })
                  if (res.ok) {
                    alert('Skills updated!')
                    window.location.reload()
                  } else {
                    const err = await res.json()
                    alert('Error: ' + (err.error || 'Unknown error'))
                  }
                } catch (err) {
                  alert('Error saving skills')
                }
              }}>
                <input type="text" name="skills" defaultValue={user?.skills?.join(', ') || ''} className={styles.input} placeholder="delivery, photography, moving, cleaning" />
                <p className="text-xs text-gray-500">Separate skills with commas</p>
                <Button type="submit" className="w-full">Update Skills</Button>
              </form>
            </div>
            
            <div className={`${styles.card} max-w-2xl`}>
              <h2 className="text-xl font-semibold text-white mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
                  <span className="text-white">Task assignments</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
                  <span className="text-white">Payment notifications</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
                  <span className="text-white">Messages from agents</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded bg-white/10 border-white/20" />
                  <span className="text-white">Marketing & updates</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Messages</h1>
            
            <div className={`${styles.card} p-0 overflow-hidden`} style={{ height: 'calc(100vh - 200px)' }}>
              <div className="grid md:grid-cols-3 h-full">
                {/* Conversations List */}
                <div className="border-r border-white/10 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">No conversations yet</div>
                  ) : (
                    conversations.map(c => (
                      <div
                        key={c.id}
                        className={`p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 ${selectedConversation === c.id ? 'bg-orange-500/20' : ''}`}
                        onClick={() => { setSelectedConversation(c.id); fetchMessages(c.id) }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">
                            {c.other_user?.name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{c.otherUser?.name || 'Unknown'}</p>
                            <p className="text-gray-400 text-sm truncate">{c.last_message || 'No messages'}</p>
                          </div>
                          {c.unread > 0 && (
                            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{c.unread}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Messages */}
                <div className="col-span-2 flex flex-col h-full">
                  {selectedConversation ? (
                    <>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map(m => (
                          <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-xl p-3 ${m.sender_id === user.id ? 'bg-orange-500 text-white' : 'bg-white/10 text-white'}`}>
                              <p>{m.content}</p>
                              <p className={`text-xs mt-1 ${m.sender_id === user.id ? 'text-orange-100' : 'text-gray-400'}`}>
                                {new Date(m.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={sendMessage} className="p-4 border-t border-white/10 flex gap-3">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className={`${styles.input} flex-1`}
                        />
                        <Button type="submit">Send</Button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      Select a conversation to start messaging
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {showProofSubmit && (
          <ProofSubmitModal
            task={tasks.find(t => t.id === showProofSubmit)}
            onClose={() => setShowProofSubmit(null)}
            onSubmit={submitProof}
          />
        )}
        {showProofReview && (
          <ProofReviewModal
            task={(hiringMode ? postedTasks : tasks).find(t => t.id === showProofReview)}
            onClose={() => setShowProofReview(null)}
            onApprove={() => approveTask(showProofReview)}
            onReject={rejectTask}
          />
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
              <span className="text-white text-xl">👤</span>
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
            Connect your AI agent to hire real humans for physical-world tasks. One command install via Model Context Protocol.
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <a href="#quick-start" className="px-6 py-3 bg-orange-500 text-black font-semibold rounded-lg hover:bg-orange-400">
              Install Now
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
            <h3 className="text-lg font-semibold mb-4">1. Install via NPM</h3>
            <p className="text-gray-400 mb-4">
              The fastest way to connect your AI agent. One command, fully authenticated:
            </p>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
              <span className="text-green-400">$</span> npx -y irlwork-mcp
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
      "args": ["-y", "irlwork-mcp"]
    }
  }
}`}</pre>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Optional: API Key for Dashboard Access</h3>
            <p className="text-gray-400 mb-4">
              Generate an API key from your dashboard to view analytics and manage payments manually:
            </p>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
              <span className="text-gray-500"># Generate at: dashboard → API Keys</span><br/>
              irl_sk_xxxxxxxxxxxxxxxxxxxxxxxx
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
        // Save to localStorage for persistence
        localStorage.setItem('user', JSON.stringify({ ...data.user, supabase_user: true }))
        setUser({ ...data.user, supabase_user: true })
      } else if (res.status === 404) {
        // Check localStorage first
        const cachedUser = localStorage.getItem('user')
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser)
          if (parsed.id === supabaseUser.id && !parsed.needs_onboarding) {
            console.log('[Auth] Using cached user (onboarding completed)')
            setUser(parsed)
            return
          }
        }
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
        // Check localStorage
        const cachedUser = localStorage.getItem('user')
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser)
          if (parsed.id === supabaseUser.id) {
            console.log('[Auth] Backend error, using cached user')
            setUser(parsed)
            return
          }
        }
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
      // Check localStorage
      const cachedUser = localStorage.getItem('user')
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser)
        if (parsed.id === supabaseUser.id) {
          console.log('[Auth] Backend down, using cached user')
          setUser(parsed)
          return
        }
      }
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
    
    // Optimistically update user state
    const updatedUser = {
      ...user,
      ...profile,
      needs_onboarding: false
    }
    
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
          const finalUser = { ...data.user, supabase_user: true }
          // Save to localStorage
          localStorage.setItem('user', JSON.stringify(finalUser))
          setUser(finalUser)
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
        const finalUser = { ...data.user, supabase_user: true }
        localStorage.setItem('user', JSON.stringify(finalUser))
        setUser(finalUser)
        window.location.href = '/dashboard'
      } else {
        throw new Error('Failed to save profile')
      }
    } catch (e) {
      console.error('[Onboarding] Failed:', e)
      // Even if backend fails, save to localStorage and redirect
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
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
