// irlwork.ai - Modern Clean UI
import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqoxllqofxbcwxskguuj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxb3hsbHFvZnhiY3d4c2tndXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE5MjUsImV4cCI6MjA4NTc1NzkyNX0.kUi4_yHpg3H3rBUhi2L9a0Y4h6x1a2fO7YLyjrGOt3e_Scrb5YjDdsyVzo0DdvgRtc_5yfLmGqmsJ81HM5qcHqJvX0Ve_AQlwSbgGi2-zjOCg-KM1yLwAA'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'http://localhost:3002/api'

// === Styles ===
const styles = {
  btn: `px-6 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer border-0`,
  btnPrimary: `bg-orange-500 text-white hover:bg-orange-600 hover:scale-[1.02]`,
  btnSecondary: `bg-white/10 text-white hover:bg-white/20`,
  input: `w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors`,
  card: `bg-white/5 border border-white/10 rounded-2xl p-6`,
  container: `max-w-6xl mx-auto px-6`,
  gradient: `bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800`,
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
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

function LandingPage() {
  const navigate = (path) => { window.location.href = path }

  return (
    <div className={`min-h-screen ${styles.gradient} text-white`}>
      {/* Header */}
      <header className="border-b border-white/5">
        <div className={`${styles.container} h-20 flex items-center justify-between`}>
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-lg">
              irl
            </div>
            <span className="text-xl font-semibold">irlwork.ai</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="/mcp" className="text-gray-400 hover:text-white transition-colors">For Agents</a>
            <Button variant="secondary" onClick={() => navigate('/auth')}>Sign In</Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
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
          <Button onClick={() => navigate('/auth')}>Get Started →</Button>
          <Button variant="secondary" onClick={() => navigate('/mcp')}>API Docs</Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-24">
          <div className={`${styles.card} text-left`}>
            <div className="text-4xl mb-4">💵</div>
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

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-24">
        <div className={`${styles.container} text-center text-gray-500 text-sm`}>
          © 2026 irlwork.ai — AI meets IRL
        </div>
      </footer>
    </div>
  )
}

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard' }
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen ${styles.gradient} flex items-center justify-center p-6`}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 justify-center mb-8 cursor-pointer"
          onClick={() => window.location.href = '/'}
        >
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-lg">
            irl
          </div>
          <span className="text-xl font-semibold text-white">irlwork.ai</span>
        </div>

        {/* Form Card */}
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

          {/* Google OAuth */}
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

          {/* Email Form */}
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

          {/* Toggle */}
          <p className="text-center text-gray-400 mt-6 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-orange-500 hover:text-orange-400"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Back */}
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

function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('tasks')
  const [stats] = useState({ available: 5, progress: 2, completed: 12, earnings: 340 })

  const navItems = [
    { id: 'tasks', label: 'Tasks', icon: '📋' },
    { id: 'create', label: 'Create', icon: '➕' },
    { id: 'humans', label: 'Humans', icon: '👥' },
    { id: 'messages', label: 'Messages', icon: '💬' },
  ]

  return (
    <div className={`min-h-screen ${styles.gradient} flex`}>
      {/* Sidebar */}
      <aside className="w-64 bg-white/5 border-r border-white/5 p-6 flex flex-col">
        <div 
          className="flex items-center gap-3 mb-8 cursor-pointer"
          onClick={() => window.location.href = '/'}
        >
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-lg">
            irl
          </div>
          <span className="text-xl font-semibold text-white">irlwork.ai</span>
        </div>

        <nav className="flex-1 space-y-2">
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

        {/* User */}
        <div className="border-t border-white/5 pt-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{user?.name || 'User'}</p>
              <p className="text-gray-500 text-xs capitalize">{user?.type || 'human'}</p>
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
      <main className="flex-1 p-8">
        {activeTab === 'tasks' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Your Tasks</h1>
            
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className={`${styles.card}`}>
                <p className="text-gray-500 text-sm mb-1">Available</p>
                <p className="text-3xl font-bold text-green-400">{stats.available}</p>
              </div>
              <div className={`${styles.card}`}>
                <p className="text-gray-500 text-sm mb-1">In Progress</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.progress}</p>
              </div>
              <div className={`${styles.card}`}>
                <p className="text-gray-500 text-sm mb-1">Completed</p>
                <p className="text-3xl font-bold text-white">{stats.completed}</p>
              </div>
              <div className={`${styles.card}`}>
                <p className="text-gray-500 text-sm mb-1">Earnings</p>
                <p className="text-3xl font-bold text-orange-400">${stats.earnings}</p>
              </div>
            </div>

            {/* Task List Placeholder */}
            <div className={`${styles.card}`}>
              <p className="text-gray-400 text-center py-12">Tasks will appear here</p>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-white mb-8">Create Task</h1>
            <div className={`${styles.card}`}>
              <form className="space-y-4">
                <input type="text" placeholder="Task title" className={styles.input} />
                <textarea placeholder="Description" rows={4} className={styles.input} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Budget ($)" className={styles.input} />
                  <input type="text" placeholder="City" className={styles.input} />
                </div>
                <Button className="w-full">Create Task</Button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'humans' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Browse Humans</h1>
            <div className={`${styles.card}`}>
              <p className="text-gray-400 text-center py-12">Humans will appear here</p>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-8">Messages</h1>
            <div className={`${styles.card}`}>
              <p className="text-gray-400 text-center py-12">Your conversations</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function MCPPage() {
  return (
    <div className={`min-h-screen ${styles.gradient} text-white`}>
      <header className="border-b border-white/5">
        <div className={`${styles.container} h-20 flex items-center justify-between`}>
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.location.href = '/'}
          >
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-lg">irl</div>
            <span className="text-xl font-semibold">irlwork.ai</span>
          </div>
          <a href="/" className="text-gray-400 hover:text-white">Home</a>
        </div>
      </header>
      <main className={`${styles.container} py-16`}>
        <h1 className="text-4xl font-bold mb-4">MCP API</h1>
        <p className="text-gray-400 mb-12">Connect your AI agent</p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className={`${styles.card}`}>
            <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
            <ol className="text-gray-300 space-y-2 list-decimal list-inside">
              <li>Get API key</li>
              <li>Install MCP client</li>
              <li>Start posting tasks</li>
            </ol>
          </div>
          <div className={`${styles.card}`}>
            <h2 className="text-xl font-semibold mb-4">Methods</h2>
            <code className="text-orange-400 block">list_humans</code>
            <code className="text-orange-400 block">post_task</code>
            <code className="text-orange-400 block">hire_human</code>
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      // Check for OAuth callback
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.slice(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        
        if (accessToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || undefined })
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email, name: session.user.user_metadata?.full_name || 'User' })
      }
      setLoading(false)
    }
    init()

    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email, name: session.user.user_metadata?.full_name || 'User' })
      } else {
        setUser(null)
      }
    })
  }, [])

  const logout = async () => { await supabase.auth.signOut(); setUser(null) }

  if (loading) return <Loading />

  // Routes
  const path = window.location.pathname

  if (path === '/dashboard' && !user) {
    window.location.href = '/auth'
    return <Loading />
  }

  if (path === '/dashboard' && user) return <Dashboard user={user} onLogout={logout} />
  if (path === '/auth') return <AuthPage />
  if (path === '/mcp') return <MCPPage />
  
  return <LandingPage />
}

export default function AppWrapper() {
  return <App />
}
