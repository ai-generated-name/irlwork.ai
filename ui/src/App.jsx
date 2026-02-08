// irlwork.ai - Modern Clean UI with V4 Design System
import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import EarningsDashboard from './components/EarningsDashboard'
import TaskDetailPage from './pages/TaskDetailPage'
import LandingPageV4 from './pages/LandingPageV4'
import ReputationMetrics from './components/ReputationMetrics'
import CityAutocomplete from './components/CityAutocomplete.jsx'
import { v4, NavbarV4, FooterV4, PageLayoutV4, ButtonV4, InputV4, CardV4, LoadingV4, BadgeV4 } from './components/V4Layout'
import API_URL from './config/api'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqoxllqofxbcwxskguuj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxb3hsbHFvZnhiY3d4c2tndXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE5MjUsImV4cCI6MjA4NTc1NzkyNX0.kUi4_yHpg3H3rBUhi2L9a0KdcUQoYbiCC6hyPj-A0Yg'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

// V4-compatible styles for Dashboard (uses V4 colors with old class patterns)
const styles = {
  gradient: 'bg-[#FAF8F5]',
  card: 'bg-white border-2 border-[rgba(26,26,26,0.08)] rounded-2xl p-6 shadow-sm',
  input: 'w-full px-4 py-3 bg-white border-2 border-[rgba(26,26,26,0.1)] rounded-xl text-[#1A1A1A] placeholder-[#8A8A8A] focus:border-[#1A6B7F] focus:outline-none transition-colors',
}

// V4-styled Button for Dashboard compatibility
function Button({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false, ...props }) {
  const baseStyle = 'px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 cursor-pointer border-0 inline-flex items-center justify-center gap-2'
  const variants = {
    primary: 'bg-[#E07A5F] text-white hover:bg-[#C45F4A] shadow-md',
    secondary: 'bg-transparent text-[#0F4C5C] border-2 border-[#0F4C5C] hover:bg-[#0F4C5C] hover:text-white',
  }
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {children}
    </button>
  )
}

// V4 Loading Component
function Loading() {
  return <LoadingV4 />
}

// Old LandingPage removed - using LandingPageV4 from pages/LandingPageV4.jsx

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    city: '',
    skills: '',
    travel_radius: 10,
    hourly_rate: 25,
    latitude: null,
    longitude: null
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
        hourly_rate: form.hourly_rate,
        latitude: form.latitude,
        longitude: form.longitude
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: v4.colors.bgPrimary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: v4.fonts.display,
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{
              width: 40,
              height: 40,
              background: v4.colors.teal700,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 14,
            }}>irl</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: v4.colors.textPrimary }}>irlwork.ai</span>
          </a>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: v4.colors.textSecondary, marginBottom: 8 }}>
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 8, background: v4.colors.bgTertiary, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: v4.colors.teal500,
              transition: 'width 0.3s ease',
              width: `${progress}%`
            }} />
          </div>
        </div>

        <CardV4 style={{ padding: 32 }}>
          {/* Step 1: City */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: v4.colors.textPrimary, marginBottom: 8 }}>Where are you based?</h1>
                <p style={{ color: v4.colors.textSecondary }}>This helps show you relevant tasks in your area</p>
              </div>
              <CityAutocomplete
                value={form.city}
                onChange={(cityData) => setForm({
                  ...form,
                  city: cityData.city,
                  latitude: cityData.latitude,
                  longitude: cityData.longitude
                })}
                placeholder="Search for your city (e.g. San Francisco, USA)"
              />
              <ButtonV4 onClick={() => setStep(2)} disabled={!form.city.trim()} style={{ width: '100%' }}>
                Continue
              </ButtonV4>
            </div>
          )}

          {/* Step 2: Skills */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: v4.colors.textPrimary, marginBottom: 8 }}>What can you help with?</h1>
                <p style={{ color: v4.colors.textSecondary }}>Add your skills so agents know what you're great at</p>
              </div>
              <div>
                <InputV4
                  type="text"
                  placeholder="Skills (comma separated)"
                  value={form.skills}
                  onChange={e => setForm({ ...form, skills: e.target.value })}
                />
                <p style={{ fontSize: 13, color: v4.colors.textTertiary, marginTop: 8 }}>e.g. delivery, photography, coding, translation</p>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <ButtonV4 variant="secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</ButtonV4>
                <ButtonV4 onClick={() => setStep(3)} style={{ flex: 1 }}>Continue</ButtonV4>
              </div>
            </div>
          )}

          {/* Step 3: Travel Radius */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: v4.colors.textPrimary, marginBottom: 8 }}>How far can you travel?</h1>
                <p style={{ color: v4.colors.textSecondary }}>Maximum distance you're willing to travel for tasks</p>
              </div>
              <div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={form.travel_radius}
                  onChange={e => setForm({ ...form, travel_radius: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    accentColor: v4.colors.teal500,
                  }}
                />
                <p style={{ textAlign: 'center', color: v4.colors.teal700, fontSize: 24, fontWeight: 700, marginTop: 12 }}>
                  {form.travel_radius} miles
                </p>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <ButtonV4 variant="secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>Back</ButtonV4>
                <ButtonV4 onClick={() => setStep(4)} style={{ flex: 1 }}>Continue</ButtonV4>
              </div>
            </div>
          )}

          {/* Step 4: Hourly Rate */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: v4.colors.textPrimary, marginBottom: 8 }}>What's your rate?</h1>
                <p style={{ color: v4.colors.textSecondary }}>Minimum hourly rate for your work</p>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: v4.colors.textSecondary,
                  fontSize: 18,
                  fontWeight: 600,
                }}>$</span>
                <InputV4
                  type="number"
                  placeholder="25"
                  value={form.hourly_rate}
                  onChange={e => setForm({ ...form, hourly_rate: parseInt(e.target.value) || 0 })}
                  style={{ paddingLeft: 36 }}
                />
                <span style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: v4.colors.textTertiary,
                  fontSize: 14,
                }}>/hour</span>
              </div>
              {error && (
                <div style={{
                  background: v4.colors.errorBg,
                  border: `1px solid ${v4.colors.error}`,
                  color: v4.colors.error,
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontSize: 14,
                }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 16 }}>
                <ButtonV4 variant="secondary" onClick={() => setStep(3)} style={{ flex: 1 }}>Back</ButtonV4>
                <ButtonV4 onClick={handleSubmit} disabled={loading || !form.hourly_rate} style={{ flex: 1 }}>
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </ButtonV4>
              </div>
            </div>
          )}
        </CardV4>
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

  // Error Modal - V4 styled
  if (errorModal) {
    return (
      <div style={{
        minHeight: '100vh',
        background: v4.colors.bgPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: v4.fonts.display,
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <CardV4 style={{ padding: 32 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 64,
                height: 64,
                background: v4.colors.errorBg,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <span style={{ fontSize: 28 }}>⚠️</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: v4.colors.textPrimary }}>{errorModal.title}</h2>
            </div>
            <p style={{ color: v4.colors.textSecondary, marginBottom: 16, textAlign: 'center' }}>{errorModal.message}</p>
            {errorModal.details && (
              <div style={{
                background: v4.colors.bgTertiary,
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
              }}>
                <p style={{ color: v4.colors.textSecondary, fontSize: 13, whiteSpace: 'pre-line' }}>{errorModal.details}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 16 }}>
              <ButtonV4 variant="secondary" onClick={() => { setErrorModal(null); window.history.replaceState({}, document.title, window.location.pathname) }} style={{ flex: 1 }}>
                Try Again
              </ButtonV4>
              <ButtonV4 onClick={() => window.location.href = '/'} style={{ flex: 1 }}>
                Go Home
              </ButtonV4>
            </div>
          </CardV4>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: v4.colors.bgPrimary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: v4.fonts.display,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{
              width: 40,
              height: 40,
              background: v4.colors.teal700,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 14,
            }}>irl</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: v4.colors.textPrimary }}>irlwork.ai</span>
          </a>
        </div>

        <CardV4 style={{ padding: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: v4.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ color: v4.colors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
            {isLogin ? 'Sign in to continue' : 'Start earning from real-world tasks'}
          </p>

          {error && (
            <div style={{
              background: v4.colors.errorBg,
              border: `1px solid ${v4.colors.error}`,
              color: v4.colors.error,
              padding: '12px 16px',
              borderRadius: 12,
              marginBottom: 24,
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: v4.colors.bgSecondary,
              border: `2px solid rgba(26, 26, 26, 0.1)`,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              fontFamily: v4.fonts.display,
              fontWeight: 600,
              fontSize: 15,
              color: v4.colors.textPrimary,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              marginBottom: 24,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(26, 26, 26, 0.1)' }} />
            <span style={{ color: v4.colors.textTertiary, fontSize: 13 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(26, 26, 26, 0.1)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!isLogin && (
              <InputV4
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required={!isLogin}
              />
            )}
            <InputV4
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
            <InputV4
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
            <ButtonV4 type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </ButtonV4>
          </form>

          <p style={{ textAlign: 'center', color: v4.colors.textSecondary, marginTop: 24, fontSize: 14 }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              style={{
                background: 'none',
                border: 'none',
                color: v4.colors.coral500,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: v4.fonts.display,
              }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </CardV4>

        <button
          onClick={() => window.location.href = '/'}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            color: v4.colors.textSecondary,
            marginTop: 24,
            fontSize: 14,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: v4.fonts.display,
          }}
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
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: 24,
      fontFamily: v4.fonts.display,
    }}>
      <CardV4 style={{ maxWidth: 520, width: '100%', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: v4.colors.textPrimary }}>Submit Proof</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: v4.colors.textTertiary, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', color: v4.colors.textSecondary, fontSize: 14, marginBottom: 8 }}>Describe your work</label>
            <textarea
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="Describe what you did to complete this task..."
              rows={4}
              style={{
                width: '100%',
                padding: '14px 18px',
                background: v4.colors.bgSecondary,
                border: `2px solid rgba(26, 26, 26, 0.1)`,
                borderRadius: 12,
                color: v4.colors.textPrimary,
                fontSize: 15,
                fontFamily: v4.fonts.display,
                resize: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: v4.colors.textSecondary, fontSize: 14, marginBottom: 8 }}>Upload Proof (max 3 files)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed rgba(26, 26, 26, 0.2)`,
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
              <div style={{ fontSize: 28, marginBottom: 8 }}>📤</div>
              <p style={{ color: v4.colors.textTertiary, fontSize: 14 }}>Click to upload images</p>
            </div>
            {files.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {files.map((file, i) => (
                  <div key={i} style={{ background: v4.colors.bgTertiary, borderRadius: 8, padding: '6px 12px', fontSize: 13, color: v4.colors.textSecondary }}>
                    {file.name.slice(0, 15)}...
                  </div>
                ))}
              </div>
            )}
          </div>
          {uploadedUrls.length > 0 && (
            <p style={{ color: v4.colors.success, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✓</span> {uploadedUrls.length} files uploaded
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <ButtonV4 variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</ButtonV4>
          <ButtonV4 onClick={handleSubmit} disabled={submitting} style={{ flex: 1 }}>
            {submitting ? 'Submitting...' : 'Submit Proof'}
          </ButtonV4>
        </div>
      </CardV4>
    </div>
  )
}

function ProofReviewModal({ task, onClose, onApprove, onReject }) {
  const [feedback, setFeedback] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [hours, setHours] = useState(24)

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: 24,
      fontFamily: v4.fonts.display,
    }}>
      <CardV4 style={{ maxWidth: 520, width: '100%', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: v4.colors.textPrimary }}>Review Proof</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: v4.colors.textTertiary, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div style={{ background: v4.colors.bgTertiary, borderRadius: 12, padding: 16 }}>
            <h3 style={{ fontWeight: 600, color: v4.colors.textPrimary, marginBottom: 8 }}>{task?.title}</h3>
            <p style={{ color: v4.colors.textSecondary, fontSize: 14 }}>{task?.description}</p>
          </div>
          {task?.proof_description && (
            <div style={{ background: v4.colors.bgTertiary, borderRadius: 12, padding: 16 }}>
              <h4 style={{ color: v4.colors.textSecondary, fontSize: 14, marginBottom: 8 }}>Human's Proof:</h4>
              <p style={{ color: v4.colors.textPrimary }}>{task.proof_description}</p>
            </div>
          )}
          {task?.proof_urls?.length > 0 && (
            <div>
              <h4 style={{ color: v4.colors.textSecondary, fontSize: 14, marginBottom: 8 }}>Proof Images:</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {task.proof_urls.map((url, i) => (
                  <img key={i} src={url} alt={`Proof ${i + 1}`} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8 }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', color: v4.colors.textSecondary, fontSize: 14, marginBottom: 8 }}>Feedback (required for reject)</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide feedback..."
              rows={3}
              style={{
                width: '100%',
                padding: '14px 18px',
                background: v4.colors.bgSecondary,
                border: `2px solid rgba(26, 26, 26, 0.1)`,
                borderRadius: 12,
                color: v4.colors.textPrimary,
                fontSize: 15,
                fontFamily: v4.fonts.display,
                resize: 'none',
              }}
            />
          </div>
          {rejecting && (
            <div>
              <label style={{ display: 'block', color: v4.colors.textSecondary, fontSize: 14, marginBottom: 8 }}>Extend deadline by (hours)</label>
              <InputV4
                type="number"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                min={1}
                max={168}
              />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <ButtonV4 variant="secondary" onClick={onClose} style={{ flex: 1 }}>Close</ButtonV4>
          <ButtonV4 variant="secondary" onClick={() => setRejecting(!rejecting)} style={{ flex: 1 }}>
            {rejecting ? 'Cancel' : 'Reject'}
          </ButtonV4>
          <ButtonV4 variant="success" onClick={onApprove} style={{ flex: 1 }}>
            Approve & Pay
          </ButtonV4>
        </div>
        {rejecting && (
          <ButtonV4 variant="danger" onClick={() => onReject({ feedback, extendHours: hours })} disabled={!feedback.trim()} style={{ width: '100%', marginTop: 12 }}>
            Confirm Rejection
          </ButtonV4>
        )}
      </CardV4>
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
  const [radiusFilter, setRadiusFilter] = useState(user?.travel_radius || 25)
  const [profileCityData, setProfileCityData] = useState(null)
  const [showProofSubmit, setShowProofSubmit] = useState(null)
  const [showProofReview, setShowProofReview] = useState(null)

  // Create Task form state
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', category: '',
    budget: '', city: '', latitude: null, longitude: null
  })
  const [createTaskLoading, setCreateTaskLoading] = useState(false)
  const [createTaskError, setCreateTaskError] = useState('')

  const TASK_CATEGORIES = [
    { value: 'delivery', label: 'Delivery & Pickup' },
    { value: 'photography', label: 'Photography' },
    { value: 'errands', label: 'Errands' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'moving', label: 'Moving & Labor' },
    { value: 'tech', label: 'Tech Support' },
    { value: 'general', label: 'General Task' }
  ]
  const MIN_BUDGET = 5

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

  // Refetch humans when radius filter changes
  useEffect(() => {
    if (!hiringMode && activeTab === 'humans') {
      fetchHumans()
    }
  }, [radiusFilter])

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
      // Build query params with distance filtering if user has coordinates
      const params = new URLSearchParams();
      if (user.latitude && user.longitude && radiusFilter) {
        params.append('user_lat', user.latitude);
        params.append('user_lng', user.longitude);
        params.append('radius', radiusFilter);
      }

      const url = `${API_URL}/humans${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: user.id } });

      if (res.ok) {
        const data = await res.json();
        setHumans(data || []);
      }
    } catch (e) {
      console.log('Could not fetch humans');
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

  const handleCreateTask = async (e) => {
    e.preventDefault()
    setCreateTaskError('')

    // Validation
    if (!taskForm.title.trim()) {
      setCreateTaskError('Title is required')
      return
    }
    if (!taskForm.category) {
      setCreateTaskError('Please select a category')
      return
    }
    if (!taskForm.budget || parseFloat(taskForm.budget) < MIN_BUDGET) {
      setCreateTaskError(`Minimum budget is $${MIN_BUDGET}`)
      return
    }
    if (!taskForm.city) {
      setCreateTaskError('Please select a location')
      return
    }

    setCreateTaskLoading(true)

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
          city: taskForm.city,
          latitude: taskForm.latitude,
          longitude: taskForm.longitude
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create task')
      }

      // Reset form and switch to posted tasks
      setTaskForm({
        title: '', description: '', category: '',
        budget: '', city: '', latitude: null, longitude: null
      })
      setActiveTab('posted')
      fetchPostedTasks()
    } catch (err) {
      setCreateTaskError(err.message)
    } finally {
      setCreateTaskLoading(false)
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
      open: 'bg-[#D1E9F0] text-[#0F4C5C]',
      accepted: 'bg-[#E8D5F0] text-[#6B21A8]',
      in_progress: 'bg-[#FEF3C7] text-[#D97706]',
      pending_review: 'bg-[#FFE4DB] text-[#C45F4A]',
      completed: 'bg-[#D1FAE5] text-[#059669]',
      paid: 'bg-[#F5F2ED] text-[#525252]',
    }
    return colors[status] || 'bg-[#F5F2ED] text-[#525252]'
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className={`min-h-screen ${styles.gradient}`}>
      {/* Mobile Header - visible on small screens */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-[rgba(250,248,245,0.95)] backdrop-blur-lg border-b border-[rgba(26,26,26,0.1)]">
        <a href="/" className="flex items-center gap-2 no-underline">
          <div className="w-9 h-9 bg-[#0F4C5C] rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">
            irl
          </div>
          <span className="text-base font-extrabold text-[#1A1A1A]">irlwork.ai</span>
        </a>
        <div className="flex items-center gap-3">
          <a href="/mcp" className="text-[#525252] no-underline text-sm font-medium">Agents</a>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 flex items-center justify-center text-[#525252] bg-white rounded-xl border border-[rgba(26,26,26,0.1)]"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[#FAF8F5] pt-16">
          <nav className="p-4 space-y-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all text-lg ${
                  activeTab === item.id
                    ? 'bg-[#0F4C5C] text-white'
                    : 'text-[#525252] bg-white border border-[rgba(26,26,26,0.08)]'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <div className="pt-4 border-t border-[rgba(26,26,26,0.08)] mt-4">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-4 text-[#DC2626] bg-white border border-[rgba(26,26,26,0.08)] rounded-xl"
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar - hidden on mobile */}
        <aside className="hidden lg:flex w-64 bg-white border-r border-[rgba(26,26,26,0.08)] p-6 flex-col fixed left-0 top-0 bottom-0">
          <div
            className="flex items-center gap-3 mb-8 cursor-pointer"
            onClick={() => window.location.href = '/'}
          >
            <div className="w-10 h-10 bg-[#0F4C5C] rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">irl</span>
            </div>
            <span className="text-xl font-bold text-[#1A1A1A]">irlwork.ai</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id
                    ? 'bg-[#0F4C5C] text-white'
                    : 'text-[#525252] hover:bg-[#F5F2ED] hover:text-[#1A1A1A]'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="border-t border-[rgba(26,26,26,0.08)] pt-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[rgba(15,76,92,0.1)] rounded-full flex items-center justify-center text-[#0F4C5C] font-bold">
                {user?.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="text-[#1A1A1A] font-medium text-sm">{user?.name || 'User'}</p>
                <p className="text-[#8A8A8A] text-xs">{hiringMode ? 'Hiring Mode' : 'Working Mode'}</p>
              </div>
            </div>

            {/* Notifications Bell */}
            <div className="relative mb-4">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-full flex items-center gap-3 px-4 py-3 text-[#525252] hover:text-[#1A1A1A] rounded-xl hover:bg-[#F5F2ED] transition-all"
              >
                <span className="relative">
                  <span>🔔</span>
                  {notifications.filter(n => !n.read_at).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E07A5F] rounded-full text-xs flex items-center justify-center text-white">
                      {notifications.filter(n => !n.read_at).length}
                    </span>
                  )}
                </span>
                <span>Notifications</span>
              </button>

              {showNotifications && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-[rgba(26,26,26,0.1)] rounded-xl max-h-80 overflow-y-auto shadow-lg">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-[#525252] text-sm text-center">No notifications</div>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div
                        key={n.id}
                        className={`p-3 border-b border-[rgba(26,26,26,0.08)] cursor-pointer hover:bg-[#F5F2ED] ${!n.read_at ? 'bg-[rgba(224,122,95,0.08)]' : ''}`}
                        onClick={() => markNotificationRead(n.id)}
                      >
                        <p className="text-[#1A1A1A] text-sm font-medium">{n.title}</p>
                        <p className="text-[#525252] text-xs">{n.message}</p>
                        <p className="text-[#8A8A8A] text-xs mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-[#525252] hover:text-[#1A1A1A] rounded-xl hover:bg-[#F5F2ED] transition-all"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 lg:p-8 lg:ml-64 pt-20 lg:pt-8 overflow-auto min-h-screen">
        {/* Hiring Mode: My Tasks Tab */}
        {hiringMode && activeTab === 'posted' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">My Tasks</h1>

            {loading ? (
              <p className="text-[#525252]">Loading...</p>
            ) : postedTasks.length === 0 ? (
              <div className={`${styles.card} text-center py-12`}>
                <p className="text-[#525252] mb-4">No tasks posted yet</p>
                <p className="text-sm text-[#8A8A8A]">Create a task to get started</p>
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
                          <h3 className="text-lg font-semibold text-[#1A1A1A] mt-2">{task.title}</h3>
                          <p className="text-[#525252] text-sm">{task.category} • {task.city || 'Remote'} • Budget: ${task.budget}</p>
                          {task.assignee && (
                            <p className="text-[#525252] text-sm mt-1">Assigned to: {task.assignee.name}</p>
                          )}
                        </div>
                        <p className="text-[#059669] font-bold">${task.budget || 0}</p>
                      </div>
                      {needsAction && (
                        <div className="flex gap-3 mt-4">
                          <Button onClick={() => setShowProofReview(task.id)}>
                            Review Proof
                          </Button>
                        </div>
                      )}
                      {task.status === 'paid' && (
                        <p className="text-[#059669] text-sm mt-2">💸 Payment released</p>
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
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">Create Task</h1>
            <div className={`${styles.card} max-w-2xl`}>
              <form className="space-y-4" onSubmit={handleCreateTask}>
                <div>
                  <input
                    type="text"
                    placeholder="Task title"
                    className={styles.input}
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Description (optional)"
                    rows={4}
                    className={styles.input}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    className={styles.input}
                    value={taskForm.category}
                    onChange={(e) => setTaskForm({...taskForm, category: e.target.value})}
                    required
                  >
                    <option value="">Select Category</option>
                    {TASK_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder={`Budget (min $${MIN_BUDGET})`}
                    className={styles.input}
                    value={taskForm.budget}
                    onChange={(e) => setTaskForm({...taskForm, budget: e.target.value})}
                    min={MIN_BUDGET}
                    required
                  />
                </div>
                <CityAutocomplete
                  placeholder="Search for task location..."
                  value={taskForm.city}
                  onChange={(cityData) => {
                    setTaskForm({
                      ...taskForm,
                      city: cityData?.name || '',
                      latitude: cityData?.latitude || null,
                      longitude: cityData?.longitude || null
                    })
                  }}
                />
                {createTaskError && (
                  <p className="text-red-500 text-sm">{createTaskError}</p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createTaskLoading}
                >
                  {createTaskLoading ? 'Creating...' : 'Create Task'}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Hiring Mode: Hired Tab */}
        {hiringMode && activeTab === 'humans' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">Hired</h1>
            <div className={`${styles.card} text-center py-12`}>
              <p className="text-[#525252]">No humans hired yet</p>
              <p className="text-sm text-[#8A8A8A] mt-2">Hire someone for a task</p>
            </div>
          </div>
        )}

        {/* Working Mode: My Tasks Tab */}
        {!hiringMode && activeTab === 'tasks' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-[#1A1A1A]">My Tasks</h1>
              <span className="text-[#525252]">{tasks.filter(t => t.status === 'in_progress').length} active</span>
            </div>

            {loading ? (
              <p className="text-[#525252]">Loading...</p>
            ) : tasks.length === 0 ? (
              <div className={`${styles.card} text-center py-16`}>
                <div className="text-6xl mb-4">{Icons.task}</div>
                <p className="text-[#525252] mb-2">No tasks yet</p>
                <p className="text-sm text-[#8A8A8A]">Switch to Hiring Mode to create tasks, or browse available tasks from agents</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Task Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className={`${styles.card} text-center`}>
                    <p className="text-2xl font-bold text-[#1A1A1A]">{tasks.filter(t => t.status === 'open').length}</p>
                    <p className="text-xs text-[#525252]">Open</p>
                  </div>
                  <div className={`${styles.card} text-center`}>
                    <p className="text-2xl font-bold text-[#D97706]">{tasks.filter(t => t.status === 'in_progress').length}</p>
                    <p className="text-xs text-[#525252]">Active</p>
                  </div>
                  <div className={`${styles.card} text-center`}>
                    <p className="text-2xl font-bold text-[#059669]">{tasks.filter(t => t.status === 'completed').length}</p>
                    <p className="text-xs text-[#525252]">Completed</p>
                  </div>
                  <div className={`${styles.card} text-center`}>
                    <p className="text-2xl font-bold text-[#0F4C5C]">${tasks.filter(t => t.status === 'paid').reduce((a, t) => a + (t.budget || 0), 0)}</p>
                    <p className="text-xs text-[#525252]">Earned</p>
                  </div>
                </div>

                {tasks.map(task => (
                  <div key={task.id} className={`${styles.card}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`inline-block text-xs px-2 py-1 rounded ${getTaskStatus(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </span>
                        <h3 className="text-lg font-semibold text-[#1A1A1A] mt-2">{task.title}</h3>
                        <p className="text-[#525252] text-sm mt-1">{task.category} • {task.city || 'Remote'}</p>
                      </div>
                      <p className="text-[#059669] font-bold text-xl">${task.budget || 0}</p>
                    </div>

                    {task.description && (
                      <p className="text-[#525252] text-sm mb-4">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-[#8A8A8A] mb-4">
                      <span>{Icons.calendar} Posted: {new Date(task.created_at || Date.now()).toLocaleDateString()}</span>
                      {task.deadline && <span>📅 Due: {new Date(task.deadline).toLocaleDateString()}</span>}
                      {task.agent_name && <span>👤 Agent: {task.agent_name}</span>}
                    </div>

                    <div className="flex gap-3">
                      {task.status === 'open' && (
                        <>
                          <Button onClick={() => acceptTask(task.id)}>{Icons.check} Accept Task</Button>
                          <Button variant="secondary" onClick={() => window.location.href = `/dashboard/task/${task.id}`}>View Details</Button>
                        </>
                      )}
                      {task.status === 'accepted' && (
                        <>
                          <Button onClick={() => {
                            fetch(`${API_URL}/tasks/${task.id}/start`, { method: 'POST', headers: { Authorization: user.id } })
                              .then(() => fetchTasks())
                          }}>▶️ Start Work</Button>
                          <Button variant="secondary" onClick={() => window.location.href = `/dashboard/task/${task.id}`}>View Details</Button>
                        </>
                      )}
                      {task.status === 'in_progress' && (
                        <Button onClick={() => window.location.href = `/dashboard/task/${task.id}`}>✓ Submit Proof</Button>
                      )}
                      {task.status === 'pending_review' && (
                        <>
                          <Button variant="secondary" disabled>Waiting for approval...</Button>
                          <Button onClick={() => window.location.href = `/dashboard/task/${task.id}`}>View Details</Button>
                        </>
                      )}
                      {task.status === 'completed' && (
                        <>
                          <span className="text-[#059669] flex items-center gap-2">{Icons.check} Payment pending</span>
                          <Button variant="secondary" onClick={() => window.location.href = `/dashboard/task/${task.id}`}>View Details</Button>
                        </>
                      )}
                      {task.status === 'paid' && (
                        <>
                          <span className="text-[#0F4C5C] flex items-center gap-2">{Icons.dollar} Paid!</span>
                          <Button variant="secondary" onClick={() => window.location.href = `/dashboard/task/${task.id}`}>View Details</Button>
                        </>
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
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">Browse Workers</h1>

            {/* Radius Filter */}
            {user.latitude && user.longitude && (
              <div className="mb-6 bg-white border border-[rgba(26,26,26,0.08)] rounded-xl p-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-[#525252] text-sm font-medium">
                    Search within {radiusFilter} miles{user.city ? ` of ${user.city}` : ''}
                  </label>
                  <button
                    onClick={() => setRadiusFilter(user.travel_radius || 25)}
                    className="text-[#E07A5F] text-xs hover:text-[#C45F4A]"
                  >
                    Reset to default ({user.travel_radius || 25} mi)
                  </button>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={radiusFilter}
                  onChange={(e) => setRadiusFilter(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#F5F2ED] rounded-lg appearance-none cursor-pointer slider accent-[#0F4C5C]"
                />
                <div className="flex justify-between text-xs text-[#8A8A8A] mt-2">
                  <span>5 mi</span>
                  <span>25 mi</span>
                  <span>50 mi</span>
                  <span>75 mi</span>
                  <span>100 mi</span>
                </div>
              </div>
            )}

            {/* Search & Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8A8A]">{Icons.search}</span>
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
                <p className="text-[#525252]">No workers available</p>
                <p className="text-sm text-[#8A8A8A] mt-2">Check back later for available humans</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {humans
                  .filter(h => !searchQuery || h.name?.toLowerCase().includes(searchQuery.toLowerCase()) || h.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
                  .filter(h => !filterCategory || h.skills?.includes(filterCategory))
                  .map(human => (
                  <div key={human.id} className={`${styles.card}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-[rgba(15,76,92,0.1)] rounded-full flex items-center justify-center text-[#0F4C5C] font-bold text-xl">
                        {human.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-[#1A1A1A]">{human.name}</h3>
                            <p className="text-[#525252] text-sm">
                              {Icons.location} {human.city || 'Remote'}
                              {human.distance != null && (
                                <span className="text-[#E07A5F] ml-2">
                                  • {human.distance.toFixed(1)} mi away
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[#059669] font-bold text-lg">${human.hourly_rate || 25}/hr</p>
                            {human.rating > 0 && (
                              <p className="text-[#D97706] text-sm">{Icons.star} {human.rating.toFixed(1)}</p>
                            )}
                          </div>
                        </div>
                        {human.bio && <p className="text-[#525252] text-sm mt-2 line-clamp-2">{human.bio}</p>}
                        {human.skills && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {human.skills.slice(0, 5).map((skill, i) => (
                              <span key={i} className="text-xs bg-[rgba(15,76,92,0.1)] text-[#0F4C5C] px-2 py-0.5 rounded-full">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-xs text-[#8A8A8A]">{human.jobs_completed || 0} jobs completed</span>
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
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">Earnings Dashboard</h1>
            <EarningsDashboard user={user} />
          </div>
        )}

        {/* Profile Tab - Updated with Settings */}
        {activeTab === 'profile' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">Profile</h1>

            <div className={`${styles.card} max-w-xl`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-[rgba(15,76,92,0.1)] rounded-full flex items-center justify-center text-[#0F4C5C] font-bold text-2xl">
                  {user?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-[#1A1A1A]">{user?.name}</h2>
                  <p className="text-[#525252]">{user?.email}</p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="mb-6 p-4 bg-[#F5F2ED] rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-[#1A1A1A] font-medium">Mode</p>
                    <p className="text-xs text-[#8A8A8A]">Switch between working and hiring</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${hiringMode ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-[#D1E9F0] text-[#0F4C5C]'}`}>
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
                <div className="flex justify-between py-3 border-b border-[rgba(26,26,26,0.08)]">
                  <span className="text-[#525252]">Location</span>
                  <span className="text-[#1A1A1A]">{user?.city || 'Not set'}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-[rgba(26,26,26,0.08)]">
                  <span className="text-[#525252]">Hourly Rate</span>
                  <span className="text-[#1A1A1A]">${user?.hourly_rate || 25}/hr</span>
                </div>
                <div className="flex justify-between py-3 border-b border-[rgba(26,26,26,0.08)]">
                  <span className="text-[#525252]">Travel Radius</span>
                  <span className="text-[#1A1A1A]">{user?.travel_radius || 25} miles</span>
                </div>
                <div className="flex justify-between py-3 border-b border-[rgba(26,26,26,0.08)]">
                  <span className="text-[#525252]">Skills</span>
                  <span className="text-[#1A1A1A]">{user?.skills?.join(', ') || 'None'}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-[#525252]">Jobs Completed</span>
                  <span className="text-[#1A1A1A]">{user?.jobs_completed || 0}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-[rgba(26,26,26,0.08)]">
                <Button variant="secondary" className="w-full">Edit Profile</Button>
              </div>
            </div>

            {/* Reputation Metrics */}
            <div className="mt-8">
              <ReputationMetrics user={user} isHiringMode={hiringMode} />
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">Settings</h1>

            <div className={`${styles.card} max-w-2xl mb-6`}>
              <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">Profile Settings</h2>

              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                try {
                  const updateData = {
                    name: formData.get('name'),
                    hourly_rate: parseInt(formData.get('hourly_rate')) || 25,
                    bio: formData.get('bio'),
                    travel_radius: parseInt(formData.get('travel_radius')) || 25
                  };

                  // Add city data if user selected a new city
                  if (profileCityData) {
                    updateData.city = profileCityData.city;
                    updateData.latitude = profileCityData.latitude;
                    updateData.longitude = profileCityData.longitude;
                  } else if (user.city) {
                    // Keep existing city and coordinates if not changed
                    updateData.city = user.city;
                    updateData.latitude = user.latitude;
                    updateData.longitude = user.longitude;
                  }

                  const res = await fetch(`${API_URL}/humans/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: user.id },
                    body: JSON.stringify(updateData)
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
                    <label className="block text-[#525252] text-sm mb-2">Full Name</label>
                    <input type="text" name="name" defaultValue={user?.name} className={styles.input} />
                  </div>
                  <div>
                    <label className="block text-[#525252] text-sm mb-2">City</label>
                    <CityAutocomplete
                      value={profileCityData?.city || user?.city || ''}
                      onChange={(cityData) => setProfileCityData(cityData)}
                      placeholder={user?.city || "Search for your city..."}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#525252] text-sm mb-2">Hourly Rate ($)</label>
                    <input type="number" name="hourly_rate" defaultValue={user?.hourly_rate || 25} min={5} max={500} className={styles.input} />
                  </div>
                  <div>
                    <label className="block text-[#525252] text-sm mb-2">Travel Radius (miles)</label>
                    <input type="number" name="travel_radius" defaultValue={user?.travel_radius || 25} min={1} max={100} className={styles.input} />
                  </div>
                </div>

                <div>
                  <label className="block text-[#525252] text-sm mb-2">Bio</label>
                  <textarea name="bio" rows={3} defaultValue={user?.bio || ''} className={`${styles.input} resize-none`} placeholder="Tell agents about yourself..." />
                </div>

                <Button type="submit" className="w-full">Save Changes</Button>
              </form>
            </div>

            <div className={`${styles.card} max-w-2xl mb-6`}>
              <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">Skills</h2>
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
                <p className="text-xs text-[#8A8A8A]">Separate skills with commas</p>
                <Button type="submit" className="w-full">Update Skills</Button>
              </form>
            </div>

            <div className={`${styles.card} max-w-2xl`}>
              <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-[#F5F2ED] border-[rgba(26,26,26,0.2)] accent-[#0F4C5C]" />
                  <span className="text-[#1A1A1A]">Task assignments</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-[#F5F2ED] border-[rgba(26,26,26,0.2)] accent-[#0F4C5C]" />
                  <span className="text-[#1A1A1A]">Payment notifications</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-[#F5F2ED] border-[rgba(26,26,26,0.2)] accent-[#0F4C5C]" />
                  <span className="text-[#1A1A1A]">Messages from agents</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded bg-[#F5F2ED] border-[rgba(26,26,26,0.2)] accent-[#0F4C5C]" />
                  <span className="text-[#1A1A1A]">Marketing & updates</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">Messages</h1>

            <div className={`${styles.card} p-0 overflow-hidden`} style={{ height: 'calc(100vh - 200px)' }}>
              <div className="grid md:grid-cols-3 h-full">
                {/* Conversations List */}
                <div className="border-r border-[rgba(26,26,26,0.08)] overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-6 text-center text-[#525252]">No conversations yet</div>
                  ) : (
                    conversations.map(c => (
                      <div
                        key={c.id}
                        className={`p-4 border-b border-[rgba(26,26,26,0.08)] cursor-pointer hover:bg-[#F5F2ED] ${selectedConversation === c.id ? 'bg-[rgba(15,76,92,0.1)]' : ''}`}
                        onClick={() => { setSelectedConversation(c.id); fetchMessages(c.id) }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[rgba(15,76,92,0.1)] rounded-full flex items-center justify-center text-[#0F4C5C] font-bold">
                            {c.other_user?.name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#1A1A1A] font-medium truncate">{c.otherUser?.name || 'Unknown'}</p>
                            <p className="text-[#525252] text-sm truncate">{c.last_message || 'No messages'}</p>
                          </div>
                          {c.unread > 0 && (
                            <span className="bg-[#E07A5F] text-white text-xs px-2 py-0.5 rounded-full">{c.unread}</span>
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
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF8F5]">
                        {messages.map(m => (
                          <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-xl p-3 ${m.sender_id === user.id ? 'bg-[#0F4C5C] text-white' : 'bg-white text-[#1A1A1A] border border-[rgba(26,26,26,0.08)]'}`}>
                              <p>{m.content}</p>
                              <p className={`text-xs mt-1 ${m.sender_id === user.id ? 'text-[rgba(255,255,255,0.7)]' : 'text-[#8A8A8A]'}`}>
                                {new Date(m.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={sendMessage} className="p-4 border-t border-[rgba(26,26,26,0.08)] flex gap-3 bg-white">
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
                    <div className="flex-1 flex items-center justify-center text-[#525252]">
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
    </div>
  )
}

function MCPPage() {
  return (
    <PageLayoutV4>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h1 style={{ fontSize: 48, fontWeight: 700, color: v4.colors.textPrimary, marginBottom: 16 }}>
            MCP <span style={{ color: v4.colors.teal700 }}>Integration</span>
          </h1>
          <p style={{ fontSize: 18, color: v4.colors.textSecondary, maxWidth: 600, margin: '0 auto' }}>
            Connect your AI agent to hire real humans for physical-world tasks. One command install via Model Context Protocol.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 32 }}>
            <a href="#quick-start" style={{
              padding: '14px 28px',
              background: v4.colors.coral500,
              color: 'white',
              fontWeight: 600,
              borderRadius: 12,
              textDecoration: 'none',
            }}>
              Install Now
            </a>
            <a href="#tools" style={{
              padding: '14px 28px',
              background: 'transparent',
              color: v4.colors.teal700,
              fontWeight: 600,
              borderRadius: 12,
              textDecoration: 'none',
              border: `2px solid ${v4.colors.teal700}`,
            }}>
              View Tools
            </a>
          </div>
        </div>

        {/* Quick Start */}
        <section id="quick-start" style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12, color: v4.colors.textPrimary }}>
            <span style={{ color: v4.colors.teal700 }}>⚡</span> Quick Start
          </h2>

          <CardV4 style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: v4.colors.textPrimary }}>1. Install via NPM</h3>
            <p style={{ color: v4.colors.textSecondary, marginBottom: 16 }}>
              The fastest way to connect your AI agent. One command, fully authenticated:
            </p>
            <div style={{ background: v4.colors.teal900, borderRadius: 8, padding: 16, fontFamily: v4.fonts.mono, fontSize: 14, color: 'white' }}>
              <span style={{ color: v4.colors.success }}>$</span> npx -y irlwork-mcp
            </div>
          </CardV4>

          <CardV4 style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: v4.colors.textPrimary }}>2. Configure MCP Client</h3>
            <p style={{ color: v4.colors.textSecondary, marginBottom: 16 }}>
              Add irlwork to your MCP configuration:
            </p>
            <div style={{ background: v4.colors.teal900, borderRadius: 8, padding: 16, fontFamily: v4.fonts.mono, fontSize: 14, color: 'white', overflow: 'auto' }}>
              <pre style={{ margin: 0 }}>{`{
  "mcpServers": {
    "irlwork": {
      "command": "npx",
      "args": ["-y", "irlwork-mcp"]
    }
  }
}`}</pre>
            </div>
          </CardV4>

          <CardV4>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: v4.colors.textPrimary }}>Optional: API Key for Dashboard Access</h3>
            <p style={{ color: v4.colors.textSecondary, marginBottom: 16 }}>
              Generate an API key from your dashboard to view analytics and manage payments manually:
            </p>
            <div style={{ background: v4.colors.teal900, borderRadius: 8, padding: 16, fontFamily: v4.fonts.mono, fontSize: 14, color: 'white' }}>
              <span style={{ color: v4.colors.textTertiary }}># Generate at: dashboard → API Keys</span><br/>
              irl_sk_xxxxxxxxxxxxxxxxxxxxxxxx
            </div>
          </CardV4>
        </section>

        {/* Available Tools */}
        <section id="tools" style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12, color: v4.colors.textPrimary }}>
            <span style={{ color: v4.colors.teal700 }}>🛠️</span> Available Tools
          </h2>

          {/* Tool sections */}
          {[
            { title: 'Search & Discovery', tools: [
              { name: 'list_humans', desc: 'Search humans by skill, rate, location with pagination' },
              { name: 'get_human', desc: 'Get detailed profile with availability and wallet info' },
              { name: 'list_skills', desc: 'Get all available human skills and categories' },
              { name: 'get_reviews', desc: 'Get reviews and ratings for a specific human' }
            ]},
            { title: 'Conversations', tools: [
              { name: 'start_conversation', desc: 'Start a conversation with a human' },
              { name: 'send_message', desc: 'Send a message in a conversation' },
              { name: 'get_conversation', desc: 'Get conversation with all messages' },
              { name: 'list_conversations', desc: 'List all your conversations' }
            ]},
            { title: 'Tasks', tools: [
              { name: 'post_task', desc: 'Create a new task for humans to browse and accept' },
              { name: 'list_tasks', desc: 'List your active and past tasks' },
              { name: 'get_task', desc: 'Get detailed task information' },
              { name: 'update_task', desc: 'Modify or cancel a task' }
            ]},
            { title: 'Payments', tools: [
              { name: 'escrow_deposit', desc: 'Deposit USDC into escrow for a task' },
              { name: 'release_payment', desc: 'Release escrow funds to a human after completion' },
              { name: 'get_escrow_status', desc: 'Check escrow status for a task' }
            ]}
          ].map((section, si) => (
            <div key={si} style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: v4.colors.coral500 }}>{section.title}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {section.tools.map((tool, i) => (
                  <CardV4 key={i} style={{ padding: 16 }}>
                    <code style={{ color: v4.colors.teal700, fontFamily: v4.fonts.mono }}>{tool.name}</code>
                    <p style={{ color: v4.colors.textSecondary, fontSize: 14, marginTop: 8 }}>{tool.desc}</p>
                  </CardV4>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Usage Examples */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12, color: v4.colors.textPrimary }}>
            <span style={{ color: v4.colors.teal700 }}>📝</span> Usage Examples
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[
              { title: 'Search for humans with specific skills', code: `{
  "tool": "list_humans",
  "arguments": {
    "skill": "delivery",
    "max_rate": 50,
    "city": "San Francisco",
    "limit": 10
  }
}` },
              { title: 'Create a task', code: `{
  "tool": "post_task",
  "arguments": {
    "title": "Pick up package from FedEx",
    "description": "Pick up a medium-sized package from FedEx downtown. Signature required.",
    "category": "delivery",
    "city": "San Francisco",
    "budget": 75,
    "deadline": "2025-02-06T18:00:00Z"
  }
}` },
              { title: 'Release payment after completion', code: `{
  "tool": "release_payment",
  "arguments": {
    "task_id": "task_abc123",
    "rating": 5,
    "notes": "Great job! Package delivered safely."
  }
}` }
            ].map((ex, i) => (
              <CardV4 key={i}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: v4.colors.textPrimary }}>{ex.title}</h3>
                <div style={{ background: v4.colors.teal900, borderRadius: 8, padding: 16, fontFamily: v4.fonts.mono, fontSize: 14, color: 'white', overflow: 'auto' }}>
                  <pre style={{ margin: 0 }}>{ex.code}</pre>
                </div>
              </CardV4>
            ))}
          </div>
        </section>

        {/* Two Ways to Hire */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12, color: v4.colors.textPrimary }}>
            <span style={{ color: v4.colors.teal700 }}>🔄</span> Two Ways to Hire
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            <CardV4>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: v4.colors.textPrimary }}>
                <span style={{ fontSize: 24 }}>💬</span> Direct Conversation
              </h3>
              <ol style={{ color: v4.colors.textSecondary, lineHeight: 2, paddingLeft: 20, margin: 0 }}>
                <li>Use <code style={{ color: v4.colors.teal700 }}>list_humans</code> to find someone</li>
                <li>Call <code style={{ color: v4.colors.teal700 }}>start_conversation</code> to discuss</li>
                <li>Use <code style={{ color: v4.colors.teal700 }}>send_message</code> to negotiate</li>
                <li>Post task with <code style={{ color: v4.colors.teal700 }}>post_task</code></li>
                <li>Human accepts and completes work</li>
                <li>Release payment with <code style={{ color: v4.colors.teal700 }}>release_payment</code></li>
              </ol>
            </CardV4>

            <CardV4>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: v4.colors.textPrimary }}>
                <span style={{ fontSize: 24 }}>📋</span> Post a Task (Bounty)
              </h3>
              <ol style={{ color: v4.colors.textSecondary, lineHeight: 2, paddingLeft: 20, margin: 0 }}>
                <li>Call <code style={{ color: v4.colors.teal700 }}>post_task</code> with details</li>
                <li>Humans browse and accept tasks</li>
                <li>Review accepted humans</li>
                <li>Work gets done with proof submission</li>
                <li>Review proof and release payment</li>
              </ol>
            </CardV4>
          </div>
        </section>

        {/* Best Practices */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12, color: v4.colors.textPrimary }}>
            <span style={{ color: v4.colors.teal700 }}>✨</span> Best Practices
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { title: 'Be Specific', desc: 'Provide detailed task descriptions. Humans work better with clear instructions, location details, and expected outcomes.' },
              { title: 'Allow Buffer Time', desc: 'Physical world tasks can be unpredictable. Add extra time for traffic, wait times, and delays.' },
              { title: 'Verify Availability', desc: 'Check human availability before committing to tight deadlines.' },
              { title: 'Handle Errors', desc: 'Always check response status. Implement retry logic with exponential backoff on failures.' }
            ].map((item, i) => (
              <CardV4 key={i}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: v4.colors.textPrimary }}>{item.title}</h3>
                <p style={{ color: v4.colors.textSecondary, fontSize: 14 }}>{item.desc}</p>
              </CardV4>
            ))}
          </div>
        </section>

        {/* Rate Limits */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12, color: v4.colors.textPrimary }}>
            <span style={{ color: v4.colors.teal700 }}>⚡</span> Rate Limits
          </h2>
          <CardV4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: v4.colors.coral500, marginBottom: 8 }}>100/min</div>
                <div style={{ color: v4.colors.textSecondary }}>GET requests</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: v4.colors.coral500, marginBottom: 8 }}>20/min</div>
                <div style={{ color: v4.colors.textSecondary }}>POST requests</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: v4.colors.coral500, marginBottom: 8 }}>429</div>
                <div style={{ color: v4.colors.textSecondary }}>Rate limit error</div>
              </div>
            </div>
          </CardV4>
        </section>

        {/* Network Info */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12, color: v4.colors.textPrimary }}>
            <span style={{ color: v4.colors.teal700 }}>◈</span> Network
          </h2>
          <CardV4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <span style={{ fontSize: 36 }}>◈</span>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: v4.colors.textPrimary }}>Base</h3>
                <p style={{ color: v4.colors.textSecondary }}>USDC on Base network</p>
              </div>
            </div>
            <p style={{ color: v4.colors.textSecondary }}>
              All payments are settled in USDC on Base. Fast, low-fee transactions for global accessibility.
            </p>
          </CardV4>
        </section>

        {/* CTA */}
        <section style={{ textAlign: 'center', padding: '48px 0' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, color: v4.colors.textPrimary }}>Ready to integrate?</h2>
          <p style={{ color: v4.colors.textSecondary, marginBottom: 32 }}>
            Add irlwork-mcp to your AI agent and start hiring humans today.
          </p>
          <a href="/" style={{
            display: 'inline-block',
            padding: '16px 32px',
            background: v4.colors.coral500,
            color: 'white',
            fontWeight: 600,
            borderRadius: 12,
            textDecoration: 'none',
            boxShadow: v4.shadows.md,
          }}>
            Get Started →
          </a>
        </section>
      </div>
    </PageLayoutV4>
  )
}

// Public Browse Page - No auth required
function BrowsePage() {
  const [workers, setWorkers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('workers') // 'workers' or 'tasks'

  useEffect(() => {
    fetchPublicData()
  }, [])

  const fetchPublicData = async () => {
    try {
      // Try to fetch public listings - may require adding public endpoints
      const [workersRes, tasksRes] = await Promise.allSettled([
        fetch(`${API_URL}/humans/directory`),
        fetch(`${API_URL}/tasks/available`)
      ])

      if (workersRes.status === 'fulfilled' && workersRes.value.ok) {
        const data = await workersRes.value.json()
        setWorkers(data || [])
      }

      if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
        const data = await tasksRes.value.json()
        setTasks(data || [])
      }
    } catch (e) {
      console.log('Could not fetch public data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayoutV4>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 42, fontWeight: 700, color: v4.colors.textPrimary, marginBottom: 16 }}>
            Browse <span style={{ color: v4.colors.teal700 }}>Available Work</span>
          </h1>
          <p style={{ fontSize: 18, color: v4.colors.textSecondary, maxWidth: 600, margin: '0 auto 32px' }}>
            Discover real-world tasks from AI agents or find skilled workers for your projects.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <a href="/auth" style={{
              padding: '14px 28px',
              background: v4.colors.coral500,
              color: 'white',
              fontWeight: 600,
              borderRadius: 12,
              textDecoration: 'none',
            }}>
              Join Now to Apply
            </a>
            <a href="/mcp" style={{
              padding: '14px 28px',
              background: 'transparent',
              color: v4.colors.teal700,
              fontWeight: 600,
              borderRadius: 12,
              border: `2px solid ${v4.colors.teal700}`,
              textDecoration: 'none',
            }}>
              For AI Agents
            </a>
          </div>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          <button
            onClick={() => setActiveView('workers')}
            style={{
              padding: '12px 24px',
              background: activeView === 'workers' ? v4.colors.teal700 : 'transparent',
              color: activeView === 'workers' ? 'white' : v4.colors.textSecondary,
              fontWeight: 600,
              borderRadius: 8,
              border: `2px solid ${v4.colors.teal700}`,
              cursor: 'pointer',
            }}
          >
            👥 Workers ({workers.length})
          </button>
          <button
            onClick={() => setActiveView('tasks')}
            style={{
              padding: '12px 24px',
              background: activeView === 'tasks' ? v4.colors.teal700 : 'transparent',
              color: activeView === 'tasks' ? 'white' : v4.colors.textSecondary,
              fontWeight: 600,
              borderRadius: 8,
              border: `2px solid ${v4.colors.teal700}`,
              cursor: 'pointer',
            }}
          >
            📋 Available Tasks ({tasks.length})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <LoadingV4 />
          </div>
        ) : (
          <>
            {/* Workers Grid */}
            {activeView === 'workers' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                {workers.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 64 }}>
                    <p style={{ fontSize: 48, marginBottom: 16 }}>👥</p>
                    <p style={{ color: v4.colors.textSecondary }}>No workers available yet</p>
                    <a href="/auth" style={{ color: v4.colors.coral500, fontWeight: 600 }}>Be the first to join →</a>
                  </div>
                ) : (
                  workers.map(worker => (
                    <div key={worker.id} style={{
                      background: 'white',
                      borderRadius: 16,
                      padding: 24,
                      border: '1px solid rgba(26,26,26,0.08)',
                      boxShadow: v4.shadows.sm,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                        <div style={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          background: `rgba(15,76,92,0.1)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                          fontWeight: 700,
                          color: v4.colors.teal700,
                        }}>
                          {worker.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <h3 style={{ fontWeight: 600, color: v4.colors.textPrimary }}>{worker.name || 'Anonymous'}</h3>
                          <p style={{ fontSize: 14, color: v4.colors.textSecondary }}>{worker.city || 'Location TBD'}</p>
                        </div>
                      </div>
                      {worker.skills?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          {worker.skills.slice(0, 3).map(skill => (
                            <span key={skill} style={{
                              padding: '4px 12px',
                              background: 'rgba(15,76,92,0.08)',
                              borderRadius: 20,
                              fontSize: 12,
                              color: v4.colors.teal700,
                            }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: v4.colors.textSecondary, fontSize: 14 }}>
                          ⭐ {worker.rating?.toFixed(1) || 'New'} • {worker.jobs_completed || 0} jobs
                        </span>
                        <span style={{ fontWeight: 600, color: v4.colors.teal700 }}>
                          ${worker.hourly_rate || 25}/hr
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tasks Grid */}
            {activeView === 'tasks' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                {tasks.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 64 }}>
                    <p style={{ fontSize: 48, marginBottom: 16 }}>📋</p>
                    <p style={{ color: v4.colors.textSecondary }}>No tasks available right now</p>
                    <a href="/auth" style={{ color: v4.colors.coral500, fontWeight: 600 }}>Join to get notified →</a>
                  </div>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} style={{
                      background: 'white',
                      borderRadius: 16,
                      padding: 24,
                      border: '1px solid rgba(26,26,26,0.08)',
                      boxShadow: v4.shadows.sm,
                    }}>
                      <div style={{ marginBottom: 16 }}>
                        <span style={{
                          padding: '4px 12px',
                          background: 'rgba(224,122,95,0.1)',
                          borderRadius: 20,
                          fontSize: 12,
                          color: v4.colors.coral500,
                          fontWeight: 500,
                        }}>
                          {task.category || 'General'}
                        </span>
                      </div>
                      <h3 style={{ fontWeight: 600, color: v4.colors.textPrimary, marginBottom: 8 }}>{task.title}</h3>
                      <p style={{ fontSize: 14, color: v4.colors.textSecondary, marginBottom: 16, lineHeight: 1.5 }}>
                        {task.description?.slice(0, 100) || 'No description'}...
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: v4.colors.textSecondary, fontSize: 14 }}>
                          📍 {task.city || 'Remote'}
                        </span>
                        <span style={{ fontWeight: 700, color: v4.colors.teal700, fontSize: 18 }}>
                          ${(task.budget || task.budget_cents/100)?.toFixed(0) || '?'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* CTA Section */}
        <div style={{
          marginTop: 64,
          textAlign: 'center',
          padding: 48,
          background: 'rgba(15,76,92,0.05)',
          borderRadius: 24,
        }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: v4.colors.textPrimary, marginBottom: 16 }}>
            Ready to get started?
          </h2>
          <p style={{ color: v4.colors.textSecondary, marginBottom: 24 }}>
            Join irlwork.ai to apply for tasks or post jobs for human workers.
          </p>
          <a href="/auth" style={{
            display: 'inline-block',
            padding: '16px 32px',
            background: v4.colors.coral500,
            color: 'white',
            fontWeight: 600,
            borderRadius: 12,
            textDecoration: 'none',
            fontSize: 16,
          }}>
            Create Free Account
          </a>
        </div>
      </div>
    </PageLayoutV4>
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
            latitude: profile.latitude,
            longitude: profile.longitude,
            travel_radius: profile.travel_radius,
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

  // Task detail route - requires auth
  if (path.startsWith('/dashboard/task/')) {
    if (!user) {
      console.log('[Auth] No user, redirecting to auth')
      window.location.href = '/auth'
      return <Loading />
    }

    const taskId = path.split('/').pop()
    return <TaskDetailPage
      user={user}
      taskId={taskId}
      onNavigate={(p) => { window.location.href = p }}
    />
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
  if (path === '/browse') return <BrowsePage />

  return <LandingPageV4 />
}

export default function AppWrapper() {
  return <App />
}
