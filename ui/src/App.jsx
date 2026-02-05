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
          <Button onClick={() => onNavigate?.('/auth')}>Get Started →</Button>
          <Button variant="secondary" onClick={() => onNavigate?.('/mcp')}>API Docs</Button>
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

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await onComplete({
        city: form.city,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        travel_radius: form.travel_radius,
        hourly_rate: form.hourly_rate
      })
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
        // Fetch full user profile
        try {
          const res = await fetch(`${API_URL}/auth/verify`, { 
            headers: { Authorization: session.user.id } 
          })
          if (res.ok) {
            const data = await res.json()
            setUser(data.user)
          } else {
            setUser({ 
              id: session.user.id, 
              email: session.user.email, 
              name: session.user.user_metadata?.full_name || 'User' 
            })
          }
        } catch (e) {
          setUser({ 
            id: session.user.id, 
            email: session.user.email, 
            name: session.user.user_metadata?.full_name || 'User' 
          })
        }
      }
      setLoading(false)
    }
    init()

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const res = await fetch(`${API_URL}/auth/verify`, { 
            headers: { Authorization: session.user.id } 
          })
          if (res.ok) {
            const data = await res.json()
            setUser(data.user)
          }
        } catch (e) {
          setUser({ 
            id: session.user.id, 
            email: session.user.email, 
            name: session.user.user_metadata?.full_name || 'User' 
          })
        }
      } else {
        setUser(null)
      }
    })
  }, [])

  const logout = async () => { await supabase.auth.signOut(); setUser(null) }

  const handleOnboardingComplete = async (profile) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          ...profile
        })
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      }
    } catch (e) {
      console.error('Failed to save profile:', e)
    }
  }

  if (loading) return <Loading />

  // Routes
  const path = window.location.pathname

  if (path === '/dashboard' && !user) {
    window.location.href = '/auth'
    return <Loading />
  }

  if (path === '/dashboard' && user) {
    // Check if user needs onboarding (no city/skills set)
    const needsOnboarding = !user.city || !user.skills?.length
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
