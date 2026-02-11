// irlwork.ai - Modern Clean UI
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { ToastProvider, useToast } from './context/ToastContext'
import { createClient } from '@supabase/supabase-js'
import ErrorBoundary from './components/ErrorBoundary'
import EarningsDashboard from './components/EarningsDashboard'
import ModeToggle from './components/ModeToggle'
import UserDropdown from './components/UserDropdown'
import TopFilterBar from './components/TopFilterBar'
import CustomDropdown from './components/CustomDropdown'
import QuickStats from './components/QuickStats'
import EmptyState from './components/EmptyState'
const BrowsePage = lazy(() => import('./pages/BrowsePage'))
const HumanProfilePage = lazy(() => import('./pages/HumanProfilePage'))
const BrowseTasksV2 = lazy(() => import('./pages/BrowseTasksV2'))
const MyTasksPage = lazy(() => import('./pages/MyTasksPage'))
import LandingPageV4 from './pages/LandingPageV4'
import NotFoundPage from './pages/NotFoundPage'
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'))
import DisputePanel from './components/DisputePanel'
import HumanProfileCard from './components/HumanProfileCard'
import HumanProfileModal from './components/HumanProfileModal'
import FeedbackButton from './components/FeedbackButton'
const StripeProvider = lazy(() => import('./components/StripeProvider'))
const PaymentMethodForm = lazy(() => import('./components/PaymentMethodForm'))
const PaymentMethodList = lazy(() => import('./components/PaymentMethodList'))
import { SocialIconsRow, PLATFORMS, PLATFORM_ORDER } from './components/SocialIcons'

import CityAutocomplete from './components/CityAutocomplete'
import { TASK_CATEGORIES } from './components/CategoryPills'
import { Copy, Check } from 'lucide-react'
import StandaloneTaskDetailPage from './pages/TaskDetailPage'

// Lightweight error boundary for individual dashboard tabs — prevents one tab crash from killing the entire dashboard
class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('[TabError]', error, errorInfo?.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>This section encountered an error</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>Try switching to another tab or refreshing the page.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="v4-btn v4-btn-secondary"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqoxllqofxbcwxskguuj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxb3hsbHFvZnhiY3d4c2tndXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE5MjUsImV4cCI6MjA4NTc1NzkyNX0.kUi4_yHpg3H3rBUhi2L9a0KdcUQoYbiCC6hyPj-A0Yg'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Safe no-op channel for when supabase is null
const noopChannel = { on: () => noopChannel, subscribe: () => noopChannel }
const safeSupabase = {
  channel: (...args) => supabase ? supabase.channel(...args) : noopChannel,
  removeChannel: (...args) => supabase ? supabase.removeChannel(...args) : undefined,
}

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

import { fixAvatarUrl } from './utils/avatarUrl'

// Only log diagnostics in development
const debug = import.meta.env.DEV ? console.log.bind(console) : () => {}

// Safely handle JSONB values that may already be parsed arrays or still be JSON strings
const safeArr = v => { if (Array.isArray(v)) return v; if (!v) return []; try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }

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
// Onboarding skill categories (exclude "All" filter option)
const ONBOARDING_CATEGORIES = TASK_CATEGORIES.filter(c => c.value !== '')

function Onboarding({ onComplete, user }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    city: '',
    latitude: null,
    longitude: null,
    country: '',
    country_code: '',
    selectedCategories: [],
    otherSkills: '',
    bio: '',
    travel_radius: 10,
    hourly_rate: 25
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nearbyTasks, setNearbyTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  const userName = user?.name?.split(' ')[0] || 'there'
  const userAvatar = user?.avatar_url

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  // Fetch nearby tasks after city selection
  const fetchNearbyTasks = async (lat, lng, city) => {
    setLoadingTasks(true)
    try {
      const params = new URLSearchParams()
      if (lat && lng) {
        params.set('user_lat', lat)
        params.set('user_lng', lng)
        params.set('radius_km', '80')
      } else if (city) {
        params.set('city', city)
      }
      const res = await fetch(`${API_URL}/tasks/available?${params}`)
      if (res.ok) {
        const data = await res.json()
        setNearbyTasks((data || []).slice(0, 3))
      }
    } catch (e) {
      // Silently fail - task preview is optional
    } finally {
      setLoadingTasks(false)
    }
  }

  const toggleCategory = (value) => {
    setForm(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(value)
        ? prev.selectedCategories.filter(c => c !== value)
        : [...prev.selectedCategories, value]
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      // Combine selected categories with any freeform "other" skills
      const skills = [
        ...form.selectedCategories,
        ...form.otherSkills.split(',').map(s => s.trim()).filter(Boolean)
      ]
      await onComplete({
        city: form.city,
        latitude: form.latitude,
        longitude: form.longitude,
        country: form.country,
        country_code: form.country_code,
        skills,
        bio: form.bio,
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
        {/* Header with greeting and optional avatar */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {userAvatar && (
            <img
              src={userAvatar}
              alt=""
              style={{ width: 56, height: 56, borderRadius: '50%', marginBottom: 8, objectFit: 'cover' }}
            />
          )}
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Hey {userName}, let's set up your profile
          </p>
        </div>

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
              onChange={(locationData) => {
                setForm({
                  ...form,
                  city: locationData.city,
                  latitude: locationData.latitude,
                  longitude: locationData.longitude,
                  country: locationData.country,
                  country_code: locationData.country_code
                })
                fetchNearbyTasks(locationData.latitude, locationData.longitude, locationData.city)
              }}
              placeholder="Search for your city..."
              className="onboarding-v4-city-input"
            />

            {/* Task preview after city selection */}
            {form.city && (
              <div style={{ marginTop: '1rem' }}>
                {loadingTasks ? (
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    Checking for tasks near {form.city}...
                  </p>
                ) : nearbyTasks.length > 0 ? (
                  <div>
                    <p style={{ fontSize: 13, color: '#10B981', fontWeight: 500, marginBottom: 8 }}>
                      {nearbyTasks.length} task{nearbyTasks.length !== 1 ? 's' : ''} near {form.city} — complete setup to apply
                    </p>
                    {nearbyTasks.map((task, i) => (
                      <div key={task.id || i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8,
                        marginBottom: 4, fontSize: 13
                      }}>
                        <span style={{ color: 'var(--text-primary)' }}>{task.title}</span>
                        <span style={{ color: '#10B981', fontWeight: 600 }}>${task.budget}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    No tasks near {form.city} yet — be one of the first workers in your area
                  </p>
                )}
              </div>
            )}

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

        {/* Step 2: Skills (Category Pills) */}
        {step === 2 && (
          <div>
            <h1 className="onboarding-v4-title">What can you help with?</h1>
            <p className="onboarding-v4-subtitle">Select the categories that match your skills</p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12
            }}>
              {ONBOARDING_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 10,
                    border: form.selectedCategories.includes(cat.value) ? '2px solid #10B981' : '2px solid rgba(0,0,0,0.12)',
                    background: form.selectedCategories.includes(cat.value) ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.03)',
                    color: form.selectedCategories.includes(cat.value) ? '#10B981' : '#3d3d3d',
                    cursor: 'pointer', fontSize: 14, transition: 'all 0.15s',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: 18 }}>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Other skills (comma separated, optional)"
              value={form.otherSkills}
              onChange={e => setForm({ ...form, otherSkills: e.target.value })}
              className="onboarding-v4-input"
              style={{ marginTop: 4 }}
            />
            <div className="onboarding-v4-buttons">
              <button className="onboarding-v4-btn-back" onClick={() => setStep(1)}>Back</button>
              <button className="onboarding-v4-btn-next" onClick={() => setStep(3)}>Continue</button>
            </div>
          </div>
        )}

        {/* Step 3: Bio */}
        {step === 3 && (
          <div>
            <h1 className="onboarding-v4-title">Tell agents about yourself</h1>
            <p className="onboarding-v4-subtitle">A short bio helps you stand out and get more task offers</p>
            <textarea
              placeholder="e.g. Experienced handyman with 5 years of home repair work. Reliable and detail-oriented."
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              className="onboarding-v4-input"
              style={{ minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
              autoFocus
            />
            <p className="onboarding-v4-hint">2-3 sentences about your experience (optional but recommended)</p>
            <div className="onboarding-v4-buttons">
              <button className="onboarding-v4-btn-back" onClick={() => setStep(2)}>Back</button>
              <button className="onboarding-v4-btn-next" onClick={() => setStep(4)}>Continue</button>
            </div>
          </div>
        )}

        {/* Step 4: Travel Radius + Hourly Rate */}
        {step === 4 && (
          <div>
            <h1 className="onboarding-v4-title">Almost done!</h1>
            <p className="onboarding-v4-subtitle">Set your travel distance and hourly rate</p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                How far can you travel?
              </label>
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
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Minimum hourly rate
              </label>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(26, 26, 26, 0.1)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                transition: 'all var(--duration-fast)'
              }}>
                <span style={{
                  padding: '16px 14px', fontSize: 16, fontWeight: 600,
                  color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)',
                  borderRight: '1px solid rgba(26, 26, 26, 0.08)'
                }}>$</span>
                <input
                  type="number"
                  placeholder="25"
                  value={form.hourly_rate}
                  onChange={e => setForm({ ...form, hourly_rate: parseInt(e.target.value) || 0 })}
                  style={{
                    flex: 1, padding: '16px 14px', border: 'none', background: 'transparent',
                    fontSize: 15, color: 'var(--text-primary)', outline: 'none',
                    fontFamily: 'var(--font-body)'
                  }}
                />
                <span style={{
                  padding: '16px 14px', fontSize: 13, color: 'var(--text-tertiary)'
                }}>per hour</span>
              </div>
            </div>

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

function AuthPage({ onLogin, onNavigate }) {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorModal, setErrorModal] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', name: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!supabase) {
      setError('Authentication service not configured')
      setLoading(false)
      return
    }

    try {
      const { error } = isLogin
        ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        : await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: { data: { name: form.name } }
          })

      if (error) throw error
      // Don't navigate here — the parent App's onAuthStateChange will detect
      // the new session and redirect from /auth to /dashboard automatically.
      // This avoids a full page reload on mobile.
      if (onNavigate) onNavigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    if (!supabase) {
      setError('Authentication service not configured')
      setLoading(false)
      return
    }
    try {
      debug('[Auth] Starting Google OAuth...')
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
      
      debug('[Auth] OAuth initiated successfully')
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
    if (hash.includes('access_token') && supabase) {
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
          
          debug('[Auth] Session set successfully')
          window.history.replaceState({}, document.title, window.location.pathname)
          // Parent App's onAuthStateChange handles the redirect — no full page reload
          if (onNavigate) onNavigate('/dashboard')
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

function Dashboard({ user, onLogout, needsOnboarding, onCompleteOnboarding, initialMode }) {
  const toast = useToast()
  const [hiringMode, setHiringMode] = useState(() => {
    if (initialMode) return initialMode === 'hiring'
    const saved = localStorage.getItem('irlwork_hiringMode')
    return saved === 'true'
  })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [humansSubTab, setHumansSubTab] = useState('browse')
  const [tasksSubTab, setTasksSubTab] = useState('tasks')

  // Read initial tab from URL query param
  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    // Derive mode from URL path, fallback to localStorage
    const isHiringFromUrl = window.location.pathname === '/dashboard/hiring'

    // Valid tabs for each mode
    const humanTabs = ['tasks', 'browse', 'messages', 'payments', 'profile', 'settings', 'notifications']
    const hiringTabs = ['posted', 'browse', 'messages', 'payments', 'profile', 'settings', 'notifications']

    if (tabParam) {
      // Map URL-friendly names to internal tab IDs
      const tabMap = {
        'create-task': 'posted',
        'my-tasks': isHiringFromUrl ? 'posted' : 'tasks',
        'browse': 'browse',
        'messages': 'messages',
        'payments': 'payments',
        'api-keys': 'settings',
        'hired': 'browse',
        'profile': 'profile',
        'settings': 'settings',
        'notifications': 'notifications'
      }
      const mappedTab = tabMap[tabParam] || tabParam

      if (isHiringFromUrl && hiringTabs.includes(mappedTab)) return mappedTab
      if (!isHiringFromUrl && humanTabs.includes(mappedTab)) return mappedTab
    }

    return isHiringFromUrl ? 'posted' : 'tasks'
  }

  const [activeTab, setActiveTabState] = useState(getInitialTab)
  const [settingsTab, setSettingsTab] = useState('profile')

  // Helper to update URL query param without page reload
  const updateTabUrl = (tabId, mode) => {
    // Map internal tab IDs to URL-friendly names
    const urlMap = {
      'posted': 'my-tasks',
      'tasks': 'my-tasks',
      'browse': 'browse',
      'messages': 'messages',
      'payments': 'payments',
      'profile': 'profile',
      'settings': 'settings',
      'notifications': 'notifications'
    }
    const urlTab = urlMap[tabId] || tabId
    const modeSegment = (mode !== undefined ? mode : hiringMode) ? 'hiring' : 'working'
    const newUrl = `/dashboard/${modeSegment}?tab=${urlTab}`
    window.history.pushState({}, '', newUrl)
  }

  // Wrapper for setActiveTab that also updates URL
  const setActiveTab = (tabId) => {
    setActiveTabState(tabId)
    updateTabUrl(tabId)
  }
  const [tasks, setTasks] = useState([])
  const [availableTasks, setAvailableTasks] = useState([]) // Tasks available for humans to browse
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
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [showProofSubmit, setShowProofSubmit] = useState(null)
  const [showProofReview, setShowProofReview] = useState(null)
  const [taskApplications, setTaskApplications] = useState({}) // { taskId: [applications] }

  // Profile edit location state
  const [profileLocation, setProfileLocation] = useState(null)
  const [skillsList, setSkillsList] = useState(user?.skills || [])
  const [newSkillInput, setNewSkillInput] = useState('')
  const [languagesList, setLanguagesList] = useState(user?.languages || [])
  const [newLanguageInput, setNewLanguageInput] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef(null)
  const [expandedTask, setExpandedTask] = useState(null) // taskId for viewing applicants
  const [assigningHuman, setAssigningHuman] = useState(null) // loading state
  const [expandedHumanId, setExpandedHumanId] = useState(null) // expanded profile modal

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
    country_code: '',
    is_remote: false,
    duration_hours: '',
    deadline: '',
    requirements: ''
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

  // Check if current user is admin (from API profile response)
  const isAdmin = user && user.type === 'admin'

  // Working mode: My Tasks, Browse Tasks, Messages, Payments
  const humanNav = [
    { id: 'tasks', label: 'My Tasks', icon: Icons.task },
    { id: 'browse', label: 'Browse Tasks', icon: Icons.search },
    { id: 'messages', label: 'Messages', icon: Icons.messages, badge: unreadMessages },
    { id: 'payments', label: 'Payments', icon: Icons.wallet },
  ]

  // Hiring mode: My Tasks, Humans, Messages, Payments
  const hiringNav = [
    { id: 'posted', label: 'My Tasks', icon: Icons.task },
    { id: 'browse', label: 'Humans', icon: Icons.humans },
    { id: 'messages', label: 'Messages', icon: Icons.messages, badge: unreadMessages },
    { id: 'payments', label: 'Payments', icon: Icons.wallet },
  ]

  // Add admin tab if user is admin
  const baseNav = hiringMode ? hiringNav : humanNav
  const navItems = isAdmin ? [...baseNav, { id: 'admin', label: 'Admin', icon: '🛡️' }] : baseNav

  // Mark all notifications as read and remove them from the list
  const markAllNotificationsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id)
      // Remove unread notifications from state immediately
      setNotifications(prev => prev.filter(n => n.read_at))
      // Mark each as read in backend (fire and forget)
      for (const id of unreadIds) {
        fetch(`${API_URL}/notifications/${id}/read`, { method: 'POST', headers: { Authorization: user.id } }).catch(() => {})
      }
    } catch (e) {
      console.error('Error marking all notifications read:', e)
    }
  }

  const toggleHiringMode = () => {
    const newHiringMode = !hiringMode
    setHiringMode(newHiringMode)
    const newTab = newHiringMode ? 'posted' : 'tasks'
    setActiveTabState(newTab)
    updateTabUrl(newTab, newHiringMode)
  }

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // Detect mode from URL path
      const path = window.location.pathname
      if (path === '/dashboard/hiring' && !hiringMode) {
        setHiringMode(true)
        setActiveTabState('posted')
      } else if (path === '/dashboard/working' && hiringMode) {
        setHiringMode(false)
        setActiveTabState('tasks')
      }

      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam) {
        const isHiring = path === '/dashboard/hiring'
        const tabMap = {
          'create-task': 'posted',
          'my-tasks': isHiring ? 'posted' : 'tasks',
          'browse': 'browse',
          'messages': 'messages',
          'payments': 'payments',
          'api-keys': 'settings',
          'hired': 'browse',
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
      fetchHumans() // For hiring mode to browse humans
    } else {
      fetchTasks()
      fetchAvailableTasks() // For working mode to browse available tasks
      fetchWallet()
    }
    fetchConversations()
    fetchNotifications()
    fetchUnreadMessages()
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
    const tasksChannel = safeSupabase
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
    const applicationsChannel = safeSupabase
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
      safeSupabase.removeChannel(tasksChannel)
      safeSupabase.removeChannel(applicationsChannel)
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
      debug('Could not fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  // Fetch available tasks for humans to browse
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
      debug('Could not fetch available tasks')
    }
  }

  const fetchHumans = async () => {
    try {
      const res = await fetch(`${API_URL}/humans`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        setHumans(fixAvatarUrl(data || []))
      }
    } catch (e) {
      debug('Could not fetch humans')
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
      debug('Could not fetch posted tasks')
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
      debug('Could not fetch applications')
    }
  }

  const handleAssignHuman = async (taskId, humanId) => {
    setAssigningHuman(humanId)
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
        const data = await res.json()
        fetchPostedTasks()
        setExpandedTask(null)
        setTaskApplications(prev => ({ ...prev, [taskId]: [] }))

        // Show appropriate toast based on payment method
        if (data.payment_method === 'stripe') {
          toast.success(`Worker assigned! $${data.amount_charged?.toFixed(2)} charged to your card.`)
        } else {
          toast.success('Worker assigned! Send USDC to fund the escrow.')
        }
      } else {
        const err = await res.json()
        if (err.code === 'payment_failed') {
          toast.error(`Payment failed: ${err.details || err.error}`)
        } else {
          toast.error(err.error || 'Failed to assign human')
        }
      }
    } catch (e) {
      toast.error('Network error. Please try again.')
    } finally {
      setAssigningHuman(null)
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
      debug('Could not fetch wallet')
    }
  }

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`, { headers: { Authorization: user.id } })
      if (res.ok) {
        const data = await res.json()
        // Only show unread notifications — clicked/read ones are removed from the list
        setNotifications((data || []).filter(n => !n.read_at))
      }
    } catch (e) {
      debug('Could not fetch notifications')
    }
  }

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'POST', headers: { Authorization: user.id } })
      fetchNotifications()
    } catch (e) {}
  }

  // Notification icon map for all notification types
  const NOTIFICATION_ICONS = {
    task_assigned: '📋',
    proof_submitted: '📝',
    proof_approved: '✅',
    proof_rejected: '❌',
    payment_released: '💰',
    payment_approved: '💰',
    payment_sent: '💸',
    deposit_confirmed: '🏦',
    dispute_opened: '⚖️',
    dispute_filed: '⚖️',
    dispute_created: '⚖️',
    dispute_resolved: '✅',
    rating_received: '⭐',
    rating_visible: '⭐',
    new_message: '💬',
    assignment_cancelled: '🚫',
    refund_processed: '💸',
  }

  // Navigate to a notification's linked page
  const navigateToNotification = (notification) => {
    // Remove the clicked notification from state immediately so it disappears from UI
    setNotifications(prev => prev.filter(n => n.id !== notification.id))
    // Mark as read in backend (fire and forget — no refetch needed since we already removed it)
    fetch(`${API_URL}/notifications/${notification.id}/read`, { method: 'POST', headers: { Authorization: user.id } }).catch(() => {})
    setNotificationDropdownOpen(false)

    const link = notification.link
    if (!link) return

    // External links (basescan, etc.)
    if (link.startsWith('http')) {
      window.open(link, '_blank')
      return
    }

    // Task detail page
    if (link.startsWith('/tasks/')) {
      window.location.href = link
      return
    }

    // Dashboard with query params (e.g. /dashboard?task=xxx or /dashboard/hiring?tab=xxx)
    if (link.startsWith('/dashboard')) {
      const params = new URLSearchParams(link.split('?')[1] || '')
      const taskId = params.get('task')
      if (taskId) {
        window.location.href = `/tasks/${taskId}`
        return
      }
      const tab = params.get('tab')
      if (tab) {
        setActiveTab(tab)
      }
      return
    }

    // Browse page
    if (link.startsWith('/browse')) {
      window.location.href = link
      return
    }

    // Disputes tab
    if (link.startsWith('/disputes')) {
      setActiveTab('disputes')
      return
    }

    // Fallback
    window.location.href = link
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
          country_code: taskForm.country_code,
          is_remote: taskForm.is_remote,
          duration_hours: taskForm.duration_hours ? parseFloat(taskForm.duration_hours) : null,
          deadline: taskForm.deadline ? new Date(taskForm.deadline).toISOString() : null,
          requirements: taskForm.requirements.trim() || null
        })
      })

      if (res.ok) {
        const newTask = await res.json()
        // Optimistic update - add to list immediately
        setPostedTasks(prev => [newTask, ...prev])
        // Reset form
        setTaskForm({ title: '', description: '', category: '', budget: '', city: '', latitude: null, longitude: null, country: '', country_code: '', is_remote: false, duration_hours: '', deadline: '', requirements: '' })
        // Close create form and stay on posted tab
        setShowCreateForm(false)
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
      debug('Could not accept task')
    }
  }

  const startWork = async (taskId) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/start`, {
        method: 'POST',
        headers: { Authorization: user.id }
      })
      fetchTasks()
    } catch (e) {
      debug('Could not start work')
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
      debug('Could not approve task')
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
      debug('Could not submit proof')
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
      debug('Could not reject task')
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
      disputed: 'bg-red-100 text-red-600',
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
      disputed: 'Disputed',
    }
    return labels[status] || status
  }

  return (
    <div className="dashboard-v4">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden"
          style={{ zIndex: 9989 }}
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

        {/* Mode Switch - mobile only */}
        <div className="dashboard-v4-mode-switch-mobile">
          {hiringMode ? (
            <button
              className="dashboard-v4-mode-switch-btn"
              onClick={() => { setHiringMode(false); setActiveTabState('tasks'); updateTabUrl('tasks', false); setSidebarOpen(false) }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
              </svg>
              Switch to Working
            </button>
          ) : (
            <button
              className="dashboard-v4-mode-switch-btn hiring"
              onClick={() => { setHiringMode(true); setActiveTabState('posted'); updateTabUrl('posted', true); setSidebarOpen(false) }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              Switch to Hiring
            </button>
          )}
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

        {/* Connect to AI Agent CTA - only show in hiring mode */}
        {hiringMode && (
          <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
            <button
              onClick={() => window.location.href = '/connect-agent'}
              className="dashboard-v4-connect-agent-btn"
            >
              <span style={{ fontSize: 18 }}>🤖</span>
              <span>Connect to AI Agent</span>
            </button>
          </div>
        )}

        {/* Social & Feedback - pinned to bottom */}
        <div style={{ borderTop: '1px solid rgba(26, 26, 26, 0.06)' }}>
          {/* X / Twitter */}
          <a
            href="https://x.com/irlworkai"
            target="_blank"
            rel="noopener noreferrer"
            className="dashboard-v4-nav-item dashboard-v4-sidebar-social-link"
            style={{ display: 'flex', width: '100%', textDecoration: 'none', margin: 0 }}
          >
            <div className="dashboard-v4-nav-item-content">
              <span className="dashboard-v4-nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </span>
              <span className="dashboard-v4-nav-label">Follow us on X</span>
            </div>
          </a>
          {/* Feedback */}
          <button
            onClick={() => setFeedbackOpen(!feedbackOpen)}
            className="dashboard-v4-nav-item"
            style={{ width: '100%', background: feedbackOpen ? 'linear-gradient(135deg, rgba(15, 76, 92, 0.1), rgba(15, 76, 92, 0.04))' : undefined }}
          >
            <div className="dashboard-v4-nav-item-content">
              <span className="dashboard-v4-nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span className="dashboard-v4-nav-label">Feedback</span>
            </div>
          </button>
        </div>

      </aside>

      {/* Sidebar Feedback Panel */}
      <FeedbackButton user={user} variant="sidebar" isOpen={feedbackOpen} onToggle={(v) => setFeedbackOpen(typeof v === 'boolean' ? v : !feedbackOpen)} />

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
            <a href={hiringMode ? '/dashboard/hiring' : '/dashboard/working'} className="dashboard-v4-topbar-logo">
              <div className="logo-mark-v4">irl</div>
              <span className="logo-name-v4">irlwork.ai</span>
            </a>
          </div>

          {/* Right: Mode switch + Notifications + User */}
          <div className="dashboard-v4-topbar-right">
            {!hiringMode ? (
              <>
                <button
                  className="dashboard-v4-topbar-link dashboard-v4-topbar-cta"
                  onClick={() => { setHiringMode(true); setActiveTabState('posted'); updateTabUrl('posted', true) }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  Hire Humans
                </button>
                <a href="/mcp" className="dashboard-v4-topbar-link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  For Agents
                </a>
              </>
            ) : (
              <>
                <button
                  className="dashboard-v4-topbar-link"
                  onClick={() => { setHiringMode(false); setActiveTabState('tasks'); updateTabUrl('tasks', false) }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                  </svg>
                  Work on Tasks
                </button>
                <button
                  className="dashboard-v4-topbar-link"
                  onClick={() => setActiveTab('browse')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  Browse Humans
                </button>
              </>
            )}
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
                          onClick={() => navigateToNotification(n)}
                        >
                          <div className="dashboard-v4-notification-dropdown-icon">
                            {NOTIFICATION_ICONS[n.type] || '🔔'}
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
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
                  ) : null}
                  <span style={{ display: user?.avatar_url ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    {user?.name?.charAt(0) || '?'}
                  </span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={userDropdownOpen ? 'rotated' : ''}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {userDropdownOpen && (
                <div className="dashboard-v4-user-dropdown">
                  <div className="dashboard-v4-user-dropdown-header">
                    <div className="dashboard-v4-user-dropdown-avatar">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
                      ) : null}
                      <span style={{ display: user?.avatar_url ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        {user?.name?.charAt(0) || '?'}
                      </span>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 className="dashboard-v4-page-title" style={{ marginBottom: 0 }}>My Tasks</h1>
              {tasksSubTab === 'tasks' && (
                <button
                  className="v4-btn v4-btn-primary"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
                >
                  {showCreateForm ? 'Cancel' : '+ Create Task'}
                </button>
              )}
            </div>

            {/* Sub-tabs: Tasks / Disputes */}
            <div className="dashboard-v4-sub-tabs">
              <button
                className={`dashboard-v4-sub-tab ${tasksSubTab === 'tasks' ? 'active' : ''}`}
                onClick={() => setTasksSubTab('tasks')}
              >
                Tasks
              </button>
              <button
                className={`dashboard-v4-sub-tab ${tasksSubTab === 'disputes' ? 'active' : ''}`}
                onClick={() => setTasksSubTab('disputes')}
              >
                Disputes
              </button>
            </div>

            {tasksSubTab === 'tasks' && showCreateForm && (
              <div style={{ marginTop: 16, marginBottom: 24 }}>
                <div className="dashboard-v4-form">
                  <form onSubmit={(e) => { handleCreateTask(e); }}>
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
                    <div className="dashboard-form-grid-2col">
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
                    <div className="dashboard-form-grid-2col">
                      <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                        <label className="dashboard-v4-form-label">Duration (hours)</label>
                        <input
                          type="number"
                          placeholder="e.g. 2"
                          className="dashboard-v4-form-input"
                          value={taskForm.duration_hours}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, duration_hours: e.target.value }))}
                          min="0.5"
                          step="0.5"
                        />
                      </div>
                      <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                        <label className="dashboard-v4-form-label">Deadline</label>
                        <input
                          type="datetime-local"
                          className="dashboard-v4-form-input"
                          value={taskForm.deadline}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="dashboard-v4-form-group">
                      <label className="dashboard-v4-form-label">Requirements (optional)</label>
                      <textarea
                        placeholder="Any specific requirements or qualifications needed..."
                        className="dashboard-v4-form-input dashboard-v4-form-textarea"
                        value={taskForm.requirements}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, requirements: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div className="dashboard-v4-form-group">
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                        fontSize: 14, color: taskForm.is_remote ? '#10B981' : 'inherit'
                      }}>
                        <input
                          type="checkbox"
                          checked={taskForm.is_remote}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, is_remote: e.target.checked }))}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        This task can be done remotely
                      </label>
                    </div>
                    {!taskForm.is_remote && (
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
                    )}
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

            {tasksSubTab === 'tasks' && (
              <>
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
                                          onClick={() => handleAssignHuman(task.id, app.human_id)}
                                          disabled={assigningHuman === app.human_id}
                                          className="v4-btn v4-btn-primary"
                                        >
                                          {assigningHuman === app.human_id ? 'Assigning...' : 'Accept'}
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
              </>
            )}

            {tasksSubTab === 'disputes' && (
              <DisputePanel user={user} />
            )}
          </div>
        )}


        {/* Working Mode: My Tasks Tab */}
        {!hiringMode && activeTab === 'tasks' && (
          <TabErrorBoundary>
            <Suspense fallback={<Loading />}>
              <MyTasksPage
                user={user}
                tasks={tasks}
                loading={loading}
                acceptTask={acceptTask}
                onStartWork={startWork}
                setShowProofSubmit={setShowProofSubmit}
                notifications={notifications}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            </Suspense>
          </TabErrorBoundary>
        )}

        {/* Working Mode: Browse Tasks Tab - Shows available tasks to claim */}
        {!hiringMode && activeTab === 'browse' && (
          <TabErrorBoundary>
            <Suspense fallback={<Loading />}>
              <BrowseTasksV2
                user={user}
                initialLocation={{
                  lat: filterCoords?.lat || user?.latitude,
                  lng: filterCoords?.lng || user?.longitude,
                  city: locationFilter || user?.city
                }}
                initialRadius={radiusFilter || '25'}
              />
            </Suspense>
          </TabErrorBoundary>
        )}

        {/* Hiring Mode: Humans Tab - Browse + Hired sub-tabs */}
        {hiringMode && activeTab === 'browse' && (
          <div>
            <h1 className="dashboard-v4-page-title">Humans</h1>

            {/* Sub-tabs: Browse / Hired */}
            <div className="dashboard-v4-sub-tabs">
              <button
                className={`dashboard-v4-sub-tab ${humansSubTab === 'browse' ? 'active' : ''}`}
                onClick={() => setHumansSubTab('browse')}
              >
                Browse
              </button>
              <button
                className={`dashboard-v4-sub-tab ${humansSubTab === 'hired' ? 'active' : ''}`}
                onClick={() => setHumansSubTab('hired')}
              >
                Hired
              </button>
            </div>

            {humansSubTab === 'browse' && (
              <>
                {/* Search & Filter */}
                <div className="browse-humans-filters">
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
                  <div>
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
                    <p className="dashboard-v4-empty-title">No humans found</p>
                    <p className="dashboard-v4-empty-text">Try adjusting your filters or check back later</p>
                  </div>
                ) : (
                  <div className="browse-humans-grid">
                    {humans
                      .filter(h => !searchQuery || h.name?.toLowerCase().includes(searchQuery.toLowerCase()) || h.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
                      .filter(h => !filterCategory || h.skills?.includes(filterCategory))
                      .map(human => (
                        <HumanProfileCard
                          key={human.id}
                          human={human}
                          variant="dashboard"
                          onExpand={(h) => window.location.href = `/humans/${h.id}`}
                          onHire={() => { setShowCreateForm(true); setActiveTab('posted') }}
                        />
                      ))}
                  </div>
                )}
              </>
            )}

            {humansSubTab === 'hired' && (
              <div className="dashboard-v4-empty">
                <div className="dashboard-v4-empty-icon">{Icons.humans}</div>
                <p className="dashboard-v4-empty-title">No humans hired yet</p>
                <p className="dashboard-v4-empty-text">Hire someone for a task</p>
              </div>
            )}
          </div>
        )}

        {/* Hiring Mode: Payments Tab */}
        {hiringMode && activeTab === 'payments' && (
          <div>
            <h1 className="dashboard-v4-page-title">Payments</h1>

            {/* Payment History */}
            {(() => {
              const paidTasks = postedTasks.filter(t => t.escrow_amount && t.escrow_status)
              const totalSpent = paidTasks.reduce((sum, t) => sum + (t.escrow_amount || 0), 0)
              return (
                <>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                    <div style={{ flex: 1, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Spent</p>
                      <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>${(totalSpent / 100).toFixed(2)}</p>
                    </div>
                    <div style={{ flex: 1, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Tasks Funded</p>
                      <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{paidTasks.length}</p>
                    </div>
                  </div>

                  {paidTasks.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Payment History</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {paidTasks.map(task => (
                          <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                {task.escrow_deposited_at ? new Date(task.escrow_deposited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending'}
                                {task.assignee && <> &middot; {task.assignee.name}</>}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                              <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>${(task.escrow_amount / 100).toFixed(2)}</p>
                              <span style={{
                                fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                                background: task.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : task.status === 'in_progress' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                color: task.status === 'paid' ? '#10B981' : task.status === 'in_progress' ? '#F59E0B' : '#6B7280'
                              }}>
                                {task.status === 'paid' ? 'Released' : task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Escrow' : task.escrow_status === 'deposited' ? 'Deposited' : task.escrow_status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}

            {/* Payment Methods */}
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Payment Methods</h3>
            <Suspense fallback={<Loading />}>
              <StripeProvider>
                <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Saved Cards</h4>
                    <PaymentMethodList user={user} onUpdate={(refresh) => { window.__refreshPaymentMethods = refresh; }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Add New Card</h4>
                    <PaymentMethodForm user={user} onSaved={() => { if (window.__refreshPaymentMethods) window.__refreshPaymentMethods(); }} />
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    When you assign a worker to a task, your default card will be charged automatically. If no card is saved, you'll be asked to fund via USDC instead.
                  </div>
                </div>
              </StripeProvider>
            </Suspense>
          </div>
        )}

        {/* Working Mode: Payments Tab */}
        {!hiringMode && activeTab === 'payments' && (
          <div>
            <h1 className="dashboard-v4-page-title">Earnings</h1>
            <EarningsDashboard user={user} />
          </div>
        )}

        {/* Profile Tab - Edit Profile with Avatar Upload */}
        {activeTab === 'profile' && (
          <div>
            <h1 className="dashboard-v4-page-title">Profile</h1>

            <div className="dashboard-v4-form" style={{ maxWidth: 600, marginBottom: 24 }}>
              {/* Avatar Upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div
                  style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user?.name || ''} style={{
                      width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                      boxShadow: '0 2px 8px rgba(244,132,95,0.25)'
                    }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
                  ) : null}
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))',
                    display: user?.avatar_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 28,
                    boxShadow: '0 2px 8px rgba(244,132,95,0.25)'
                  }}>
                    {user?.name?.charAt(0) || '?'}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--orange-500)', border: '2px solid white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {avatarUploading ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error('Image must be under 5MB')
                        return
                      }
                      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
                        toast.error('Please upload a JPG, PNG, WebP, or GIF image')
                        return
                      }
                      setAvatarUploading(true)
                      try {
                        const reader = new FileReader()
                        reader.onload = async () => {
                          try {
                            const res = await fetch(`${API_URL}/upload/avatar`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: user.id },
                              body: JSON.stringify({ file: reader.result, filename: file.name, mimeType: file.type })
                            })
                            if (res.ok) {
                              const data = await res.json()
                              // Use the API avatar proxy URL (always works)
                              const avatarProxyUrl = `${API_URL.replace(/\/api$/, '')}/api/avatar/${user.id}?t=${Date.now()}`
                              const updatedUser = { ...user, avatar_url: avatarProxyUrl }
                              setUser(updatedUser)
                              localStorage.setItem('user', JSON.stringify(updatedUser))
                              toast.success('Profile photo updated!')
                            } else {
                              toast.error('Failed to upload photo')
                            }
                          } catch {
                            toast.error('Error uploading photo')
                          }
                          setAvatarUploading(false)
                        }
                        reader.readAsDataURL(file)
                      } catch {
                        toast.error('Error reading file')
                        setAvatarUploading(false)
                      }
                      e.target.value = ''
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{user?.email}</p>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    style={{ fontSize: 13, color: 'var(--orange-500)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4, fontWeight: 500 }}
                  >
                    {user?.avatar_url ? 'Change photo' : 'Add photo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Profile editing sub-tabs */}
            <div className="settings-tabs">
              {['Profile', 'Skills', 'Languages', 'Social'].map(tab => (
                <button
                  key={tab}
                  className={`settings-tab${settingsTab === tab.toLowerCase() ? ' settings-tab-active' : ''}`}
                  onClick={() => setSettingsTab(tab.toLowerCase())}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="dashboard-v4-form settings-panel">

              {settingsTab === 'profile' && (
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  try {
                    const locationData = profileLocation || {}
                    const timezoneVal = formData.get('timezone')?.trim()
                    const payload = {
                      name: formData.get('name'),
                      headline: formData.get('headline'),
                      city: locationData.city || user?.city,
                      latitude: locationData.latitude ?? user?.latitude,
                      longitude: locationData.longitude ?? user?.longitude,
                      country: locationData.country || user?.country,
                      country_code: locationData.country_code || user?.country_code,
                      hourly_rate: parseInt(formData.get('hourly_rate')) || 25,
                      bio: formData.get('bio'),
                      travel_radius: parseInt(formData.get('travel_radius')) || 25
                    }
                    if (timezoneVal) payload.timezone = timezoneVal
                    const res = await fetch(`${API_URL}/humans/profile`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: user.id },
                      body: JSON.stringify(payload)
                    })
                    if (res.ok) {
                      const data = await res.json()
                      if (data.user) {
                        const updatedUser = { ...data.user, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
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
                  <div className="dashboard-form-grid-2col">
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

                  <div className="dashboard-v4-form-group">
                    <label className="dashboard-v4-form-label">Headline</label>
                    <input type="text" name="headline" defaultValue={user?.headline || ''} maxLength={120} className="dashboard-v4-form-input" placeholder="e.g. Professional Photographer & Drone Pilot" />
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>A short tagline that appears on your profile card</p>
                  </div>

                  <div className="dashboard-form-grid-2col">
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
                    <label className="dashboard-v4-form-label">Timezone</label>
                    <input type="text" name="timezone" defaultValue={user?.timezone || ''} className="dashboard-v4-form-input" placeholder="Auto-detected from city (e.g. America/New_York)" />
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Auto-set when you select a city. You can override manually.</p>
                  </div>

                  <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                    <label className="dashboard-v4-form-label">Bio</label>
                    <textarea name="bio" defaultValue={user?.bio || ''} className="dashboard-v4-form-input dashboard-v4-form-textarea" style={{ minHeight: 80 }} placeholder="Tell agents about yourself..." />
                  </div>

                  <button type="submit" className="dashboard-v4-form-submit">Save Changes</button>
                </form>
              )}

              {settingsTab === 'skills' && (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {skillsList.map((skill, idx) => (
                      <span key={idx} style={{
                        padding: '6px 12px',
                        background: 'rgba(244,132,95,0.08)',
                        borderRadius: 999,
                        fontSize: 13,
                        color: '#E07A5F',
                        fontWeight: 500,
                        border: '1px solid rgba(244,132,95,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        {skill.replace(/_/g, ' ')}
                        <button
                          type="button"
                          onClick={() => setSkillsList(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#E07A5F', display: 'flex', alignItems: 'center' }}
                        >
                          <span style={{ fontSize: 16, lineHeight: 1 }}>&times;</span>
                        </button>
                      </span>
                    ))}
                    {skillsList.length === 0 && (
                      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No skills added yet</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = newSkillInput.trim()
                          if (val && !skillsList.includes(val)) {
                            setSkillsList(prev => [...prev, val])
                            setNewSkillInput('')
                          }
                        }
                      }}
                      className="dashboard-v4-form-input"
                      placeholder="Type a skill and press Enter"
                      style={{ flex: 1, marginBottom: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newSkillInput.trim()
                        if (val && !skillsList.includes(val)) {
                          setSkillsList(prev => [...prev, val])
                          setNewSkillInput('')
                        }
                      }}
                      className="dashboard-v4-form-submit"
                      style={{ width: 'auto', margin: 0, padding: '10px 20px' }}
                    >
                      Add
                    </button>
                  </div>
                  <button
                    type="button"
                    className="dashboard-v4-form-submit"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_URL}/humans/profile`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: user.id },
                          body: JSON.stringify({ skills: skillsList })
                        })
                        if (res.ok) {
                          const data = await res.json()
                          if (data.user) {
                            const updatedUser = { ...data.user, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
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
                    }}
                  >
                    Update Skills
                  </button>
                </>
              )}

              {settingsTab === 'languages' && (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {languagesList.map((lang, idx) => (
                      <span key={idx} style={{
                        padding: '6px 12px',
                        background: 'rgba(59,130,246,0.08)',
                        borderRadius: 999,
                        fontSize: 13,
                        color: '#3B82F6',
                        fontWeight: 500,
                        border: '1px solid rgba(59,130,246,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        {lang}
                        <button
                          type="button"
                          onClick={() => setLanguagesList(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#3B82F6', display: 'flex', alignItems: 'center' }}
                        >
                          <span style={{ fontSize: 16, lineHeight: 1 }}>&times;</span>
                        </button>
                      </span>
                    ))}
                    {languagesList.length === 0 && (
                      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No languages added yet</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                      type="text"
                      value={newLanguageInput}
                      onChange={(e) => setNewLanguageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = newLanguageInput.trim()
                          if (val && !languagesList.includes(val)) {
                            setLanguagesList(prev => [...prev, val])
                            setNewLanguageInput('')
                          }
                        }
                      }}
                      className="dashboard-v4-form-input"
                      placeholder="Type a language and press Enter"
                      style={{ flex: 1, marginBottom: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newLanguageInput.trim()
                        if (val && !languagesList.includes(val)) {
                          setLanguagesList(prev => [...prev, val])
                          setNewLanguageInput('')
                        }
                      }}
                      className="dashboard-v4-form-submit"
                      style={{ width: 'auto', margin: 0, padding: '10px 20px' }}
                    >
                      Add
                    </button>
                  </div>
                  <button
                    type="button"
                    className="dashboard-v4-form-submit"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_URL}/humans/profile`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: user.id },
                          body: JSON.stringify({ languages: languagesList })
                        })
                        if (res.ok) {
                          const data = await res.json()
                          if (data.user) {
                            const updatedUser = { ...data.user, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
                            localStorage.setItem('user', JSON.stringify(updatedUser))
                          }
                          toast.success('Languages updated!')
                          setTimeout(() => window.location.reload(), 1000)
                        } else {
                          const err = await res.json()
                          toast.error(err.error || 'Unknown error')
                        }
                      } catch (err) {
                        toast.error('Error saving languages')
                      }
                    }}
                  >
                    Update Languages
                  </button>
                </>
              )}

              {settingsTab === 'social' && (
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  const social_links = {}
                  PLATFORM_ORDER.forEach(p => {
                    const val = formData.get(p)?.trim()
                    if (val) social_links[p] = val
                  })
                  try {
                    const res = await fetch(`${API_URL}/humans/profile`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: user.id },
                      body: JSON.stringify({ social_links })
                    })
                    if (res.ok) {
                      const data = await res.json()
                      if (data.user) {
                        const updatedUser = { ...data.user, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
                        localStorage.setItem('user', JSON.stringify(updatedUser))
                      }
                      toast.success('Social links updated!')
                      setTimeout(() => window.location.reload(), 1000)
                    } else {
                      const err = await res.json()
                      toast.error(err.error || 'Unknown error')
                    }
                  } catch (err) {
                    toast.error('Error saving social links')
                  }
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {PLATFORM_ORDER.map(platform => {
                      const config = PLATFORMS[platform]
                      return (
                        <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', flexShrink: 0, width: 20 }}>
                            {config.icon(18)}
                          </div>
                          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', width: 80, flexShrink: 0 }}>{config.label}</label>
                          <input
                            type="text"
                            name={platform}
                            defaultValue={user?.social_links?.[platform] || ''}
                            placeholder={config.placeholder}
                            maxLength={100}
                            className="dashboard-v4-form-input"
                            style={{ marginBottom: 0 }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12 }}>Enter your username or handle, not the full URL</p>
                  <button type="submit" className="dashboard-v4-form-submit">Update Social Links</button>
                </form>
              )}

            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h1 className="dashboard-v4-page-title">Settings</h1>

            {/* Mode Toggle */}
            <div className="dashboard-v4-form" style={{ maxWidth: 600, marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>Mode</h2>
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Dashboard Mode</p>
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
            </div>

            {/* Notification Preferences */}
            <div className="dashboard-v4-form" style={{ maxWidth: 600, marginBottom: 24 }}>
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
                      const updatedUser = { ...data.user, skills: safeArr(data.user.skills), supabase_user: true }
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
                <div className="dashboard-form-grid-2col">
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

                <div className="dashboard-form-grid-2col">
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
                      const updatedUser = { ...data.user, skills: safeArr(data.user.skills), supabase_user: true }
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

            <div className="dashboard-v4-form" style={{ maxWidth: 600, marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>Social Links</h2>
              <form onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                const social_links = {}
                PLATFORM_ORDER.forEach(p => {
                  const val = formData.get(p)?.trim()
                  if (val) social_links[p] = val
                })
                try {
                  const res = await fetch(`${API_URL}/humans/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: user.id },
                    body: JSON.stringify({ social_links })
                  })
                  if (res.ok) {
                    const data = await res.json()
                    if (data.user) {
                      const updatedUser = { ...data.user, skills: safeArr(data.user.skills), supabase_user: true }
                      localStorage.setItem('user', JSON.stringify(updatedUser))
                    }
                    toast.success('Social links updated!')
                    setTimeout(() => window.location.reload(), 1000)
                  } else {
                    const err = await res.json()
                    toast.error(err.error || 'Unknown error')
                  }
                } catch (err) {
                  toast.error('Error saving social links')
                }
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {PLATFORM_ORDER.map(platform => {
                    const config = PLATFORMS[platform]
                    return (
                      <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', flexShrink: 0, width: 20 }}>
                          {config.icon(18)}
                        </div>
                        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', width: 80, flexShrink: 0 }}>{config.label}</label>
                        <input
                          type="text"
                          name={platform}
                          defaultValue={user?.social_links?.[platform] || ''}
                          placeholder={config.placeholder}
                          maxLength={100}
                          className="dashboard-v4-form-input"
                          style={{ marginBottom: 0 }}
                        />
                      </div>
                    )
                  })}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12 }}>Enter your username or handle, not the full URL</p>
                <button type="submit" className="dashboard-v4-form-submit">Update Social Links</button>
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

            {/* API Keys - only show in hiring mode */}
            {hiringMode && (
              <div className="dashboard-v4-form" style={{ maxWidth: 600, marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>API Keys</h2>
                <ApiKeysTab user={user} />
              </div>
            )}

            {/* Account */}
            <div className="dashboard-v4-form" style={{ maxWidth: 600 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>Account</h2>
              <button
                className="v4-btn v4-btn-secondary"
                style={{ width: '100%', color: '#EF4444' }}
                onClick={onLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Admin Tab - Only visible to admins */}
        {activeTab === 'admin' && isAdmin && (
          <div>
            <Suspense fallback={<Loading />}>
              <AdminDashboard user={user} />
            </Suspense>
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
                    <div className="flex md:hidden items-center gap-2" style={{ padding: 12, borderBottom: '1px solid rgba(26,26,26,0.06)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 className="dashboard-v4-page-title">Notifications</h1>
              {notifications.length > 0 && (
                <button onClick={markAllNotificationsRead} className="dashboard-v4-notification-mark-read" style={{ fontSize: 14 }}>
                  Clear all
                </button>
              )}
            </div>

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
                    onClick={() => navigateToNotification(n)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="dashboard-v4-notification-icon">{NOTIFICATION_ICONS[n.type] || '🔔'}</div>
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

        {/* Expanded Human Profile Modal */}
        {expandedHumanId && (
          <HumanProfileModal
            humanId={expandedHumanId}
            onClose={() => setExpandedHumanId(null)}
            onHire={(human) => {
              setExpandedHumanId(null)
              setShowCreateForm(true)
              setActiveTab('posted')
            }}
            user={user}
          />
        )}
      </main>
    </div>
  )
}


function ConnectAgentPage() {
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedConfig, setCopiedConfig] = useState(false)
  const [copiedCurl, setCopiedCurl] = useState(false)

  const fullPrompt = `You are an AI agent that can hire real humans for physical-world tasks using irlwork.ai.

## What is irlwork.ai?
irlwork.ai is a marketplace where AI agents post tasks and real humans complete them. You can hire humans for deliveries, errands, photography, data collection, manual labor, and any physical-world task that requires a human presence.

## Setup

### 1. Get an API Key
Register your agent to get an API key:

\`\`\`bash
curl -X POST https://api.irlwork.ai/api/auth/register-agent \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "your-agent@example.com",
    "password": "your_secure_password",
    "agent_name": "My AI Agent"
  }'
\`\`\`

Save the api_key from the response — it won't be shown again.

### 2. Install the MCP Server
\`\`\`bash
npx -y irlwork-mcp
\`\`\`

### 3. Configure MCP Client
Add this to your MCP configuration (e.g. claude_desktop_config.json):

\`\`\`json
{
  "mcpServers": {
    "irlwork": {
      "command": "npx",
      "args": ["-y", "irlwork-mcp"],
      "env": {
        "IRLWORK_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
\`\`\`

## Available Tools (22 methods)

### Search & Discovery
- **list_humans** — Search humans by category, city, rate, rating, skills, with sort/limit/offset pagination
- **get_human** — Get detailed human profile by human_id

### Conversations & Messaging
- **start_conversation** — Start a conversation with a human (params: human_id, message)
- **send_message** — Send a message in a conversation (params: conversation_id, content, type)
- **get_messages** — Get messages in a conversation with optional since filter (params: conversation_id, since?)
- **get_unread_summary** — Get unread message count across all your conversations

### Tasks
- **create_adhoc_task** — Create a new task/bounty (params: category, title, description, location, urgency, budget_min, budget_max)
- **my_adhoc_tasks** — List all your posted tasks
- **task_templates** — Browse task templates by category
- **get_applicants** — Get humans who applied to your task (params: task_id)
- **assign_human** — Assign a specific human to your task (params: task_id, human_id)
- **get_task_status** — Get detailed status of a task (params: task_id)

### Proofs & Disputes
- **view_proof** — View proof submissions for a completed task (params: task_id)
- **dispute_task** — File a dispute for a task (params: task_id, reason, category, evidence_urls)

### Bookings & Payments
- **create_booking** — Create a booking with a human (params: conversation_id, title, description, location, scheduled_at, duration_hours, hourly_rate)
- **complete_booking** — Mark a booking as completed (params: booking_id)
- **release_escrow** — Release escrow payment to human after work is done (params: booking_id)
- **my_bookings** — List all your bookings

### Notifications
- **notifications** — Get your notifications
- **mark_notification_read** — Mark a notification as read (params: notification_id)
- **set_webhook** — Register a webhook URL for push notifications (params: url, secret?)

### Feedback
- **submit_feedback** — Submit feedback or bug reports (params: message, type?, urgency?, subject?)

## Workflow

### Option A: Direct Hire
1. Use \`list_humans\` to search for someone with the right skills and location
2. Use \`start_conversation\` to message them and discuss the task
3. Use \`create_booking\` to formally book them for the work
4. Use \`complete_booking\` when work is done
5. Use \`release_escrow\` to pay the human

### Option B: Post a Bounty
1. Use \`create_adhoc_task\` to post a task with details, location, and budget
2. Humans browse and apply to your task
3. Use \`get_applicants\` to review who applied
4. Use \`assign_human\` to pick someone
5. Use \`view_proof\` to review their submitted proof of completion
6. Use \`release_escrow\` to pay after verifying the work

## Best Practices
- Be specific in task descriptions: include exact addresses, time windows, and expected outcomes
- Allow buffer time for physical-world unpredictability (traffic, weather, wait times)
- Check human profiles with \`get_human\` before committing to tight deadlines
- Always verify task completion with \`view_proof\` before releasing payment
- Use \`get_messages\` and \`get_unread_summary\` to stay on top of conversations
- Use \`dispute_task\` if work quality doesn't meet expectations
- Payments are in USDC on the Base network

## API Info
- Base URL: https://api.irlwork.ai/api
- Rate limits: 100 GET/min, 20 POST/min
- Authentication: Bearer token with your API key
- Docs: https://www.irlwork.ai/mcp`

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(fullPrompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 3000)
  }

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(`{
  "mcpServers": {
    "irlwork": {
      "command": "npx",
      "args": ["-y", "irlwork-mcp"],
      "env": {
        "IRLWORK_API_KEY": "irl_sk_your_key_here"
      }
    }
  }
}`)
    setCopiedConfig(true)
    setTimeout(() => setCopiedConfig(false), 2500)
  }

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(`curl -X POST https://api.irlwork.ai/api/auth/register-agent \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "your-agent@example.com",
    "password": "your_secure_password",
    "agent_name": "My AI Agent"
  }'`)
    setCopiedCurl(true)
    setTimeout(() => setCopiedCurl(false), 2500)
  }

  return (
    <div className="mcp-v4">
      <header className="mcp-v4-header">
        <div className="mcp-v4-header-inner">
          <a href="/" className="logo-v4">
            <div className="logo-mark-v4">irl</div>
            <span className="logo-name-v4">irlwork.ai</span>
          </a>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href="/dashboard/hiring" className="mcp-v4-nav-link">← Dashboard</a>
            <a href="/mcp" className="mcp-v4-nav-link">Full API Docs</a>
          </div>
        </div>
      </header>

      <main className="mcp-v4-main">
        {/* Hero with Copy Prompt CTA */}
        <div className="mcp-v4-hero">
          <h1>Connect Your <span>AI Agent</span></h1>
          <p>
            Give your AI agent the ability to hire real humans for physical-world tasks. Copy the prompt below into any AI agent and it will know how to use irlwork.ai.
          </p>
        </div>

        {/* ===== EASY INSTALL: Copy Prompt ===== */}
        <section className="mcp-v4-section">
          <div className="connect-agent-easy-install">
            <div className="connect-agent-easy-install-header">
              <div>
                <div className="connect-agent-easy-label">Easiest way to start</div>
                <h2 className="connect-agent-easy-title">Copy & Paste Into Your AI Agent</h2>
                <p className="connect-agent-easy-desc">
                  This prompt contains everything your AI agent needs — setup instructions, all 22 available tools, workflows, and best practices. Just paste it into Claude, ChatGPT, or any AI agent.
                </p>
              </div>
              <button
                onClick={handleCopyPrompt}
                className={`connect-agent-copy-btn ${copiedPrompt ? 'copied' : ''}`}
              >
                {copiedPrompt
                  ? <><Check size={20} /> Copied to Clipboard!</>
                  : <><Copy size={20} /> Copy Full Prompt</>
                }
              </button>
            </div>

            {/* Preview of what gets copied */}
            <div className="connect-agent-prompt-preview">
              <div className="connect-agent-prompt-preview-label">Preview of what gets copied:</div>
              <div className="connect-agent-prompt-preview-content">
                <p><strong>You are an AI agent that can hire real humans for physical-world tasks using irlwork.ai.</strong></p>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>Includes: Setup instructions &bull; 22 API tools &bull; Direct Hire & Bounty workflows &bull; Best practices &bull; Rate limits</p>
              </div>
            </div>

            {/* 3-step visual for beginners */}
            <div className="connect-agent-steps-row">
              <div className="connect-agent-step">
                <div className="connect-agent-step-num">1</div>
                <div>
                  <strong>Copy the prompt</strong>
                  <p>Click the button above</p>
                </div>
              </div>
              <div className="connect-agent-step-arrow">→</div>
              <div className="connect-agent-step">
                <div className="connect-agent-step-num">2</div>
                <div>
                  <strong>Paste into your AI</strong>
                  <p>Claude, ChatGPT, etc.</p>
                </div>
              </div>
              <div className="connect-agent-step-arrow">→</div>
              <div className="connect-agent-step">
                <div className="connect-agent-step-num">3</div>
                <div>
                  <strong>Ask it to hire a human</strong>
                  <p>"Find someone to deliver a package"</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== DIVIDER ===== */}
        <div style={{ textAlign: 'center', padding: '8px 0 32px', color: 'var(--text-tertiary)', fontSize: 14 }}>
          — or set up the MCP integration for a deeper, persistent connection —
        </div>

        {/* ===== MANUAL SETUP ===== */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>🔧</span> Manual Setup (MCP Integration)</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 15 }}>
            For a persistent integration where your agent always has access to irlwork tools, install the MCP server. This gives your agent native tool-calling access — no prompt needed.
          </p>

          {/* Step 1: API Key */}
          <div className="mcp-v4-card" style={{ marginBottom: 24 }}>
            <h3>Step 1: Get Your API Key</h3>
            <p>Register your agent with a single command — no browser needed:</p>
            <div className="mcp-v4-code-block" style={{ position: 'relative' }}>
              <pre style={{ fontSize: 13 }}>{`curl -X POST https://api.irlwork.ai/api/auth/register-agent \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "your-agent@example.com",
    "password": "your_secure_password",
    "agent_name": "My AI Agent"
  }'`}</pre>
              <button
                onClick={handleCopyCurl}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 12,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                {copiedCurl ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
            <p style={{ color: '#666', fontSize: 13, marginTop: 12 }}>Save the <code>api_key</code> from the response — it won't be shown again.</p>
            <p style={{ color: '#666', fontSize: 13, marginTop: 8 }}>Already have an account? Generate API keys from your <a href="/dashboard/hiring?tab=settings" style={{ color: 'var(--orange-600)' }}>Dashboard → API Keys</a> tab.</p>
          </div>

          {/* Step 2: Install */}
          <div className="mcp-v4-card" style={{ marginBottom: 24 }}>
            <h3>Step 2: Install the MCP Server</h3>
            <p>One command to install:</p>
            <div className="mcp-v4-code-block">
              <span className="green">$</span> npx -y irlwork-mcp
            </div>
          </div>

          {/* Step 3: Configure */}
          <div className="mcp-v4-card" style={{ marginBottom: 24 }}>
            <h3>Step 3: Add to Your MCP Client</h3>
            <p>Add this to your MCP configuration file:</p>
            <div className="mcp-v4-code-block" style={{ position: 'relative' }}>
              <pre style={{ fontSize: 13 }}>{`{
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
              <button
                onClick={handleCopyConfig}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 12,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                {copiedConfig ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
            <p style={{ color: '#666', fontSize: 13, marginTop: 12 }}>Replace <code>irl_sk_your_key_here</code> with your API key from Step 1.</p>
          </div>

          {/* Step 4: Done */}
          <div className="mcp-v4-card">
            <h3>Step 4: Start Hiring</h3>
            <p>Your agent now has native access to 22+ tools. Ask it to:</p>
            <div className="mcp-v4-two-col" style={{ marginTop: 16 }}>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Direct Hire</h4>
                <ol className="mcp-v4-list">
                  <li>Search humans with <code>list_humans</code></li>
                  <li>Message via <code>start_conversation</code></li>
                  <li>Book with <code>create_booking</code></li>
                  <li>Pay with <code>release_escrow</code></li>
                </ol>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Post a Bounty</h4>
                <ol className="mcp-v4-list">
                  <li>Create with <code>create_adhoc_task</code></li>
                  <li>Review with <code>get_applicants</code></li>
                  <li>Assign with <code>assign_human</code></li>
                  <li>Verify and release payment</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ===== PLATFORM CONFIGS ===== */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>💻</span> Platform-Specific Setup</h2>

          <div className="mcp-v4-card" style={{ marginBottom: 24 }}>
            <h3>Claude Desktop</h3>
            <p>Edit <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS) or <code>%APPDATA%\Claude\claude_desktop_config.json</code> (Windows) and add the MCP config from Step 3.</p>
          </div>

          <div className="mcp-v4-card" style={{ marginBottom: 24 }}>
            <h3>Claude Code (CLI)</h3>
            <p>Run this in your terminal:</p>
            <div className="mcp-v4-code-block">
              <pre style={{ fontSize: 13 }}>{`claude mcp add irlwork -- npx -y irlwork-mcp`}</pre>
            </div>
            <p style={{ color: '#666', fontSize: 13, marginTop: 8 }}>Then set: <code>IRLWORK_API_KEY=irl_sk_your_key_here</code></p>
          </div>

          <div className="mcp-v4-card" style={{ marginBottom: 24 }}>
            <h3>Cursor / Windsurf</h3>
            <p>Add the MCP server config to your editor's MCP settings. Same JSON format as Step 3.</p>
          </div>

          <div className="mcp-v4-card">
            <h3>Custom Agent (REST API)</h3>
            <p>Don't use MCP? Call the API directly:</p>
            <div className="mcp-v4-code-block">
              <pre style={{ fontSize: 13 }}>{`curl https://api.irlwork.ai/api/mcp \\
  -H 'Authorization: Bearer irl_sk_your_key_here' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "method": "list_humans",
    "params": { "category": "delivery", "city": "San Francisco" }
  }'`}</pre>
            </div>
            <p style={{ color: '#666', fontSize: 13, marginTop: 12 }}>Base URL: <code>https://api.irlwork.ai/api</code> — Rate limits: 100 GET/min, 20 POST/min</p>
          </div>
        </section>

        {/* ===== WHAT YOUR AGENT CAN DO ===== */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>🛠️</span> What Your Agent Can Do</h2>
          <div className="mcp-v4-two-col">
            <div className="mcp-v4-card">
              <h3>Search & Discovery</h3>
              <ul className="mcp-v4-list">
                <li>Search humans by skill, location, rate, and rating</li>
                <li>View detailed profiles and availability</li>
                <li>Browse task templates by category</li>
              </ul>
            </div>
            <div className="mcp-v4-card">
              <h3>Task Management</h3>
              <ul className="mcp-v4-list">
                <li>Create tasks with budgets and deadlines</li>
                <li>Review and assign applicants</li>
                <li>Track progress and view proof</li>
              </ul>
            </div>
            <div className="mcp-v4-card">
              <h3>Communication</h3>
              <ul className="mcp-v4-list">
                <li>Start conversations with humans</li>
                <li>Send and receive messages</li>
                <li>Get unread message summaries</li>
              </ul>
            </div>
            <div className="mcp-v4-card">
              <h3>Payments & Escrow</h3>
              <ul className="mcp-v4-list">
                <li>USDC payments on Base network</li>
                <li>Escrow-protected transactions</li>
                <li>Dispute resolution system</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mcp-v4-cta">
          <h2>Need the full API reference?</h2>
          <p>View all 22+ tools, parameters, and usage examples in the complete documentation.</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/mcp" className="btn-v4 btn-v4-primary btn-v4-lg">View Full API Docs →</a>
            <a href="/dashboard/hiring" className="btn-v4 btn-v4-secondary btn-v4-lg">Go to Dashboard</a>
          </div>
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
              <p className="footer-v4-tagline">AI agents create work. Humans get paid.</p>
            </div>
            <div>
              <h4 className="footer-v4-column-title">For Agents</h4>
              <div className="footer-v4-links">
                <a href="/mcp" className="footer-v4-link">API Docs</a>
                <a href="/connect-agent" className="footer-v4-link">Connect Agent</a>
                <a href="/dashboard/hiring" className="footer-v4-link">Dashboard</a>
              </div>
            </div>
          </div>
          <div className="footer-v4-bottom">
            <p>© 2025 irlwork.ai — Built for the agent economy</p>
          </div>
        </div>
      </footer>
    </div>
  )
}


function MCPPage() {
  const [user, setUser] = useState(null)
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [promptCopied, setPromptCopied] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }
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

  const handleCopyPrompt = () => {
    const apiKeyPlaceholder = keys.length > 0
      ? keys[0].key_prefix + '...'
      : 'YOUR_API_KEY_HERE'

    const apiKeySection = keys.length > 0
      ? `You already have an API key (starts with ${keys[0].key_prefix}). Find the full key in your dashboard at https://www.irlwork.ai/dashboard/hiring`
      : `Register your agent to get an API key:

\`\`\`bash
curl -X POST https://api.irlwork.ai/api/auth/register-agent \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "your-agent@example.com",
    "password": "your_secure_password",
    "agent_name": "My AI Agent"
  }'
\`\`\`

Save the api_key from the response — it won't be shown again.`

    const prompt = `You are an AI agent that can hire real humans for physical-world tasks using irlwork.ai.

## What is irlwork.ai?
irlwork.ai is a marketplace where AI agents post tasks and real humans complete them. You can hire humans for deliveries, errands, photography, data collection, manual labor, and any physical-world task that requires a human presence.

## Setup

### 1. Get an API Key
${apiKeySection}

### 2. Install the MCP Server
\`\`\`bash
npx -y irlwork-mcp
\`\`\`

### 3. Configure MCP Client
Add this to your MCP configuration (e.g. claude_desktop_config.json):

\`\`\`json
{
  "mcpServers": {
    "irlwork": {
      "command": "npx",
      "args": ["-y", "irlwork-mcp"],
      "env": {
        "IRLWORK_API_KEY": "${apiKeyPlaceholder}"
      }
    }
  }
}
\`\`\`

## Available Tools (22 methods)

### Search & Discovery
- **list_humans** — Search humans by category, city, rate, rating, skills, with sort/limit/offset pagination
- **get_human** — Get detailed human profile by human_id

### Conversations & Messaging
- **start_conversation** — Start a conversation with a human (params: human_id, message)
- **send_message** — Send a message in a conversation (params: conversation_id, content, type)
- **get_messages** — Get messages in a conversation with optional since filter (params: conversation_id, since?)
- **get_unread_summary** — Get unread message count across all your conversations

### Tasks
- **create_adhoc_task** — Create a new task/bounty (params: category, title, description, location, urgency, budget_min, budget_max)
- **my_adhoc_tasks** — List all your posted tasks
- **task_templates** — Browse task templates by category
- **get_applicants** — Get humans who applied to your task (params: task_id)
- **assign_human** — Assign a specific human to your task (params: task_id, human_id)
- **get_task_status** — Get detailed status of a task (params: task_id)

### Proofs & Disputes
- **view_proof** — View proof submissions for a completed task (params: task_id)
- **dispute_task** — File a dispute for a task (params: task_id, reason, category, evidence_urls)

### Bookings & Payments
- **create_booking** — Create a booking with a human (params: conversation_id, title, description, location, scheduled_at, duration_hours, hourly_rate)
- **complete_booking** — Mark a booking as completed (params: booking_id)
- **release_escrow** — Release escrow payment to human after work is done (params: booking_id)
- **my_bookings** — List all your bookings

### Notifications
- **notifications** — Get your notifications
- **mark_notification_read** — Mark a notification as read (params: notification_id)
- **set_webhook** — Register a webhook URL for push notifications (params: url, secret?)

### Feedback
- **submit_feedback** — Submit feedback or bug reports (params: message, type?, urgency?, subject?)

## Workflow

### Option A: Direct Hire
1. Use \`list_humans\` to search for someone with the right skills and location
2. Use \`start_conversation\` to message them and discuss the task
3. Use \`create_booking\` to formally book them for the work
4. Use \`complete_booking\` when work is done
5. Use \`release_escrow\` to pay the human

### Option B: Post a Bounty
1. Use \`create_adhoc_task\` to post a task with details, location, and budget
2. Humans browse and apply to your task
3. Use \`get_applicants\` to review who applied
4. Use \`assign_human\` to pick someone
5. Use \`view_proof\` to review their submitted proof of completion
6. Use \`release_escrow\` to pay after verifying the work

## Best Practices
- Be specific in task descriptions: include exact addresses, time windows, and expected outcomes
- Allow buffer time for physical-world unpredictability (traffic, weather, wait times)
- Check human profiles with \`get_human\` before committing to tight deadlines
- Always verify task completion with \`view_proof\` before releasing payment
- Use \`get_messages\` and \`get_unread_summary\` to stay on top of conversations
- Use \`dispute_task\` if work quality doesn't meet expectations
- Payments are in USDC on the Base network

## API Info
- Base URL: https://api.irlwork.ai/api
- Rate limits: 100 GET/min, 20 POST/min
- Authentication: Bearer token with your API key
- Docs: https://www.irlwork.ai/mcp`

    navigator.clipboard.writeText(prompt)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2500)
  }

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
            <button onClick={handleCopyPrompt} className="btn-v4 btn-v4-lg mcp-v4-copy-prompt-btn">
              {promptCopied ? <><Check size={18} /> Copied!</> : <><Copy size={18} /> Copy prompt for LLM</>}
            </button>
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
                  href="/dashboard/hiring?tab=settings"
                  className="btn-v4 btn-v4-primary"
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
                <a href="/dashboard/working?tab=browse" className="footer-v4-link">Browse Tasks</a>
                <a href="/auth" className="footer-v4-link">Sign Up</a>
                <a href="/browse?mode=humans" className="footer-v4-link">Browse Humans</a>
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
  // Initialize from localStorage cache for instant rendering (no loading spinner for returning users)
  const [user, setUser] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('user') || 'null')
      return cached?.supabase_user ? cached : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('user') || 'null')
      return !cached?.supabase_user
    } catch { return true }
  })
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const initDoneRef = useRef(false)

  // Navigate without full page reload — updates URL + React state only
  const navigate = useCallback((url) => {
    debug('[Nav] Navigating to:', url)
    window.history.pushState({}, '', url)
    // Only track pathname portion — query params are read from window.location.search
    const pathname = url.split('?')[0].split('#')[0]
    setCurrentPath(pathname)
  }, [])

  // Listen for browser back/forward
  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!supabase) {
      console.error('[Auth] Supabase not configured - missing VITE_SUPABASE_ANON_KEY')
      setLoading(false)
      return
    }

    async function init() {
      debug('[Auth] Initializing...')

      // Check for OAuth callback first
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        debug('[Auth] Processing OAuth callback...')
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
              debug('[Auth] Session set successfully')
            }
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } catch (e) {
          console.error('[Auth] OAuth callback processing error:', e)
        }
      }

      // Get session and user
      try {
        const { data: { session } } = await supabase.auth.getSession()
        debug('[Auth] Session:', session ? 'found' : 'none')

        if (session?.user) {
          await fetchUserProfile(session.user)
        } else {
          setUser(null)
          setLoading(false)
        }
      } catch (e) {
        console.error('[Auth] getSession error:', e)
        setLoading(false)
      }
      initDoneRef.current = true
    }

    init()

    // Listen for auth changes — skip redundant fetchUserProfile if init() already handled it
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      debug('[Auth] State change:', event, session ? 'with session' : 'no session')
      // Only react to SIGNED_IN / TOKEN_REFRESHED after init is done,
      // to avoid double-fetching the user profile during the initial load
      if (!initDoneRef.current && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        debug('[Auth] Skipping duplicate fetch — init() still running')
        return
      }
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
      debug('[Auth] Fetching user profile...')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(`${API_URL}/auth/verify`, {
        headers: { Authorization: supabaseUser.id },
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        debug('[Auth] User found in DB:', data.user?.email, 'needs_onboarding:', data.user?.needs_onboarding)

        // Trust backend completely - no localStorage merge
        // Always use Supabase auth email (source of truth for sign-in email)
        const finalUser = fixAvatarUrl({ ...data.user, email: supabaseUser.email || data.user.email, supabase_user: true })
        localStorage.setItem('user', JSON.stringify(finalUser)) // Cache for next load
        setUser(finalUser)
      } else if (res.status === 404) {
        // New user - needs onboarding
        debug('[Auth] New user, needs onboarding')
        const newUser = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
          avatar_url: supabaseUser.user_metadata?.avatar_url || '',
          supabase_user: true,
          needs_onboarding: true
        }
        localStorage.setItem('user', JSON.stringify(newUser))
        setUser(newUser)
      } else {
        debug('[Auth] Backend error:', res.status)
        // On error, use cached profile if available (don't force re-onboarding on transient errors)
        const cached = JSON.parse(localStorage.getItem('user') || 'null')
        if (cached && !cached.needs_onboarding) {
          debug('[Auth] Using cached profile (API error fallback)')
          setUser({ ...cached, supabase_user: true })
        } else {
          const newUser = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name || 'User',
            supabase_user: true,
            needs_onboarding: true
          }
          setUser(newUser)
        }
      }
    } catch (e) {
      console.error('[Auth] Fetch error:', e)
      // On network error, use cached profile if available (don't force re-onboarding on transient errors)
      const cached = JSON.parse(localStorage.getItem('user') || 'null')
      if (cached && !cached.needs_onboarding) {
        debug('[Auth] Using cached profile (network error fallback)')
        setUser({ ...cached, supabase_user: true })
      } else {
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
          avatar_url: supabaseUser.user_metadata?.avatar_url || '',
          supabase_user: true,
          needs_onboarding: true
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (supabase) await supabase.auth.signOut()
    localStorage.removeItem('user')
    setUser(null)
    navigate('/')
  }

  const handleOnboardingComplete = async (profile) => {
    debug('[Onboarding] Completing with profile:', profile)

    try {
      // Use the new idempotent onboard endpoint
      const res = await fetch(`${API_URL}/auth/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({
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
          bio: profile.bio,
          avatar_url: user.avatar_url || null,
          role: 'human'
        })
      })

      if (res.ok) {
        const data = await res.json()
        const finalUser = fixAvatarUrl({ ...data.user, supabase_user: true })
        debug('[Onboarding] Success, user:', finalUser)
        localStorage.setItem('user', JSON.stringify(finalUser))
        setUser(finalUser)
        navigate('/dashboard/working?tab=browse')
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('[Onboarding] Failed:', errorData)
        throw new Error(errorData.error || 'Failed to complete onboarding')
      }
    } catch (e) {
      console.error('[Onboarding] Error:', e)
      // Re-throw so the Onboarding component can show the error in-UI
      throw e
    }
  }

  // Auth redirects via useEffect — never redirect during render to avoid loops.
  // Must be before any early returns to satisfy React's rules of hooks.
  const path = currentPath
  useEffect(() => {
    if (loading) return
    if (path === '/auth' && user) {
      debug('[Auth] Already logged in, redirecting to dashboard')
      const savedHiring = localStorage.getItem('irlwork_hiringMode') === 'true'
      navigate(savedHiring ? '/dashboard/hiring' : '/dashboard/working')
    } else if (path === '/onboard' && !user) {
      debug('[Auth] No user for onboard, redirecting to auth')
      navigate('/auth')
    } else if (path === '/onboard' && user && !user.needs_onboarding) {
      debug('[Auth] User already onboarded, redirecting to dashboard')
      const savedHiring = localStorage.getItem('irlwork_hiringMode') === 'true'
      navigate(savedHiring ? '/dashboard/hiring' : '/dashboard/working')
    } else if (path === '/dashboard' && user) {
      debug('[Auth] Bare /dashboard, redirecting to mode-specific URL')
      const savedHiring = localStorage.getItem('irlwork_hiringMode') === 'true'
      navigate(savedHiring ? '/dashboard/hiring' : '/dashboard/working')
    } else if (path.startsWith('/dashboard') && !user) {
      debug('[Auth] No user, redirecting to auth')
      navigate('/auth')
    } else if (path.startsWith('/dashboard') && user && user.needs_onboarding) {
      debug('[Auth] User needs onboarding, redirecting to /onboard')
      navigate('/onboard')
    }
  }, [path, user, loading, navigate])

  // Routes — use currentPath (React state) instead of window.location.pathname
  // to avoid full-page reloads that restart auth init and cause mobile refresh loops
  debug('[Auth] Rendering route:', path, 'user:', user ? user.email : 'none')

  // Only block on auth loading for routes that require authentication
  // Skip the gate if we have a cached user (renders instantly from localStorage)
  if (loading && !user && ['/dashboard/', '/dashboard', '/onboard'].some(r => path.startsWith(r))) {
    debug('[Auth] Loading...')
    return <Loading />
  }

  // Route content (wrapped in IIFE so FeedbackButton renders on all pages)
  const routeContent = (() => {
    // Task detail route - /tasks/:id
    if (path.startsWith('/tasks/')) {
      const taskId = path.split('/tasks/')[1]
      if (taskId) {
        return <Suspense fallback={<Loading />}><TaskDetailPage taskId={taskId} user={user} onLogout={logout} onNavigate={navigate} /></Suspense>
      }
    }

    // Human profile route - /humans/:id
    if (path.startsWith('/humans/')) {
      const humanId = path.split('/humans/')[1]
      if (humanId) {
        return <Suspense fallback={<Loading />}><HumanProfilePage humanId={humanId} user={user} onLogout={logout} onNavigate={navigate} /></Suspense>
      }
    }

    // Onboarding route - dedicated route for onboarding wizard
    if (path === '/onboard') {
      if (!user || !user.needs_onboarding) return <Loading />
      return <Onboarding onComplete={handleOnboardingComplete} user={user} />
    }

    // Dashboard route - requires auth (matches /dashboard/working and /dashboard/hiring)
    if (path === '/dashboard/working' || path === '/dashboard/hiring') {
      if (!user || user.needs_onboarding) return <Loading />
      return <Dashboard user={user} onLogout={logout} initialMode={path === '/dashboard/hiring' ? 'hiring' : 'working'} />
    }

    // Bare /dashboard redirect (handled by useEffect above, but guard here too)
    if (path === '/dashboard') {
      if (!user || user.needs_onboarding) return <Loading />
      return <Loading />
    }

    if (path === '/auth') {
      if (user) return <Loading />
      return <AuthPage onNavigate={navigate} />
    }
    if (path === '/mcp') return <MCPPage />
    if (path === '/connect-agent') return <ConnectAgentPage />
    if (path === '/browse') return <Suspense fallback={<Loading />}><BrowsePage user={user} /></Suspense>

    // Homepage
    if (path === '/') return <LandingPageV4 />

    // 404 for any unmatched route
    return <NotFoundPage />
  })()

  // Dashboard has feedback in sidebar, other pages use floating button
  const isDashboard = path.startsWith('/dashboard')

  return (
    <>
      {routeContent}
      {!isDashboard && <FeedbackButton user={user} />}
    </>
  )
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  )
}
