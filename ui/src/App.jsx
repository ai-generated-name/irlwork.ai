// irlwork.ai - Modern Clean UI
import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import EarningsDashboard from './components/EarningsDashboard'
import ModeToggle from './components/ModeToggle'
import UserDropdown from './components/UserDropdown'
import TopFilterBar from './components/TopFilterBar'
import QuickStats from './components/QuickStats'
import EmptyState from './components/EmptyState'
import ActivityFeed from './components/ActivityFeed'
import BrowsePage from './pages/BrowsePage'
import LandingPageV4 from './pages/LandingPageV4'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqoxllqofxbcwxskguuj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxb3hsbHFvZnhiY3d4c2tndXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE5MjUsImV4cCI6MjA4NTc1NzkyNX0.kUi4_yHpg3H3rBUhi2L9a0KdcUQoYbiCC6hyPj-A0Yg'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

// === Styles ===
const styles = {
  btn: `px-5 py-2.5 rounded-xl font-medium transition-all duration-200 cursor-pointer border-0`,
  btnPrimary: `bg-coral text-white hover:bg-coral-dark shadow-v4-md hover:shadow-v4-lg`,
  btnSecondary: `bg-teal/10 text-teal hover:bg-teal/20`,
  btnSmall: `px-3 py-1.5 text-sm rounded-lg`,
  input: `w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-all`,
  card: `bg-white border border-gray-100 rounded-2xl p-6 shadow-v4-sm hover:shadow-v4-md transition-shadow`,
  container: `max-w-6xl mx-auto px-6`,
  gradient: `bg-cream`,
  // Dashboard-specific styles
  sidebar: `bg-teal`,
  sidebarNav: `text-white/70 hover:bg-teal-dark hover:text-white`,
  sidebarNavActive: `bg-white text-teal font-medium`,
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
    <div className="loading-v4">
      <div className="loading-v4-content">
        <div className="loading-v4-spinner" />
        <p className="loading-v4-text">Loading...</p>
      </div>
    </div>
  )
}

// Old LandingPage component removed - now using LandingPageV4
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
    <div className="onboarding-v4">
      <div className="onboarding-v4-container">
        {/* Progress */}
        <div className="onboarding-v4-progress">
          <div className="onboarding-v4-progress-header">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="onboarding-v4-progress-bar">
            <div
              className="onboarding-v4-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step 1: City */}
        {step === 1 && (
          <div>
            <h1 className="onboarding-v4-title">Where are you based?</h1>
            <p className="onboarding-v4-subtitle">This helps show you relevant tasks in your area</p>
            <input
              type="text"
              placeholder="City (e.g. San Francisco)"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              className="onboarding-v4-input"
              autoFocus
            />
            <button
              className="onboarding-v4-btn-next"
              style={{ width: '100%' }}
              onClick={() => setStep(2)}
              disabled={!form.city.trim()}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Skills */}
        {step === 2 && (
          <div>
            <h1 className="onboarding-v4-title">What can you help with?</h1>
            <p className="onboarding-v4-subtitle">Add your skills so agents know what you're great at</p>
            <input
              type="text"
              placeholder="Skills (comma separated)"
              value={form.skills}
              onChange={e => setForm({ ...form, skills: e.target.value })}
              className="onboarding-v4-input"
              autoFocus
            />
            <p className="onboarding-v4-hint">e.g. delivery, photography, coding, translation</p>
            <div className="onboarding-v4-buttons">
              <button className="onboarding-v4-btn-back" onClick={() => setStep(1)}>Back</button>
              <button className="onboarding-v4-btn-next" onClick={() => setStep(3)}>Continue</button>
            </div>
          </div>
        )}

        {/* Step 3: Travel Radius */}
        {step === 3 && (
          <div>
            <h1 className="onboarding-v4-title">How far can you travel?</h1>
            <p className="onboarding-v4-subtitle">Maximum distance you're willing to travel for tasks</p>
            <input
              type="range"
              min="1"
              max="100"
              value={form.travel_radius}
              onChange={e => setForm({ ...form, travel_radius: parseInt(e.target.value) })}
              className="onboarding-v4-slider"
            />
            <p className="onboarding-v4-slider-value">
              {form.travel_radius} miles
            </p>
            <div className="onboarding-v4-buttons">
              <button className="onboarding-v4-btn-back" onClick={() => setStep(2)}>Back</button>
              <button className="onboarding-v4-btn-next" onClick={() => setStep(4)}>Continue</button>
            </div>
          </div>
        )}

        {/* Step 4: Hourly Rate */}
        {step === 4 && (
          <div>
            <h1 className="onboarding-v4-title">What's your rate?</h1>
            <p className="onboarding-v4-subtitle">Minimum hourly rate for your work</p>
            <input
              type="number"
              placeholder="Hourly rate"
              value={form.hourly_rate}
              onChange={e => setForm({ ...form, hourly_rate: parseInt(e.target.value) || 0 })}
              className="onboarding-v4-input"
              autoFocus
            />
            {error && (
              <div className="auth-v4-error">{error}</div>
            )}
            <div className="onboarding-v4-buttons">
              <button className="onboarding-v4-btn-back" onClick={() => setStep(3)}>Back</button>
              <button className="onboarding-v4-btn-next" onClick={handleSubmit} disabled={loading || !form.hourly_rate}>
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
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
      <div className="auth-v4">
        <div className="auth-v4-container">
          <div className="auth-v4-error-modal">
            <div className="auth-v4-error-icon">⚠️</div>
            <h2 className="auth-v4-error-title">{errorModal.title}</h2>
            <p className="auth-v4-error-message">{errorModal.message}</p>
            {errorModal.details && (
              <div className="auth-v4-error-details">{errorModal.details}</div>
            )}
            <div className="auth-v4-error-buttons">
              <button className="auth-v4-error-btn-secondary" onClick={() => { setErrorModal(null); window.history.replaceState({}, document.title, window.location.pathname) }}>
                Try Again
              </button>
              <button className="auth-v4-submit" onClick={() => window.location.href = '/'}>
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-v4">
      <div className="auth-v4-container">
        <a href="/" className="auth-v4-logo">
          <div className="logo-mark-v4">irl</div>
          <span className="logo-name-v4">irlwork.ai</span>
        </a>

        <div className="auth-v4-card">
          <h1 className="auth-v4-title">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="auth-v4-subtitle">
            {isLogin ? 'Sign in to continue' : 'Start earning from real-world tasks'}
          </p>

          {error && (
            <div className="auth-v4-error">{error}</div>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="auth-v4-google-btn"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-v4-divider">
            <div className="auth-v4-divider-line" />
            <span className="auth-v4-divider-text">or</span>
            <div className="auth-v4-divider-line" />
          </div>

          <form onSubmit={handleSubmit} className="auth-v4-form">
            {!isLogin && (
              <input
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="auth-v4-input"
                required={!isLogin}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="auth-v4-input"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="auth-v4-input"
              required
              minLength={6}
            />
            <button type="submit" className="auth-v4-submit" disabled={loading}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <p className="auth-v4-switch">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} className="auth-v4-switch-link">
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <button onClick={() => window.location.href = '/'} className="auth-v4-back">
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
  const [locationFilter, setLocationFilter] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProofSubmit, setShowProofSubmit] = useState(null)
  const [showProofReview, setShowProofReview] = useState(null)
  const [activities, setActivities] = useState([])
  const [taskApplications, setTaskApplications] = useState({}) // { taskId: [applications] }
  const [expandedTask, setExpandedTask] = useState(null) // taskId for viewing applicants
  const [assigningWorker, setAssigningWorker] = useState(null) // loading state

  // Task creation form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    city: ''
  })
  const [creatingTask, setCreatingTask] = useState(false)
  const [createTaskError, setCreateTaskError] = useState('')

  useEffect(() => {
    localStorage.setItem('irlwork_hiringMode', hiringMode)
  }, [hiringMode])

  // Unread counts for badges
  const [unreadMessages, setUnreadMessages] = useState(0)
  const unreadNotifications = notifications.filter(n => !n.read_at).length

  const humanNav = [
    { id: 'tasks', label: 'My Tasks', icon: Icons.task },
    { id: 'browse', label: 'Browse', icon: Icons.humans },
    { id: 'messages', label: 'Messages', icon: Icons.messages, badge: unreadMessages },
    { id: 'notifications', label: 'Notifications', icon: '🔔', badge: unreadNotifications },
    { id: 'payments', label: 'Payments', icon: Icons.wallet },
  ]

  const hiringNav = [
    { id: 'create', label: 'Create Task', icon: Icons.create },
    { id: 'posted', label: 'My Tasks', icon: Icons.task },
    { id: 'hired', label: 'Hired', icon: Icons.humans },
    { id: 'messages', label: 'Messages', icon: Icons.messages, badge: unreadMessages },
    { id: 'notifications', label: 'Notifications', icon: '🔔', badge: unreadNotifications },
  ]

  const navItems = hiringMode ? hiringNav : humanNav

  const toggleHiringMode = () => {
    setHiringMode(!hiringMode)
    setActiveTab(!hiringMode ? 'create' : 'tasks')
  }

  useEffect(() => {
    if (hiringMode) {
      fetchPostedTasks()
    } else {
      fetchTasks()
      fetchHumans()
      fetchWallet()
    }
    fetchConversations()
    fetchNotifications()
    fetchUnreadMessages()
    fetchActivities()
  }, [hiringMode])

  // Real-time subscriptions for agents
  useEffect(() => {
    if (!hiringMode || !user) return

    // Subscribe to changes on agent's tasks
    const tasksChannel = supabase
      .channel(`agent-tasks-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          // Refresh tasks when any change occurs on agent's tasks
          if (payload.new?.agent_id === user.id || payload.old?.agent_id === user.id) {
            fetchPostedTasks()
          }
        }
      )
      .subscribe()

    // Subscribe to new applications
    const applicationsChannel = supabase
      .channel(`task-applications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_applications' },
        (payload) => {
          // Refresh applications for the task if it's expanded
          if (expandedTask && payload.new?.task_id === expandedTask) {
            fetchApplicationsForTask(expandedTask)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(applicationsChannel)
    }
  }, [hiringMode, user, expandedTask])

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

  const fetchApplicationsForTask = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/applications`, {
        headers: { Authorization: user.id }
      })
      if (res.ok) {
        const data = await res.json()
        setTaskApplications(prev => ({ ...prev, [taskId]: data }))
      }
    } catch (e) {
      console.log('Could not fetch applications')
    }
  }

  const handleAssignWorker = async (taskId, humanId) => {
    setAssigningWorker(humanId)
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({ human_id: humanId })
      })
      if (res.ok) {
        // Refresh tasks and applications
        fetchPostedTasks()
        setExpandedTask(null)
        setTaskApplications(prev => ({ ...prev, [taskId]: [] }))
      } else {
        const err = await res.json()
        alert('Error: ' + (err.error || 'Failed to assign worker'))
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setAssigningWorker(null)
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

  const fetchUnreadMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/messages/unread/count`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setUnreadMessages(data.count || 0)
      }
    } catch (e) {}
  }

  const fetchActivities = async () => {
    try {
      const res = await fetch(`${API_URL}/activity/feed`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setActivities(data || [])
      }
    } catch (e) {
      console.log('Could not fetch activity feed')
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    setCreateTaskError('')

    // Validation
    if (!taskForm.title.trim()) {
      setCreateTaskError('Title is required')
      return
    }
    if (!taskForm.category) {
      setCreateTaskError('Category is required')
      return
    }
    if (!taskForm.budget || parseFloat(taskForm.budget) < 5) {
      setCreateTaskError('Budget must be at least $5')
      return
    }

    setCreatingTask(true)
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          category: taskForm.category,
          budget: parseFloat(taskForm.budget),
          location: taskForm.city
        })
      })

      if (res.ok) {
        const newTask = await res.json()
        // Optimistic update - add to list immediately
        setPostedTasks(prev => [newTask, ...prev])
        // Reset form
        setTaskForm({ title: '', description: '', category: '', budget: '', city: '' })
        // Switch to posted tab
        setActiveTab('posted')
      } else {
        const err = await res.json()
        setCreateTaskError(err.error || 'Failed to create task')
      }
    } catch (e) {
      setCreateTaskError('Network error. Please try again.')
    } finally {
      setCreatingTask(false)
    }
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
      open: 'bg-teal/10 text-teal',
      accepted: 'bg-purple-100 text-purple-600',
      in_progress: 'bg-amber-100 text-amber-600',
      pending_review: 'bg-coral/10 text-coral',
      completed: 'bg-green-100 text-green-600',
      paid: 'bg-gray-100 text-gray-500',
    }
    return colors[status] || 'bg-gray-100 text-gray-500'
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
    <div className="dashboard-v4">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-v4-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <a href="/" className="dashboard-v4-sidebar-logo">
          <div className="dashboard-v4-sidebar-logo-mark">irl</div>
          <span className="dashboard-v4-sidebar-logo-name">irlwork.ai</span>
        </a>

        {/* Mode Toggle */}
        <div className="dashboard-v4-mode-toggle">
          <button
            className={`dashboard-v4-mode-btn ${!hiringMode ? 'active' : ''}`}
            onClick={() => { setHiringMode(false); setActiveTab('tasks') }}
          >
            Working
          </button>
          <button
            className={`dashboard-v4-mode-btn ${hiringMode ? 'active' : ''}`}
            onClick={() => { setHiringMode(true); setActiveTab('create') }}
          >
            Hiring
          </button>
        </div>

        {/* Navigation */}
        <nav className="dashboard-v4-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id)
                setSidebarOpen(false)
              }}
              className={`dashboard-v4-nav-item ${activeTab === item.id ? 'active' : ''}`}
            >
              <div className="dashboard-v4-nav-item-content">
                <span className="dashboard-v4-nav-icon">{item.icon}</span>
                <span className="dashboard-v4-nav-label">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="dashboard-v4-nav-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* User Section with Dropdown */}
        <div className="dashboard-v4-user">
          <UserDropdown
            user={user}
            onLogout={onLogout}
            onNavigate={(tab) => {
              setActiveTab(tab)
              setSidebarOpen(false)
            }}
          />
        </div>
      </aside>

      {/* Main */}
      <main className="dashboard-v4-main">
        {/* Top Filter Bar */}
        <div className="dashboard-v4-topbar">
          <button className="dashboard-v4-menu-btn" onClick={() => setSidebarOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="dashboard-v4-search">
            <svg className="dashboard-v4-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              className="dashboard-v4-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="dashboard-v4-filters">
            <select
              className="dashboard-v4-filter-select"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">All Locations</option>
              <option value="san-francisco">San Francisco</option>
              <option value="new-york">New York</option>
              <option value="los-angeles">Los Angeles</option>
            </select>
            <select
              className="dashboard-v4-filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="delivery">Delivery</option>
              <option value="photography">Photography</option>
              <option value="errands">Errands</option>
              <option value="cleaning">Cleaning</option>
              <option value="tech">Tech</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        <div className="dashboard-v4-content">
        {/* Hiring Mode: My Tasks Tab */}
        {hiringMode && activeTab === 'posted' && (
          <div>
            <h1 className="dashboard-v4-page-title">My Tasks</h1>

            {loading ? (
              <div className="dashboard-v4-empty">
                <div className="dashboard-v4-empty-icon">⏳</div>
                <p className="dashboard-v4-empty-text">Loading...</p>
              </div>
            ) : postedTasks.length === 0 ? (
              <div className="dashboard-v4-empty">
                <div className="dashboard-v4-empty-icon">{Icons.task}</div>
                <p className="dashboard-v4-empty-title">No tasks posted yet</p>
                <p className="dashboard-v4-empty-text">Create a task to get started</p>
              </div>
            ) : (
              <div>
                {postedTasks.map(task => {
                  const needsAction = task.status === 'pending_review'
                  const isOpen = task.status === 'open'
                  const isExpanded = expandedTask === task.id
                  const applications = taskApplications[task.id] || []

                  return (
                    <div key={task.id} className="dashboard-v4-task-card">
                      <div className="dashboard-v4-task-header">
                        <div>
                          <span className={`dashboard-v4-task-status ${task.status === 'open' ? 'open' : task.status === 'in_progress' ? 'in-progress' : task.status === 'completed' || task.status === 'paid' ? 'completed' : 'pending'}`}>
                            {getStatusLabel(task.status)}
                          </span>
                          <h3 className="dashboard-v4-task-title" style={{ marginTop: 8 }}>{task.title}</h3>
                        </div>
                        <span className="dashboard-v4-task-budget">${task.budget || 0}</span>
                      </div>

                      <div className="dashboard-v4-task-meta">
                        <span className="dashboard-v4-task-meta-item">📂 {task.category || 'General'}</span>
                        <span className="dashboard-v4-task-meta-item">📍 {task.city || 'Remote'}</span>
                        {task.assignee && (
                          <span className="dashboard-v4-task-meta-item">👤 {task.assignee.name}</span>
                        )}
                      </div>

                      {/* View Applicants Button for open tasks */}
                      {isOpen && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(26,26,26,0.06)' }}>
                          <button
                            onClick={() => {
                              if (isExpanded) {
                                setExpandedTask(null)
                              } else {
                                setExpandedTask(task.id)
                                fetchApplicationsForTask(task.id)
                              }
                            }}
                            style={{ color: 'var(--orange-600)', fontWeight: 500, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            {isExpanded ? '▼ Hide Applicants' : '▶ View Applicants'}
                          </button>

                          {/* Applicants List */}
                          {isExpanded && (
                            <div style={{ marginTop: 16 }}>
                              {applications.length === 0 ? (
                                <p style={{ color: 'var(--text-tertiary)', fontSize: 14, textAlign: 'center', padding: 16 }}>No applicants yet</p>
                              ) : (
                                applications.map(app => (
                                  <div key={app.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                                        {app.applicant?.name?.[0]?.toUpperCase() || '?'}
                                      </div>
                                      <div>
                                        <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{app.applicant?.name || 'Anonymous'}</p>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                          ⭐ {app.applicant?.rating?.toFixed(1) || 'New'} • {app.applicant?.jobs_completed || 0} jobs
                                        </p>
                                        {app.cover_letter && (
                                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>"{app.cover_letter}"</p>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleAssignWorker(task.id, app.human_id)}
                                      disabled={assigningWorker === app.human_id}
                                      className="v4-btn v4-btn-primary"
                                    >
                                      {assigningWorker === app.human_id ? 'Assigning...' : 'Accept'}
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {needsAction && (
                        <div className="dashboard-v4-task-actions">
                          <button className="v4-btn v4-btn-primary" onClick={() => setShowProofReview(task.id)}>
                            Review Proof
                          </button>
                        </div>
                      )}
                      {task.status === 'paid' && (
                        <p style={{ color: 'var(--success)', fontSize: 14, marginTop: 12 }}>💸 Payment released</p>
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
            <h1 className="dashboard-v4-page-title">Create Task</h1>
            <div className="dashboard-v4-form">
              <form onSubmit={handleCreateTask}>
                <div className="dashboard-v4-form-group">
                  <label className="dashboard-v4-form-label">Task Title</label>
                  <input
                    type="text"
                    placeholder="What do you need done?"
                    className="dashboard-v4-form-input"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="dashboard-v4-form-group">
                  <label className="dashboard-v4-form-label">Description</label>
                  <textarea
                    placeholder="Provide details about the task..."
                    className="dashboard-v4-form-input dashboard-v4-form-textarea"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                    <label className="dashboard-v4-form-label">Category</label>
                    <select
                      className="dashboard-v4-form-input dashboard-v4-form-select"
                      value={taskForm.category}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">Select category</option>
                      {['delivery', 'photography', 'errands', 'cleaning', 'moving', 'tech', 'general'].map(c => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                    <label className="dashboard-v4-form-label">Budget (USD)</label>
                    <input
                      type="number"
                      placeholder="$"
                      className="dashboard-v4-form-input"
                      value={taskForm.budget}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, budget: e.target.value }))}
                      min="5"
                    />
                  </div>
                </div>
                <div className="dashboard-v4-form-group">
                  <label className="dashboard-v4-form-label">City</label>
                  <input
                    type="text"
                    placeholder="Where should this be done?"
                    className="dashboard-v4-form-input"
                    value={taskForm.city}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                {createTaskError && (
                  <div className="dashboard-v4-form-error">{createTaskError}</div>
                )}
                <button type="submit" className="dashboard-v4-form-submit" disabled={creatingTask}>
                  {creatingTask ? 'Creating...' : 'Create Task'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Hiring Mode: Hired Tab */}
        {hiringMode && activeTab === 'hired' && (
          <div>
            <h1 className="dashboard-v4-page-title">Hired</h1>
            <div className="dashboard-v4-empty">
              <div className="dashboard-v4-empty-icon">{Icons.humans}</div>
              <p className="dashboard-v4-empty-title">No humans hired yet</p>
              <p className="dashboard-v4-empty-text">Hire someone for a task</p>
            </div>
          </div>
        )}

        {/* Working Mode: My Tasks Tab */}
        {!hiringMode && activeTab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h1 className="dashboard-v4-page-title" style={{ marginBottom: 0 }}>My Tasks</h1>
              <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>{tasks.filter(t => t.status === 'in_progress').length} active</span>
            </div>

            {/* Quick Stats */}
            <div className="dashboard-v4-stats">
              <div className="dashboard-v4-stat-card">
                <div className="dashboard-v4-stat-label">Total Earned</div>
                <div className="dashboard-v4-stat-value orange">${tasks.filter(t => t.status === 'paid').reduce((a, t) => a + (t.budget || 0), 0)}</div>
              </div>
              <div className="dashboard-v4-stat-card">
                <div className="dashboard-v4-stat-label">Tasks Completed</div>
                <div className="dashboard-v4-stat-value">{tasks.filter(t => t.status === 'completed' || t.status === 'paid').length}</div>
              </div>
              <div className="dashboard-v4-stat-card">
                <div className="dashboard-v4-stat-label">Rating</div>
                <div className="dashboard-v4-stat-value">⭐ {user?.rating?.toFixed(1) || 'New'}</div>
              </div>
            </div>

            {loading ? (
              <div className="dashboard-v4-empty">
                <div className="dashboard-v4-empty-icon">⏳</div>
                <p className="dashboard-v4-empty-text">Loading...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="dashboard-v4-empty">
                <div className="dashboard-v4-empty-icon">{Icons.task}</div>
                <p className="dashboard-v4-empty-title">No tasks yet</p>
                <p className="dashboard-v4-empty-text">Start earning by browsing available tasks</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                  <button className="v4-btn v4-btn-primary" onClick={() => setActiveTab('browse')}>
                    Browse Tasks
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {tasks.map(task => (
                  <div key={task.id} className="dashboard-v4-task-card">
                    <div className="dashboard-v4-task-header">
                      <div>
                        <span className={`dashboard-v4-task-status ${task.status === 'open' ? 'open' : task.status === 'in_progress' ? 'in-progress' : task.status === 'completed' || task.status === 'paid' ? 'completed' : 'pending'}`}>
                          {getStatusLabel(task.status)}
                        </span>
                        <h3 className="dashboard-v4-task-title" style={{ marginTop: 8 }}>{task.title}</h3>
                      </div>
                      <span className="dashboard-v4-task-budget">${task.budget || 0}</span>
                    </div>

                    {task.description && (
                      <p className="dashboard-v4-task-description">{task.description}</p>
                    )}

                    <div className="dashboard-v4-task-meta">
                      <span className="dashboard-v4-task-meta-item">📂 {task.category || 'General'}</span>
                      <span className="dashboard-v4-task-meta-item">📍 {task.city || 'Remote'}</span>
                      <span className="dashboard-v4-task-meta-item">📅 {new Date(task.created_at || Date.now()).toLocaleDateString()}</span>
                      {task.agent_name && <span className="dashboard-v4-task-meta-item">🤖 {task.agent_name}</span>}
                    </div>

                    <div className="dashboard-v4-task-actions">
                      {task.status === 'open' && (
                        <button className="v4-btn v4-btn-primary" onClick={() => acceptTask(task.id)}>Accept Task</button>
                      )}
                      {task.status === 'accepted' && (
                        <button className="v4-btn v4-btn-primary" onClick={() => {
                          fetch(`${API_URL}/tasks/${task.id}/start`, { method: 'POST', headers: { Authorization: user.id } })
                            .then(() => fetchTasks())
                        }}>▶️ Start Work</button>
                      )}
                      {task.status === 'in_progress' && (
                        <button className="v4-btn v4-btn-primary" onClick={() => setShowProofSubmit(task.id)}>✓ Submit Proof</button>
                      )}
                      {task.status === 'pending_review' && (
                        <button className="v4-btn v4-btn-secondary" disabled>Waiting for approval...</button>
                      )}
                      {task.status === 'completed' && (
                        <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8 }}>✓ Payment pending</span>
                      )}
                      {task.status === 'paid' && (
                        <span style={{ color: 'var(--orange-600)', display: 'flex', alignItems: 'center', gap: 8 }}>💰 Paid!</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Activity Feed */}
            <ActivityFeed activities={activities} />
          </div>
        )}

        {/* Working Mode: Browse Tab */}
        {!hiringMode && activeTab === 'browse' && (
          <div>
            <h1 className="dashboard-v4-page-title">Browse Workers</h1>

            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>{Icons.search}</span>
                <input
                  type="text"
                  placeholder="Search by name or skill..."
                  className="dashboard-v4-form-input"
                  style={{ paddingLeft: 44 }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="dashboard-v4-form-input dashboard-v4-form-select"
                style={{ width: 180 }}
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
              <div className="dashboard-v4-empty">
                <div className="dashboard-v4-empty-icon">{Icons.humans}</div>
                <p className="dashboard-v4-empty-title">No workers available</p>
                <p className="dashboard-v4-empty-text">Check back later for available humans</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                {humans
                  .filter(h => !searchQuery || h.name?.toLowerCase().includes(searchQuery.toLowerCase()) || h.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
                  .filter(h => !filterCategory || h.skills?.includes(filterCategory))
                  .map(human => (
                  <div key={human.id} className="dashboard-v4-task-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 20 }}>
                        {human.name?.charAt(0) || '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{human.name}</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📍 {human.city || 'Remote'}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: 700, color: 'var(--orange-600)', fontSize: 18 }}>${human.hourly_rate || 25}/hr</p>
                            {human.rating > 0 && (
                              <p style={{ fontSize: 13, color: 'var(--warning)' }}>⭐ {human.rating.toFixed(1)}</p>
                            )}
                          </div>
                        </div>
                        {human.bio && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>{human.bio}</p>}
                        {human.skills && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                            {human.skills.slice(0, 5).map((skill, i) => (
                              <span key={i} style={{ fontSize: 12, background: 'rgba(244, 132, 95, 0.1)', color: 'var(--orange-600)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{human.jobs_completed || 0} jobs completed</span>
                          <button className="v4-btn v4-btn-secondary" onClick={() => {
                            setHiringMode(true)
                            setActiveTab('create')
                          }}>Hire</button>
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
            <h1 className="dashboard-v4-page-title">Earnings</h1>
            <EarningsDashboard user={user} />
          </div>
        )}

        {/* Profile Tab - Updated with Settings */}
        {activeTab === 'profile' && (
          <div>
            <h1 className="dashboard-v4-page-title">Profile</h1>

            <div className="dashboard-v4-form" style={{ maxWidth: 500 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 28 }}>
                  {user?.name?.charAt(0) || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{user?.email}</p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div style={{ marginBottom: 24, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Mode</p>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Switch between working and hiring</p>
                  </div>
                  <span className={hiringMode ? 'v4-badge v4-badge-success' : 'v4-badge v4-badge-orange'}>
                    {hiringMode ? 'Hiring' : 'Working'}
                  </span>
                </div>
                <button className="v4-btn v4-btn-secondary" style={{ width: '100%' }} onClick={toggleHiringMode}>
                  {hiringMode ? '← Switch to Working Mode' : 'Switch to Hiring Mode →'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(26,26,26,0.06)' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Location</span>
                  <span style={{ color: 'var(--text-primary)' }}>{user?.city || 'Not set'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(26,26,26,0.06)' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Hourly Rate</span>
                  <span style={{ color: 'var(--text-primary)' }}>${user?.hourly_rate || 25}/hr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(26,26,26,0.06)' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Travel Radius</span>
                  <span style={{ color: 'var(--text-primary)' }}>{user?.travel_radius || 25} miles</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(26,26,26,0.06)' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Skills</span>
                  <span style={{ color: 'var(--text-primary)' }}>{user?.skills?.join(', ') || 'None'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Jobs Completed</span>
                  <span style={{ color: 'var(--text-primary)' }}>{user?.jobs_completed || 0}</span>
                </div>
              </div>

              <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(26,26,26,0.06)' }}>
                <button className="v4-btn v4-btn-secondary" style={{ width: '100%' }} onClick={() => setActiveTab('settings')}>Edit Profile</button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h1 className="dashboard-v4-page-title">Settings</h1>

            <div className="dashboard-v4-form" style={{ maxWidth: 600, marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>Profile Settings</h2>

              <form onSubmit={async (e) => {
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                    <label className="dashboard-v4-form-label">Full Name</label>
                    <input type="text" name="name" defaultValue={user?.name} className="dashboard-v4-form-input" />
                  </div>
                  <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                    <label className="dashboard-v4-form-label">City</label>
                    <input type="text" name="city" defaultValue={user?.city} className="dashboard-v4-form-input" placeholder="San Francisco" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                    <label className="dashboard-v4-form-label">Hourly Rate ($)</label>
                    <input type="number" name="hourly_rate" defaultValue={user?.hourly_rate || 25} min={5} max={500} className="dashboard-v4-form-input" />
                  </div>
                  <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                    <label className="dashboard-v4-form-label">Travel Radius (miles)</label>
                    <input type="number" name="travel_radius" defaultValue={user?.travel_radius || 25} min={1} max={100} className="dashboard-v4-form-input" />
                  </div>
                </div>

                <div className="dashboard-v4-form-group">
                  <label className="dashboard-v4-form-label">Bio</label>
                  <textarea name="bio" defaultValue={user?.bio || ''} className="dashboard-v4-form-input dashboard-v4-form-textarea" placeholder="Tell agents about yourself..." />
                </div>

                <button type="submit" className="dashboard-v4-form-submit">Save Changes</button>
              </form>
            </div>

            <div className="dashboard-v4-form" style={{ maxWidth: 600, marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>Skills</h2>
              <form onSubmit={async (e) => {
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
                <div className="dashboard-v4-form-group">
                  <input type="text" name="skills" defaultValue={user?.skills?.join(', ') || ''} className="dashboard-v4-form-input" placeholder="delivery, photography, moving, cleaning" />
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>Separate skills with commas</p>
                </div>
                <button type="submit" className="dashboard-v4-form-submit">Update Skills</button>
              </form>
            </div>

            <div className="dashboard-v4-form" style={{ maxWidth: 600 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>Notification Preferences</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: 20, height: 20, borderRadius: 4, accentColor: 'var(--orange-500)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Task assignments</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: 20, height: 20, borderRadius: 4, accentColor: 'var(--orange-500)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Payment notifications</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: 20, height: 20, borderRadius: 4, accentColor: 'var(--orange-500)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Messages from agents</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 20, height: 20, borderRadius: 4, accentColor: 'var(--orange-500)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Marketing & updates</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div>
            <h1 className="dashboard-v4-page-title">Messages</h1>

            <div className="dashboard-v4-messages">
              {/* Conversations List */}
              <div className={`dashboard-v4-conversations ${selectedConversation ? 'hidden md:block' : 'block'}`}>
                {conversations.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>No conversations yet</div>
                ) : (
                  conversations.map(c => (
                    <div
                      key={c.id}
                      className={`dashboard-v4-conversation-item ${selectedConversation === c.id ? 'active' : ''}`}
                      onClick={() => { setSelectedConversation(c.id); fetchMessages(c.id) }}
                    >
                      <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                        {c.other_user?.name?.charAt(0) || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.otherUser?.name || 'Unknown'}</p>
                        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last_message || 'No messages'}</p>
                      </div>
                      {c.unread > 0 && (
                        <span className="dashboard-v4-nav-badge">{c.unread}</span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Messages Thread */}
              <div className={`dashboard-v4-message-thread ${selectedConversation ? 'block' : 'hidden md:flex'}`}>
                {selectedConversation ? (
                  <>
                    {/* Mobile Back Button */}
                    <div style={{ display: 'none', padding: 12, borderBottom: '1px solid rgba(26,26,26,0.06)', alignItems: 'center', gap: 8 }} className="md:hidden">
                      <button onClick={() => setSelectedConversation(null)} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                        ← Back
                      </button>
                    </div>
                    <div className="dashboard-v4-message-list">
                      {messages.map(m => (
                        <div key={m.id} className={`dashboard-v4-message ${m.sender_id === user.id ? 'sent' : 'received'}`}>
                          <p>{m.content}</p>
                          <p style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
                            {new Date(m.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="dashboard-v4-message-input">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="dashboard-v4-form-input"
                        style={{ flex: 1 }}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(e) }}
                      />
                      <button className="v4-btn v4-btn-primary" onClick={sendMessage}>Send</button>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                    Select a conversation to start messaging
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div>
            <h1 className="dashboard-v4-page-title">Notifications</h1>

            {notifications.length === 0 ? (
              <div className="dashboard-v4-empty">
                <div className="dashboard-v4-empty-icon">🔔</div>
                <p className="dashboard-v4-empty-title">No notifications yet</p>
                <p className="dashboard-v4-empty-text">You'll see updates about your tasks here</p>
              </div>
            ) : (
              <div>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`dashboard-v4-notification ${!n.read_at ? 'unread' : ''}`}
                    onClick={() => markNotificationRead(n.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="dashboard-v4-notification-icon">🔔</div>
                    <div className="dashboard-v4-notification-content">
                      <p className="dashboard-v4-notification-title">{n.title}</p>
                      <p className="dashboard-v4-notification-text">{n.message}</p>
                      <p className="dashboard-v4-notification-time">
                        {new Date(n.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
        </div>
      </main>
    </div>
  )
}

function MCPPage() {
  return (
    <div className="mcp-v4">
      <header className="mcp-v4-header">
        <div className="mcp-v4-header-inner">
          <a href="/" className="logo-v4">
            <div className="logo-mark-v4">irl</div>
            <span className="logo-name-v4">irlwork.ai</span>
          </a>
          <a href="/" className="mcp-v4-nav-link">← Home</a>
        </div>
      </header>

      <main className="mcp-v4-main">
        {/* Hero */}
        <div className="mcp-v4-hero">
          <h1>MCP <span>Integration</span></h1>
          <p>
            Connect your AI agent to hire real humans for physical-world tasks. One command install via Model Context Protocol.
          </p>
          <div className="mcp-v4-hero-buttons">
            <a href="#quick-start" className="btn-v4 btn-v4-primary btn-v4-lg">Install Now</a>
            <a href="#tools" className="btn-v4 btn-v4-secondary btn-v4-lg">View Tools</a>
          </div>
        </div>

        {/* Quick Start */}
        <section id="quick-start" className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>⚡</span> Quick Start</h2>

          <div className="mcp-v4-card">
            <h3>1. Install via NPM</h3>
            <p>The fastest way to connect your AI agent. One command, fully authenticated:</p>
            <div className="mcp-v4-code-block">
              <span className="green">$</span> npx -y irlwork-mcp
            </div>
          </div>

          <div className="mcp-v4-card">
            <h3>2. Configure MCP Client</h3>
            <p>Add irlwork to your MCP configuration:</p>
            <div className="mcp-v4-code-block">
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

          <div className="mcp-v4-card">
            <h3>Optional: API Key for Dashboard Access</h3>
            <p>Generate an API key from your dashboard to view analytics and manage payments manually:</p>
            <div className="mcp-v4-code-block">
              <span style={{color: '#8A8A8A'}}># Generate at: dashboard → API Keys</span><br/>
              irl_sk_xxxxxxxxxxxxxxxxxxxxxxxx
            </div>
          </div>
        </section>

        {/* Available Tools */}
        <section id="tools" className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>🛠️</span> Available Tools</h2>

          {/* Search & Discovery */}
          <div style={{marginBottom: '32px'}}>
            <h3 className="mcp-v4-category-title">Search & Discovery</h3>
            <div className="mcp-v4-tools-grid">
              {[
                { name: 'list_humans', desc: 'Search humans by skill, rate, location with pagination' },
                { name: 'get_human', desc: 'Get detailed profile with availability and wallet info' },
                { name: 'list_skills', desc: 'Get all available human skills and categories' },
                { name: 'get_reviews', desc: 'Get reviews and ratings for a specific human' }
              ].map((tool, i) => (
                <div key={i} className="mcp-v4-tool-card">
                  <code>{tool.name}</code>
                  <p>{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <div style={{marginBottom: '32px'}}>
            <h3 className="mcp-v4-category-title">Conversations</h3>
            <div className="mcp-v4-tools-grid">
              {[
                { name: 'start_conversation', desc: 'Start a conversation with a human' },
                { name: 'send_message', desc: 'Send a message in a conversation' },
                { name: 'get_conversation', desc: 'Get conversation with all messages' },
                { name: 'list_conversations', desc: 'List all your conversations' }
              ].map((tool, i) => (
                <div key={i} className="mcp-v4-tool-card">
                  <code>{tool.name}</code>
                  <p>{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div style={{marginBottom: '32px'}}>
            <h3 className="mcp-v4-category-title">Tasks</h3>
            <div className="mcp-v4-tools-grid">
              {[
                { name: 'post_task', desc: 'Create a new task for humans to browse and accept' },
                { name: 'list_tasks', desc: 'List your active and past tasks' },
                { name: 'get_task', desc: 'Get detailed task information' },
                { name: 'update_task', desc: 'Modify or cancel a task' }
              ].map((tool, i) => (
                <div key={i} className="mcp-v4-tool-card">
                  <code>{tool.name}</code>
                  <p>{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payments */}
          <div>
            <h3 className="mcp-v4-category-title">Payments</h3>
            <div className="mcp-v4-tools-grid">
              {[
                { name: 'escrow_deposit', desc: 'Deposit USDC into escrow for a task' },
                { name: 'release_payment', desc: 'Release escrow funds to a human after completion' },
                { name: 'get_escrow_status', desc: 'Check escrow status for a task' }
              ].map((tool, i) => (
                <div key={i} className="mcp-v4-tool-card">
                  <code>{tool.name}</code>
                  <p>{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Usage Examples */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>📝</span> Usage Examples</h2>

          <div className="mcp-v4-card">
            <h3>Search for humans with specific skills</h3>
            <div className="mcp-v4-code-block">
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

          <div className="mcp-v4-card">
            <h3>Create a task</h3>
            <div className="mcp-v4-code-block">
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

          <div className="mcp-v4-card">
            <h3>Release payment after completion</h3>
            <div className="mcp-v4-code-block">
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
        </section>

        {/* Two Ways to Hire */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>🔄</span> Two Ways to Hire</h2>

          <div className="mcp-v4-two-col">
            <div className="mcp-v4-card">
              <h3>💬 Direct Conversation</h3>
              <ol className="mcp-v4-list">
                <li>Use <code>list_humans</code> to find someone</li>
                <li>Call <code>start_conversation</code> to discuss</li>
                <li>Use <code>send_message</code> to negotiate</li>
                <li>Post task with <code>post_task</code></li>
                <li>Human accepts and completes work</li>
                <li>Release payment with <code>release_payment</code></li>
              </ol>
            </div>

            <div className="mcp-v4-card">
              <h3>📋 Post a Task (Bounty)</h3>
              <ol className="mcp-v4-list">
                <li>Call <code>post_task</code> with details</li>
                <li>Humans browse and accept tasks</li>
                <li>Review accepted humans</li>
                <li>Work gets done with proof submission</li>
                <li>Review proof and release payment</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Best Practices */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>✨</span> Best Practices</h2>

          <div className="mcp-v4-two-col">
            <div className="mcp-v4-card">
              <h3>Be Specific</h3>
              <p>Provide detailed task descriptions. Humans work better with clear instructions, location details, and expected outcomes.</p>
            </div>
            <div className="mcp-v4-card">
              <h3>Allow Buffer Time</h3>
              <p>Physical world tasks can be unpredictable. Add extra time for traffic, wait times, and delays.</p>
            </div>
            <div className="mcp-v4-card">
              <h3>Verify Availability</h3>
              <p>Check human availability before committing to tight deadlines. Use <code>get_human</code> for profile info.</p>
            </div>
            <div className="mcp-v4-card">
              <h3>Handle Errors</h3>
              <p>Always check response status. Implement retry logic with exponential backoff on failures.</p>
            </div>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>⚡</span> Rate Limits</h2>
          <div className="mcp-v4-card">
            <div className="mcp-v4-stats">
              <div>
                <div className="mcp-v4-stat-value">100/min</div>
                <div className="mcp-v4-stat-label">GET requests</div>
              </div>
              <div>
                <div className="mcp-v4-stat-value">20/min</div>
                <div className="mcp-v4-stat-label">POST requests</div>
              </div>
              <div>
                <div className="mcp-v4-stat-value">429</div>
                <div className="mcp-v4-stat-label">Rate limit error</div>
              </div>
            </div>
          </div>
        </section>

        {/* Network Info */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>◈</span> Network</h2>
          <div className="mcp-v4-card">
            <div className="mcp-v4-network-card">
              <span className="mcp-v4-network-icon">◈</span>
              <div>
                <h3>Base</h3>
                <p>USDC on Base network</p>
              </div>
            </div>
            <p>All payments are settled in USDC on Base. Fast, low-fee transactions for global accessibility.</p>
          </div>
        </section>

        {/* CTA */}
        <section className="mcp-v4-cta">
          <h2>Ready to integrate?</h2>
          <p>Add irlwork-mcp to your AI agent and start hiring humans today.</p>
          <a href="/auth" className="btn-v4 btn-v4-primary btn-v4-lg">Get Started →</a>
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

        // Check if backend user has complete profile, otherwise merge with cached data
        const cachedUser = localStorage.getItem('user')
        let finalUser = { ...data.user, supabase_user: true }

        // If backend doesn't have city/skills but cached user does, preserve them
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser)
          if (parsed.id === supabaseUser.id) {
            if (!finalUser.city && parsed.city) finalUser.city = parsed.city
            if ((!finalUser.skills || !finalUser.skills.length) && parsed.skills?.length) {
              finalUser.skills = parsed.skills
            }
            // Preserve needs_onboarding=false if it was set in cache
            if (parsed.needs_onboarding === false) {
              finalUser.needs_onboarding = false
            }
          }
        }

        // Save to localStorage for persistence
        localStorage.setItem('user', JSON.stringify(finalUser))
        setUser(finalUser)
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

    // Check if user needs onboarding - only trust the explicit flag
    // Don't re-trigger onboarding based on missing city/skills if user already completed it
    const needsOnboarding = user.needs_onboarding === true
    console.log('[Auth] Needs onboarding:', needsOnboarding, 'user.needs_onboarding:', user.needs_onboarding)

    if (needsOnboarding) {
      return <Onboarding onComplete={handleOnboardingComplete} />
    }

    return <Dashboard user={user} onLogout={logout} />
  }
  
  if (path === '/auth') return <AuthPage />
  if (path === '/mcp') return <MCPPage />
  if (path === '/browse') return <BrowsePage user={user} />

  return <LandingPageV4 />}

export default function AppWrapper() {
  return <App />
}
