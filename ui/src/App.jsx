// irlwork.ai - Modern Clean UI
import React, { useState, useEffect, useRef } from 'react'
import { ToastProvider, useToast } from './context/ToastContext'
import { createClient } from '@supabase/supabase-js'
import EarningsDashboard from './components/EarningsDashboard'
import ModeToggle from './components/ModeToggle'
import UserDropdown from './components/UserDropdown'
import TopFilterBar from './components/TopFilterBar'
import CustomDropdown from './components/CustomDropdown'
import QuickStats from './components/QuickStats'
import EmptyState from './components/EmptyState'
import ActivityFeed from './components/ActivityFeed'
import BrowsePage from './pages/BrowsePage'
import BrowseTasksV2 from './pages/BrowseTasksV2'
import LandingPageV4 from './pages/LandingPageV4'
import AdminDashboard from './pages/AdminDashboard'

// Admin user IDs - must match ADMIN_USER_IDS in backend
const ADMIN_USER_IDS = ['b49dc7ef-38b5-40ce-936b-e5fddebc4cb7']
import CityAutocomplete from './components/CityAutocomplete'

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
  hired: '🤝',
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
  bell: '🔔',
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
    latitude: null,
    longitude: null,
    country: '',
    country_code: '',
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
        latitude: form.latitude,
        longitude: form.longitude,
        country: form.country,
        country_code: form.country_code,
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
            <CityAutocomplete
              value={form.city}
              onChange={(locationData) => setForm({
                ...form,
                city: locationData.city,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                country: locationData.country,
                country_code: locationData.country_code
              })}
              placeholder="Search for your city..."
              className="onboarding-v4-city-input"
            />
            <button
              className="onboarding-v4-btn-next"
              style={{ width: '100%', marginTop: '1rem' }}
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
  const toast = useToast()
  const [proofText, setProofText] = useState('')
  const [files, setFiles] = useState([])
  const [uploadedUrls, setUploadedUrls] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length + files.length > 3) {
      toast.error('Maximum 3 files allowed')
      return
    }
    setFiles(prev => [...prev, ...selected].slice(0, 3))
  }

  const handleSubmit = async () => {
    if (!proofText.trim() && uploadedUrls.length === 0) {
      toast.error('Please provide proof text or upload images')
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

// API Keys Tab Component
function ApiKeysTab({ user }) {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState(null)
  const [copied, setCopied] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(null)
  const [error, setError] = useState(null)
  const [showRevoked, setShowRevoked] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

  const fetchKeys = async () => {
    try {
      const response = await fetch(`${API_URL}/keys`, {
        headers: { 'Authorization': user?.id }
      })
      if (response.ok) {
        const data = await response.json()
        setKeys(data)
      }
    } catch (error) {
      console.error('Error fetching keys:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [user?.id])

  const generateKey = async () => {
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/keys/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': user?.id
        },
        body: JSON.stringify({ name: newKeyName || 'API Key' })
      })
      if (response.ok) {
        const data = await response.json()
        setNewKey(data.api_key)
        fetchKeys()
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || `Failed to generate key (${response.status})`)
        console.error('Generate key error:', response.status, errorData)
      }
    } catch (err) {
      setError('Network error - check if API is running')
      console.error('Error generating key:', err)
    } finally {
      setGenerating(false)
    }
  }

  const revokeKey = async (keyId) => {
    try {
      const response = await fetch(`${API_URL}/keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': user?.id }
      })
      if (response.ok) {
        setConfirmRevoke(null)
        fetchKeys()
      }
    } catch (error) {
      console.error('Error revoking key:', error)
    }
  }

  const rotateKey = async (keyId) => {
    try {
      const response = await fetch(`${API_URL}/keys/${keyId}/rotate`, {
        method: 'POST',
        headers: { 'Authorization': user?.id }
      })
      if (response.ok) {
        const data = await response.json()
        setNewKey(data.api_key)
        setShowModal(true)
        fetchKeys()
      }
    } catch (error) {
      console.error('Error rotating key:', error)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="dashboard-v4-page-title" style={{ marginBottom: 4 }}>API Keys</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Manage API keys for programmatic access to irlwork.ai
          </p>
        </div>
        <button
          className="v4-btn v4-btn-primary"
          onClick={() => { setShowModal(true); setNewKeyName(''); setNewKey(null); setError(null); }}
        >
          + Generate New Key
        </button>
      </div>

      {/* Generate Key Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 500, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {!newKey ? (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Generate New API Key</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                  Give your key a name to help you remember what it's used for.
                </p>
                <input
                  type="text"
                  placeholder="e.g. Production, Development, Trading Bot"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 14,
                    marginBottom: 20
                  }}
                  autoFocus
                />
                {error && (
                  <div style={{
                    background: '#FEE2E2',
                    border: '1px solid #FECACA',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 20,
                    color: '#DC2626',
                    fontSize: 14
                  }}>
                    {error}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    className="v4-btn v4-btn-secondary"
                    onClick={() => { setShowModal(false); setNewKey(null); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="v4-btn v4-btn-primary"
                    onClick={generateKey}
                    disabled={generating}
                  >
                    {generating ? 'Generating...' : 'Generate Key'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, #10B981, #059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <span style={{ fontSize: 28 }}>✓</span>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>API Key Generated</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Copy this key now. You won't be able to see it again.
                  </p>
                </div>

                <div style={{
                  background: '#F8F6F1',
                  border: '1px solid #E5E2DC',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                  position: 'relative'
                }}>
                  <code style={{
                    color: '#1a1a1a',
                    fontSize: 13,
                    wordBreak: 'break-all',
                    display: 'block',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
                    paddingRight: 70,
                    lineHeight: 1.5
                  }}>
                    {newKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey)}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: 12,
                      transform: 'translateY(-50%)',
                      background: copied ? '#10B981' : '#FF6B35',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>

                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 20,
                  display: 'flex',
                  gap: 10
                }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <p style={{ fontSize: 13, color: '#92400E' }}>
                    Make sure to save this key securely. It won't be shown again.
                  </p>
                </div>

                <button
                  className="v4-btn v4-btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => { setShowModal(false); setNewKey(null); }}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {confirmRevoke && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: '#DC2626' }}>Revoke API Key?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
              Are you sure you want to revoke <strong>{confirmRevoke.name}</strong>? Any agents using this key will lose access immediately.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                className="v4-btn v4-btn-secondary"
                onClick={() => setConfirmRevoke(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  background: '#DC2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
                onClick={() => revokeKey(confirmRevoke.id)}
              >
                Revoke Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Toggle */}
      {keys.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {keys.filter(k => k.is_active).length} active key{keys.filter(k => k.is_active).length !== 1 ? 's' : ''}
            {keys.filter(k => !k.is_active).length > 0 && (
              <span> · {keys.filter(k => !k.is_active).length} revoked</span>
            )}
          </div>
          {keys.some(k => !k.is_active) && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={showRevoked}
                onChange={(e) => setShowRevoked(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#FF6B35' }}
              />
              Show revoked keys
            </label>
          )}
        </div>
      )}

      {/* Keys List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
          Loading keys...
        </div>
      ) : keys.length === 0 ? (
        <div className="v4-empty-state" style={{
          background: 'white',
          borderRadius: 16,
          padding: 60,
          textAlign: 'center',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔑</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No API Keys Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            Generate an API key to access irlwork.ai programmatically.
          </p>
          <button
            className="v4-btn v4-btn-primary"
            onClick={() => setShowModal(true)}
          >
            Generate Your First Key
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {keys.filter(key => showRevoked || key.is_active).map(key => (
            <div
              key={key.id}
              style={{
                background: 'white',
                borderRadius: 12,
                padding: 20,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
                opacity: key.is_active ? 1 : 0.6
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>{key.name}</h3>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    background: key.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: key.is_active ? '#059669' : '#DC2626'
                  }}>
                    {key.is_active ? 'Active' : 'Revoked'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>
                    <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                      {key.key_prefix}
                    </code>
                  </span>
                  <span>Created: {formatDate(key.created_at)}</span>
                  <span>Last used: {formatDate(key.last_used_at)}</span>
                </div>
              </div>

              {key.is_active && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => rotateKey(key.id)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-primary)'
                    }}
                  >
                    Rotate
                  </button>
                  <button
                    onClick={() => setConfirmRevoke(key)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#DC2626'
                    }}
                  >
                    Revoke
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Usage Instructions */}
      <div style={{
        marginTop: 32,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 16,
        padding: 24,
        color: 'white'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Using Your API Key</h3>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
          Include your API key in the Authorization header of your requests:
        </p>
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 8,
          padding: 16,
          fontFamily: 'monospace',
          fontSize: 13
        }}>
          <div style={{ color: '#8B8B8B', marginBottom: 4 }}># Post a task</div>
          <div>
            <span style={{ color: '#10B981' }}>curl</span> -X POST https://api.irlwork.ai/api/mcp/tasks \
          </div>
          <div style={{ paddingLeft: 20 }}>
            -H <span style={{ color: '#F4845F' }}>'Authorization: Bearer irl_sk_...'</span> \
          </div>
          <div style={{ paddingLeft: 20 }}>
            -H <span style={{ color: '#F4845F' }}>'Content-Type: application/json'</span> \
          </div>
          <div style={{ paddingLeft: 20 }}>
            -d <span style={{ color: '#F4845F' }}>'{`{"title": "Package Pickup", "budget": 35}`}'</span>
          </div>
        </div>
        <a
          href="/mcp"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 16,
            color: '#F4845F',
            fontSize: 14,
            textDecoration: 'none'
          }}
        >
          View full API documentation →
        </a>
      </div>
    </div>
  )
}

function Dashboard({ user, onLogout, needsOnboarding, onCompleteOnboarding }) {
  const toast = useToast()
  const [hiringMode, setHiringMode] = useState(() => {
    const saved = localStorage.getItem('irlwork_hiringMode')
    return saved === 'true'
  })

  // Read initial tab from URL query param
  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    const savedHiringMode = localStorage.getItem('irlwork_hiringMode') === 'true'

    // Valid tabs for each mode
    const humanTabs = ['tasks', 'browse', 'messages', 'payments', 'profile', 'settings', 'notifications']
    const hiringTabs = ['create', 'posted', 'browse', 'hired', 'messages', 'payments', 'api-keys', 'profile', 'settings', 'notifications']

    if (tabParam) {
      // Map URL-friendly names to internal tab IDs
      const tabMap = {
        'create-task': 'create',
        'my-tasks': savedHiringMode ? 'posted' : 'tasks',
        'browse': 'browse',
        'messages': 'messages',
        'payments': 'payments',
        'api-keys': 'api-keys',
        'hired': 'hired',
        'profile': 'profile',
        'settings': 'settings',
        'notifications': 'notifications'
      }
      const mappedTab = tabMap[tabParam] || tabParam

      if (savedHiringMode && hiringTabs.includes(mappedTab)) return mappedTab
      if (!savedHiringMode && humanTabs.includes(mappedTab)) return mappedTab
    }

    return savedHiringMode ? 'create' : 'tasks'
  }

  const [activeTab, setActiveTabState] = useState(getInitialTab)

  // Helper to update URL query param without page reload
  const updateTabUrl = (tabId) => {
    // Map internal tab IDs to URL-friendly names
    const urlMap = {
      'create': 'create-task',
      'posted': 'my-tasks',
      'tasks': 'my-tasks',
      'browse': 'browse',
      'messages': 'messages',
      'payments': 'payments',
      'api-keys': 'api-keys',
      'hired': 'hired',
      'profile': 'profile',
      'settings': 'settings',
      'notifications': 'notifications'
    }
    const urlTab = urlMap[tabId] || tabId
    const newUrl = `/dashboard?tab=${urlTab}`
    window.history.pushState({}, '', newUrl)
  }

  // Wrapper for setActiveTab that also updates URL
  const setActiveTab = (tabId) => {
    setActiveTabState(tabId)
    updateTabUrl(tabId)
  }
  const [tasks, setTasks] = useState([])
  const [availableTasks, setAvailableTasks] = useState([]) // Tasks available for workers to browse
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
  const [filterCoords, setFilterCoords] = useState({ lat: null, lng: null })
  const [radiusFilter, setRadiusFilter] = useState('50')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProofSubmit, setShowProofSubmit] = useState(null)
  const [showProofReview, setShowProofReview] = useState(null)
  const [activities, setActivities] = useState([])
  const [taskApplications, setTaskApplications] = useState({}) // { taskId: [applications] }

  // Profile edit location state
  const [profileLocation, setProfileLocation] = useState(null)
  const [expandedTask, setExpandedTask] = useState(null) // taskId for viewing applicants
  const [assigningWorker, setAssigningWorker] = useState(null) // loading state

  // Task creation form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    city: '',
    latitude: null,
    longitude: null,
    country: '',
    country_code: ''
  })
  const [creatingTask, setCreatingTask] = useState(false)
  const [createTaskError, setCreateTaskError] = useState('')

  useEffect(() => {
    localStorage.setItem('irlwork_hiringMode', hiringMode)
  }, [hiringMode])

  // Pre-fill location filter with user's city
  useEffect(() => {
    if (user?.city && !locationFilter) {
      setLocationFilter(user.city)
      if (user.latitude && user.longitude) {
        setFilterCoords({ lat: user.latitude, lng: user.longitude })
      }
    }
  }, [user])

  // Handle location selection from filter
  const handleLocationSelect = (locationData) => {
    setLocationFilter(locationData.city)
    setFilterCoords({
      lat: locationData.latitude,
      lng: locationData.longitude
    })
  }

  // Unread counts for badges
  const [unreadMessages, setUnreadMessages] = useState(0)
  const unreadNotifications = notifications.filter(n => !n.read_at).length

  // Notification dropdown state
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)

  // Check if current user is admin
  const isAdmin = user && ADMIN_USER_IDS.includes(user.id)

  // Working mode: My Tasks, Browse Tasks, Messages, Payments
  const humanNav = [
    { id: 'tasks', label: 'My Tasks', icon: Icons.task },
    { id: 'browse', label: 'Browse Tasks', icon: Icons.search },
    { id: 'messages', label: 'Messages', icon: Icons.messages, badge: unreadMessages },
    { id: 'payments', label: 'Payments', icon: Icons.wallet },
  ]

  // Hiring mode: Create Task, My Tasks, Browse Humans, Hired, Messages, Payments, API Keys
  const hiringNav = [
    { id: 'create', label: 'Create Task', icon: Icons.create },
    { id: 'posted', label: 'My Tasks', icon: Icons.task },
    { id: 'browse', label: 'Browse Humans', icon: Icons.humans },
    { id: 'hired', label: 'Hired', icon: Icons.hired },
    { id: 'messages', label: 'Messages', icon: Icons.messages, badge: unreadMessages },
    { id: 'payments', label: 'Payments', icon: Icons.wallet },
    { id: 'api-keys', label: 'API Keys', icon: '🔑' },
  ]

  // Add admin tab if user is admin
  const baseNav = hiringMode ? hiringNav : humanNav
  const navItems = isAdmin ? [...baseNav, { id: 'admin', label: 'Admin', icon: '🛡️' }] : baseNav

  // Mark all notifications as read
  const markAllNotificationsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id)
      for (const id of unreadIds) {
        await markNotificationRead(id)
      }
    } catch (e) {
      console.error('Error marking all notifications read:', e)
    }
  }

  const toggleHiringMode = () => {
    const newHiringMode = !hiringMode
    setHiringMode(newHiringMode)
    const newTab = newHiringMode ? 'create' : 'tasks'
    setActiveTabState(newTab)
    updateTabUrl(newTab)
  }

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam) {
        const tabMap = {
          'create-task': 'create',
          'my-tasks': hiringMode ? 'posted' : 'tasks',
          'browse': 'browse',
          'messages': 'messages',
          'payments': 'payments',
          'api-keys': 'api-keys',
          'hired': 'hired',
          'profile': 'profile',
          'settings': 'settings',
          'notifications': 'notifications'
        }
        const mappedTab = tabMap[tabParam] || tabParam
        setActiveTabState(mappedTab)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [hiringMode])

  useEffect(() => {
    if (hiringMode) {
      fetchPostedTasks()
      fetchHumans() // For hiring mode to browse workers
    } else {
      fetchTasks()
      fetchAvailableTasks() // For working mode to browse available tasks
      fetchWallet()
    }
    fetchConversations()
    fetchNotifications()
    fetchUnreadMessages()
    fetchActivities()
  }, [hiringMode])

  // Re-fetch tasks when location/radius filters change
  useEffect(() => {
    if (!hiringMode) {
      fetchAvailableTasks()
    }
  }, [filterCoords.lat, filterCoords.lng, radiusFilter, filterCategory])

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

  // Fetch available tasks for workers to browse
  const fetchAvailableTasks = async () => {
    try {
      const params = new URLSearchParams()
      if (filterCoords.lat && filterCoords.lng) {
        params.set('user_lat', filterCoords.lat)
        params.set('user_lng', filterCoords.lng)
        params.set('radius_km', radiusFilter)
        if (locationFilter) params.set('city', locationFilter)
      } else if (locationFilter) {
        params.set('city', locationFilter)
      }
      if (filterCategory) params.set('category', filterCategory)

      const url = params.toString() ? `${API_URL}/tasks/available?${params}` : `${API_URL}/tasks/available`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setAvailableTasks(data || [])
      }
    } catch (e) {
      console.log('Could not fetch available tasks')
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
        toast.error(err.error || 'Failed to assign worker')
      }
    } catch (e) {
      toast.error('Network error. Please try again.')
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
          location: taskForm.city,
          latitude: taskForm.latitude,
          longitude: taskForm.longitude,
          country: taskForm.country,
          country_code: taskForm.country_code
        })
      })

      if (res.ok) {
        const newTask = await res.json()
        // Optimistic update - add to list immediately
        setPostedTasks(prev => [newTask, ...prev])
        // Reset form
        setTaskForm({ title: '', description: '', category: '', budget: '', city: '', latitude: null, longitude: null, country: '', country_code: '' })
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
        toast.success('Payment released successfully!')
        fetchPostedTasks()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Unknown error')
      }
    } catch (e) {
      toast.error('Could not release payment')
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
            onClick={() => { setHiringMode(false); setActiveTabState('tasks'); updateTabUrl('tasks') }}
          >
            Working
          </button>
          <button
            className={`dashboard-v4-mode-btn ${hiringMode ? 'active' : ''}`}
            onClick={() => { setHiringMode(true); setActiveTabState('create'); updateTabUrl('create') }}
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

      </aside>

      {/* Main */}
      <main className="dashboard-v4-main">
        {/* Top Header Bar */}
        <div className="dashboard-v4-topbar">
          {/* Left: Mobile menu + Logo */}
          <div className="dashboard-v4-topbar-left">
            <button className="dashboard-v4-menu-btn" onClick={() => setSidebarOpen(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <a href="/dashboard" className="dashboard-v4-topbar-logo">
              <div className="logo-mark-v4">irl</div>
              <span className="logo-name-v4">irlwork.ai</span>
            </a>
          </div>

          {/* Center: Search + Filters */}
          <div className="dashboard-v4-topbar-center">
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
              <CustomDropdown
                value={locationFilter}
                onChange={setLocationFilter}
                options={[
                  { value: '', label: 'All Locations' },
                  { value: 'san-francisco', label: 'San Francisco' },
                  { value: 'new-york', label: 'New York' },
                  { value: 'los-angeles', label: 'Los Angeles' }
                ]}
                placeholder="All Locations"
              />
              <CustomDropdown
                value={filterCategory}
                onChange={setFilterCategory}
                options={[
                  { value: '', label: 'All Categories' },
                  { value: 'delivery', label: 'Delivery' },
                  { value: 'photography', label: 'Photography' },
                  { value: 'errands', label: 'Errands' },
                  { value: 'cleaning', label: 'Cleaning' },
                  { value: 'tech', label: 'Tech' }
                ]}
                placeholder="All Categories"
              />
            </div>
          </div>

          {/* Right: Notifications + User */}
          <div className="dashboard-v4-topbar-right">
            {/* Notifications Bell */}
            <div className="dashboard-v4-notifications-wrapper">
              <button
                className="dashboard-v4-notification-bell"
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadNotifications > 0 && (
                  <span className="dashboard-v4-notification-badge">{unreadNotifications}</span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationDropdownOpen && (
                <div className="dashboard-v4-notification-dropdown">
                  <div className="dashboard-v4-notification-dropdown-header">
                    <span>Notifications</span>
                    {unreadNotifications > 0 && (
                      <button onClick={markAllNotificationsRead} className="dashboard-v4-notification-mark-read">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="dashboard-v4-notification-dropdown-list">
                    {notifications.length === 0 ? (
                      <div className="dashboard-v4-notification-dropdown-empty">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 5).map(n => (
                        <div
                          key={n.id}
                          className={`dashboard-v4-notification-dropdown-item ${!n.read_at ? 'unread' : ''}`}
                          onClick={() => {
                            markNotificationRead(n.id)
                            setNotificationDropdownOpen(false)
                          }}
                        >
                          <div className="dashboard-v4-notification-dropdown-icon">
                            {n.type === 'task_assigned' ? '📋' : n.type === 'payment_received' ? '💰' : n.type === 'message' ? '💬' : '🔔'}
                          </div>
                          <div className="dashboard-v4-notification-dropdown-content">
                            <p className="dashboard-v4-notification-dropdown-title">{n.title}</p>
                            <p className="dashboard-v4-notification-dropdown-time">
                              {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!n.read_at && <div className="dashboard-v4-notification-dropdown-dot" />}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="dashboard-v4-notification-dropdown-footer">
                    <button onClick={() => { setActiveTab('notifications'); setNotificationDropdownOpen(false); }}>
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="dashboard-v4-user-wrapper">
              <button
                className="dashboard-v4-user-trigger"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                <div className="dashboard-v4-user-avatar">
                  {user?.name?.charAt(0) || '?'}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={userDropdownOpen ? 'rotated' : ''}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {userDropdownOpen && (
                <div className="dashboard-v4-user-dropdown">
                  <div className="dashboard-v4-user-dropdown-header">
                    <div className="dashboard-v4-user-dropdown-avatar">
                      {user?.name?.charAt(0) || '?'}
                    </div>
                    <div className="dashboard-v4-user-dropdown-info">
                      <p className="dashboard-v4-user-dropdown-name">{user?.name || 'User'}</p>
                      <p className="dashboard-v4-user-dropdown-email">{user?.email || ''}</p>
                    </div>
                  </div>
                  <div className="dashboard-v4-user-dropdown-divider" />
                  <button className="dashboard-v4-user-dropdown-item" onClick={() => { setActiveTab('profile'); setUserDropdownOpen(false); }}>
                    <span>{Icons.profile}</span> Profile
                  </button>
                  <button className="dashboard-v4-user-dropdown-item" onClick={() => { setActiveTab('settings'); setUserDropdownOpen(false); }}>
                    <span>{Icons.settings}</span> Settings
                  </button>
                  <div className="dashboard-v4-user-dropdown-divider" />
                  <button className="dashboard-v4-user-dropdown-item danger" onClick={onLogout}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
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
                    <CustomDropdown
                      value={taskForm.category}
                      onChange={(val) => setTaskForm(prev => ({ ...prev, category: val }))}
                      options={[
                        { value: '', label: 'Select category' },
                        ...['delivery', 'photography', 'errands', 'cleaning', 'moving', 'tech', 'general'].map(c => ({
                          value: c,
                          label: c.charAt(0).toUpperCase() + c.slice(1)
                        }))
                      ]}
                      placeholder="Select category"
                    />
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
                  <CityAutocomplete
                    value={taskForm.city}
                    onChange={(locationData) => setTaskForm(prev => ({
                      ...prev,
                      city: locationData.city,
                      latitude: locationData.latitude,
                      longitude: locationData.longitude,
                      country: locationData.country,
                      country_code: locationData.country_code
                    }))}
                    placeholder="Where should this be done?"
                    className="dashboard-v4-city-input"
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
                <p className="dashboard-v4-empty-text">Browse available tasks to start earning money</p>

                {/* Suggested Actions */}
                <div className="dashboard-v4-empty-actions">
                  <div className="dashboard-v4-empty-action" onClick={() => setActiveTab('browse')}>
                    <span className="dashboard-v4-empty-action-icon">{Icons.search}</span>
                    <div>
                      <p className="dashboard-v4-empty-action-title">Browse tasks near you</p>
                      <p className="dashboard-v4-empty-action-text">Find tasks in your area</p>
                    </div>
                  </div>
                  <div className="dashboard-v4-empty-action" onClick={() => setActiveTab('profile')}>
                    <span className="dashboard-v4-empty-action-icon">{Icons.profile}</span>
                    <div>
                      <p className="dashboard-v4-empty-action-title">Complete your profile</p>
                      <p className="dashboard-v4-empty-action-text">Add skills and location</p>
                    </div>
                  </div>
                  <div className="dashboard-v4-empty-action" onClick={() => setActiveTab('payments')}>
                    <span className="dashboard-v4-empty-action-icon">{Icons.wallet}</span>
                    <div>
                      <p className="dashboard-v4-empty-action-title">Set up your wallet</p>
                      <p className="dashboard-v4-empty-action-text">Get paid in USDC</p>
                    </div>
                  </div>
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

        {/* Working Mode: Browse Tasks Tab - Shows available tasks to claim */}
        {!hiringMode && activeTab === 'browse' && (
          <BrowseTasksV2
            user={user}
            initialLocation={{
              lat: filterCoords?.lat || user?.latitude,
              lng: filterCoords?.lng || user?.longitude,
              city: locationFilter || user?.city
            }}
            initialRadius={radiusFilter || '25'}
          />
        )}

        {/* Hiring Mode: Browse Humans Tab - Shows available workers */}
        {hiringMode && activeTab === 'browse' && (
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
              <div style={{ width: 180 }}>
                <CustomDropdown
                  value={filterCategory}
                  onChange={setFilterCategory}
                  options={[
                    { value: '', label: 'All Skills' },
                    ...['delivery', 'pickup', 'errands', 'dog_walking', 'cleaning', 'moving', 'general'].map(c => ({
                      value: c,
                      label: c.replace('_', ' ')
                    }))
                  ]}
                  placeholder="All Skills"
                />
              </div>
            </div>

            {humans.length === 0 ? (
              <div className="dashboard-v4-empty">
                <div className="dashboard-v4-empty-icon">{Icons.humans}</div>
                <p className="dashboard-v4-empty-title">No workers found</p>
                <p className="dashboard-v4-empty-text">Try adjusting your filters or check back later</p>
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
                          <button className="v4-btn v4-btn-primary" onClick={() => setActiveTab('create')}>
                            Create Task
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hiring Mode: API Keys Tab */}
        {hiringMode && activeTab === 'api-keys' && (
          <ApiKeysTab user={user} />
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
                  const locationData = profileLocation || {}
                  const res = await fetch(`${API_URL}/humans/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: user.id },
                    body: JSON.stringify({
                      name: formData.get('name'),
                      city: locationData.city || user?.city,
                      latitude: locationData.latitude ?? user?.latitude,
                      longitude: locationData.longitude ?? user?.longitude,
                      country: locationData.country || user?.country,
                      country_code: locationData.country_code || user?.country_code,
                      hourly_rate: parseInt(formData.get('hourly_rate')) || 25,
                      bio: formData.get('bio'),
                      travel_radius: parseInt(formData.get('travel_radius')) || 25
                    })
                  })
                  if (res.ok) {
                    const data = await res.json()
                    // Update localStorage with new user data
                    if (data.user) {
                      const updatedUser = { ...data.user, skills: JSON.parse(data.user.skills || '[]'), supabase_user: true }
                      localStorage.setItem('user', JSON.stringify(updatedUser))
                    }
                    toast.success('Profile updated!')
                    setProfileLocation(null)
                    setTimeout(() => window.location.reload(), 1000)
                  } else {
                    const err = await res.json()
                    toast.error(err.error || 'Unknown error')
                  }
                } catch (err) {
                  toast.error('Error saving profile')
                }
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                    <label className="dashboard-v4-form-label">Full Name</label>
                    <input type="text" name="name" defaultValue={user?.name} className="dashboard-v4-form-input" />
                  </div>
                  <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                    <label className="dashboard-v4-form-label">City</label>
                    <CityAutocomplete
                      value={profileLocation?.city || user?.city || ''}
                      onChange={setProfileLocation}
                      placeholder="San Francisco"
                      className="dashboard-v4-city-input"
                    />
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
                    const data = await res.json()
                    // Update localStorage with new user data
                    if (data.user) {
                      const updatedUser = { ...data.user, skills: JSON.parse(data.user.skills || '[]'), supabase_user: true }
                      localStorage.setItem('user', JSON.stringify(updatedUser))
                    }
                    toast.success('Skills updated!')
                    setTimeout(() => window.location.reload(), 1000)
                  } else {
                    const err = await res.json()
                    toast.error(err.error || 'Unknown error')
                  }
                } catch (err) {
                  toast.error('Error saving skills')
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

        {/* Admin Tab - Only visible to admins */}
        {activeTab === 'admin' && isAdmin && (
          <div>
            <AdminDashboard user={user} />
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

// Task Detail Page - shareable link for individual tasks
function TaskDetailPage({ taskId, user, onLogout }) {
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const headers = user ? { Authorization: user.id } : {}
        const res = await fetch(`${API_URL}/tasks/${taskId}`, { headers })
        if (res.ok) {
          const data = await res.json()
          setTask(data)
        } else {
          setError('Task not found')
        }
      } catch (e) {
        setError('Failed to load task')
      } finally {
        setLoading(false)
      }
    }
    fetchTask()
  }, [taskId, user])

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Open',
      assigned: 'Assigned',
      accepted: 'Accepted',
      in_progress: 'In Progress',
      pending_review: 'Pending Review',
      completed: 'Completed',
      paid: 'Paid',
      cancelled: 'Cancelled'
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="landing-v4" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading task...</p>
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="landing-v4" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Task Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{error || 'This task may have been removed or doesn\'t exist.'}</p>
          <a href="/dashboard" className="v4-btn v4-btn-primary">Go to Dashboard</a>
        </div>
      </div>
    )
  }

  return (
    <div className="landing-v4">
      {/* Navbar */}
      <nav className="navbar-v4">
        <a href="/" className="logo-v4">
          <div className="logo-mark-v4">irl</div>
          <span className="logo-name-v4">irlwork.ai</span>
        </a>
        <div className="nav-links-v4">
          {user ? (
            <a href="/dashboard" className="nav-link-v4">Dashboard</a>
          ) : (
            <a href="/auth" className="v4-btn v4-btn-primary v4-btn-sm">Sign In</a>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 'calc(60px + 40px) 20px 40px' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 24 }}>
          <a href="/dashboard?tab=browse" style={{ color: 'var(--orange-600)', fontSize: 14, textDecoration: 'none' }}>
            ← Back to Tasks
          </a>
        </div>

        {/* Task Card */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 32, border: '1px solid rgba(26,26,26,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <span className={`dashboard-v4-task-status ${task.status === 'open' ? 'open' : task.status === 'in_progress' ? 'in-progress' : task.status === 'completed' || task.status === 'paid' ? 'completed' : 'pending'}`}>
                {getStatusLabel(task.status)}
              </span>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginTop: 12 }}>{task.title}</h1>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--orange-600)' }}>${task.budget || 0}</div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
            {task.description || 'No description provided.'}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14 }}>
              📂 {task.category || 'General'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14 }}>
              📍 {task.city || 'Remote'}
            </span>
            {task.deadline && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14 }}>
                ⏰ {new Date(task.deadline).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Posted by */}
          {task.agent && (
            <div style={{ borderTop: '1px solid rgba(26,26,26,0.08)', paddingTop: 24 }}>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Posted by</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                  {task.agent.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{task.agent.name || 'AI Agent'}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Posted {new Date(task.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {task.status === 'open' && user && (
            <div style={{ borderTop: '1px solid rgba(26,26,26,0.08)', paddingTop: 24, marginTop: 24 }}>
              <a href={`/dashboard?tab=browse`} className="v4-btn v4-btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                Apply for This Task
              </a>
            </div>
          )}

          {!user && task.status === 'open' && (
            <div style={{ borderTop: '1px solid rgba(26,26,26,0.08)', paddingTop: 24, marginTop: 24 }}>
              <a href="/auth" className="v4-btn v4-btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                Sign In to Apply
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MCPPage() {
  const [user, setUser] = useState(null)
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)

  const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          // Fetch API keys
          const response = await fetch(`${API_URL}/keys`, {
            headers: { 'Authorization': session.user.id }
          })
          if (response.ok) {
            const data = await response.json()
            setKeys(data.filter(k => k.is_active))
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

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
            Connect your AI agent to hire real humans for physical-world tasks. No browser needed — register and get your API key with a single curl command.
          </p>
          <div className="mcp-v4-hero-buttons">
            <a href="#headless-setup" className="btn-v4 btn-v4-primary btn-v4-lg">Get API Key</a>
            <a href="#tools" className="btn-v4 btn-v4-secondary btn-v4-lg">View Tools</a>
          </div>
        </div>

        {/* Headless Setup - NEW SECTION */}
        <section id="headless-setup" className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>🤖</span> Headless Agent Setup</h2>
          <p style={{ color: '#666', marginBottom: 24, fontSize: 15 }}>
            Register your AI agent and get an API key without ever touching a browser. Perfect for automated deployments.
          </p>

          <div className="mcp-v4-card">
            <h3>1. Register Your Agent (One-Time)</h3>
            <p>Send a POST request to create your agent account and receive your API key:</p>
            <div className="mcp-v4-code-block">
              <pre style={{ fontSize: 13 }}>{`curl -X POST https://api.irlwork.ai/api/auth/register-agent \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "bot@example.com",
    "password": "secure_password_123",
    "agent_name": "My Trading Bot"
  }'`}</pre>
            </div>
            <p style={{ color: '#666', fontSize: 13, marginTop: 12 }}>Response:</p>
            <div className="mcp-v4-code-block" style={{ background: '#0d1117' }}>
              <pre style={{ fontSize: 13, color: '#7ee787' }}>{`{
  "user_id": "abc123...",
  "agent_name": "My Trading Bot",
  "api_key": "irl_sk_a3b2c1d4e5f6...",
  "message": "Save this API key — it won't be shown again."
}`}</pre>
            </div>
          </div>

          <div className="mcp-v4-card">
            <h3>2. Post a Task</h3>
            <p>Use your API key to post tasks via the MCP endpoint:</p>
            <div className="mcp-v4-code-block">
              <pre style={{ fontSize: 13 }}>{`curl -X POST https://api.irlwork.ai/api/mcp \\
  -H 'Authorization: Bearer irl_sk_a3b2c1d4e5f6...' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "method": "post_task",
    "params": {
      "title": "Package Pickup",
      "description": "Pick up package from 123 Main St",
      "category": "delivery",
      "location": "San Francisco, CA",
      "budget_max": 35
    }
  }'`}</pre>
            </div>
          </div>

          <div className="mcp-v4-card">
            <h3>3. Check Task Status</h3>
            <p>Monitor your tasks and get updates:</p>
            <div className="mcp-v4-code-block">
              <pre style={{ fontSize: 13 }}>{`curl https://api.irlwork.ai/api/mcp \\
  -H 'Authorization: Bearer irl_sk_a3b2c1d4e5f6...' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "method": "get_task_status",
    "params": { "task_id": "TASK_ID" }
  }'`}</pre>
            </div>
          </div>

          {/* Dynamic API Key Display */}
          <div className="mcp-v4-card" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white' }}>
            <h3 style={{ color: 'white' }}>🔑 Your API Keys</h3>
            {loading ? (
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>Loading...</p>
            ) : user ? (
              <div>
                {keys.length > 0 ? (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>Your active API keys:</p>
                    {keys.map(key => (
                      <div key={key.id} style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '8px 12px',
                        borderRadius: 6,
                        marginBottom: 8,
                        fontFamily: 'monospace',
                        fontSize: 14,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ color: '#10B981' }}>{key.key_prefix}</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{key.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>No API keys yet.</p>
                )}
                <a
                  href="/dashboard"
                  className="btn-v4 btn-v4-primary"
                  onClick={() => localStorage.setItem('irlwork_hiringMode', 'true')}
                >
                  Manage API Keys →
                </a>
              </div>
            ) : (
              <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
                  Sign up to generate your API key, or use the headless registration above.
                </p>
                <a href="/auth" className="btn-v4 btn-v4-primary">
                  Sign Up →
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Quick Start - MCP */}
        <section id="quick-start" className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>⚡</span> MCP Installation</h2>

          <div className="mcp-v4-card">
            <h3>Install via NPM</h3>
            <p>For MCP-compatible AI agents (Claude, etc.), install the irlwork MCP server:</p>
            <div className="mcp-v4-code-block">
              <span className="green">$</span> npx -y irlwork-mcp
            </div>
          </div>

          <div className="mcp-v4-card">
            <h3>Configure MCP Client</h3>
            <p>Add irlwork to your MCP configuration:</p>
            <div className="mcp-v4-code-block">
              <pre>{`{
  "mcpServers": {
    "irlwork": {
      "command": "npx",
      "args": ["-y", "irlwork-mcp"],
      "env": {
        "IRLWORK_API_KEY": "irl_sk_your_key_here"
      }
    }
  }
}`}</pre>
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

      {/* Footer */}
      <footer className="footer-v4">
        <div className="footer-v4-inner">
          <div className="footer-v4-grid">
            <div className="footer-v4-brand">
              <a href="/" className="footer-v4-logo">
                <div className="footer-v4-logo-mark">irl</div>
                <span className="footer-v4-logo-name">irlwork.ai</span>
              </a>
              <p className="footer-v4-tagline">
                AI agents create work. Humans get paid.
              </p>
              <div className="footer-v4-social">
                <a
                  href="https://x.com/irlworkai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-v4-social-link"
                  aria-label="Follow us on X"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="footer-v4-column-title">Platform</h4>
              <div className="footer-v4-links">
                <a href="/dashboard" className="footer-v4-link">Browse Tasks</a>
                <a href="/auth" className="footer-v4-link">Sign Up</a>
                <a href="/browse" className="footer-v4-link">Browse Humans</a>
              </div>
            </div>

            <div>
              <h4 className="footer-v4-column-title">For Agents</h4>
              <div className="footer-v4-links">
                <a href="/mcp" className="footer-v4-link">API Docs</a>
                <a href="/mcp" className="footer-v4-link">MCP Protocol</a>
                <a href="/mcp" className="footer-v4-link">Integration</a>
              </div>
            </div>
          </div>

          <div className="footer-v4-bottom">
            <p className="footer-v4-copyright">© 2026 irlwork.ai</p>
            <div className="footer-v4-legal">
              <a href="/privacy" className="footer-v4-legal-link">Privacy</a>
              <a href="/terms" className="footer-v4-legal-link">Terms</a>
              <a href="/security" className="footer-v4-legal-link">Security</a>
            </div>
          </div>
        </div>
      </footer>
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
        console.log('[Auth] User found in DB:', data.user?.email, 'needs_onboarding:', data.user?.needs_onboarding)

        // Check if backend user has complete profile, otherwise merge with cached data
        const cachedUser = localStorage.getItem('user')
        let finalUser = { ...data.user, supabase_user: true }

        // If backend doesn't have city/skills but cached user does, preserve them
        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser)
            if (parsed.id === supabaseUser.id) {
              console.log('[Auth] Cache found, needs_onboarding:', parsed.needs_onboarding)
              if (!finalUser.city && parsed.city) finalUser.city = parsed.city
              if ((!finalUser.skills || !finalUser.skills.length) && parsed.skills?.length) {
                finalUser.skills = parsed.skills
              }
              // IMPORTANT: Always trust cache's needs_onboarding=false over backend
              // This handles the case where backend update failed but onboarding completed
              if (parsed.needs_onboarding === false) {
                console.log('[Auth] Overriding needs_onboarding to false from cache')
                finalUser.needs_onboarding = false
              }
            }
          } catch (e) {
            console.error('[Auth] Failed to parse cached user:', e)
          }
        }

        // If user has city, they've completed onboarding - force needs_onboarding to false
        if (finalUser.city && finalUser.needs_onboarding !== false) {
          console.log('[Auth] User has city, forcing needs_onboarding to false')
          finalUser.needs_onboarding = false
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

    // Build the complete user object with all profile data
    const updatedUser = {
      ...user,
      ...profile,
      needs_onboarding: false,
      supabase_user: true
    }

    try {
      // First try to register the user in our backend
      const registerRes = await fetch(`${API_URL}/auth/register/human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          city: profile.city,
          latitude: profile.latitude,
          longitude: profile.longitude,
          country: profile.country,
          country_code: profile.country_code,
          hourly_rate: profile.hourly_rate,
          skills: profile.skills,
          travel_radius: profile.travel_radius,
          role: 'human'
        })
      })

      if (registerRes.ok) {
        const data = await registerRes.json()
        // Ensure needs_onboarding is false in the saved user
        const finalUser = { ...data.user, supabase_user: true, needs_onboarding: false }
        console.log('[Onboarding] Register success, saving user:', finalUser)
        localStorage.setItem('user', JSON.stringify(finalUser))
        setUser(finalUser)
        window.location.href = '/dashboard'
        return
      }

      console.log('[Onboarding] Register returned non-ok, trying profile update')

      // Fallback: update profile directly (for existing users)
      const res = await fetch(`${API_URL}/humans/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({
          name: user.name,
          city: profile.city,
          latitude: profile.latitude,
          longitude: profile.longitude,
          country: profile.country,
          country_code: profile.country_code,
          hourly_rate: profile.hourly_rate,
          skills: profile.skills,
          travel_radius: profile.travel_radius
        })
      })

      if (res.ok) {
        const data = await res.json()
        // Ensure needs_onboarding is false in the saved user
        const finalUser = { ...data.user, supabase_user: true, needs_onboarding: false }
        console.log('[Onboarding] Profile update success, saving user:', finalUser)
        localStorage.setItem('user', JSON.stringify(finalUser))
        setUser(finalUser)
        window.location.href = '/dashboard'
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('[Onboarding] Profile update failed:', errorData)
        throw new Error(errorData.error || 'Failed to save profile')
      }
    } catch (e) {
      console.error('[Onboarding] Failed:', e)
      // Save to localStorage with needs_onboarding: false so we don't loop
      console.log('[Onboarding] Saving fallback user to localStorage:', updatedUser)
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

  // Task detail route - /tasks/:id
  if (path.startsWith('/tasks/')) {
    const taskId = path.split('/tasks/')[1]
    if (taskId) {
      return <TaskDetailPage taskId={taskId} user={user} onLogout={logout} />
    }
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
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  )
}
