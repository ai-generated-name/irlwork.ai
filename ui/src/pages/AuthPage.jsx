import React, { useState, useEffect } from 'react'
import { AlertTriangle, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'
import { navigate as spaNavigate } from '../utils/navigate'
import { debug } from '../utils/appConstants'
import { trackEvent } from '../utils/analytics'

function AuthPage({ onLogin, onNavigate }) {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorModal, setErrorModal] = useState(null)
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

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
      const { data, error } = isLogin
        ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        : await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
              data: { name: form.name },
              emailRedirectTo: window.location.origin + '/auth'
            }
          })

      if (error) throw error
      trackEvent(isLogin ? 'login' : 'sign_up', { method: 'email' })

      // For signups: Supabase may not return a session if email confirmation is enabled.
      // In that case, show a confirmation message instead of navigating to dashboard
      // (which would just bounce back to /auth since there's no authenticated session).
      if (!isLogin && !data.session) {
        setSignupSuccess(true)
        return
      }

      // Login or signup with immediate session — navigate to dashboard.
      // The parent App's onAuthStateChange will detect the session and handle redirects.
      const params = new URLSearchParams(window.location.search)
      const returnTo = params.get('returnTo')
      if (onNavigate) onNavigate(returnTo && decodeURIComponent(returnTo).startsWith('/dashboard') ? decodeURIComponent(returnTo) : '/dashboard')
    } catch (err) {
      const msg = err.message || ''
      // Map Supabase error messages to user-friendly, non-enumerable messages
      if (isLogin) {
        if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
          setError('Invalid email or password')
        } else if (msg.includes('Email not confirmed')) {
          setError('Please verify your email first. Check your inbox for a confirmation link.')
        } else if (msg.includes('rate') || msg.includes('too many') || msg.includes('429')) {
          setError('Too many attempts. Please try again in a few minutes.')
        } else {
          setError('Invalid email or password')
        }
      } else {
        if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('duplicate')) {
          setError('An account with this email already exists.')
        } else if (msg.includes('password') && (msg.includes('short') || msg.includes('least'))) {
          setError('Password must be at least 8 characters')
        } else if (msg.includes('valid email') || (msg.includes('invalid') && msg.includes('email'))) {
          setError('Please enter a valid email address')
        } else if (msg.includes('rate') || msg.includes('too many') || msg.includes('429')) {
          setError('Too many attempts. Please try again in a few minutes.')
        } else {
          setError(msg || 'Something went wrong. Please try again.')
        }
      }
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
      const oauthParams = new URLSearchParams(window.location.search)
      const oauthReturnTo = oauthParams.get('returnTo')
      const oauthRedirect = oauthReturnTo && decodeURIComponent(oauthReturnTo).startsWith('/dashboard')
        ? decodeURIComponent(oauthReturnTo)
        : '/dashboard'
      trackEvent('login', { method: 'google' })
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + oauthRedirect,
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
            details: 'Fix in Supabase Dashboard:\n1. Go to Authentication \u2192 Providers \u2192 Google\n2. Ensure Client ID and Secret are correct\n3. Check Google Cloud Console:\n   \u2022 OAuth consent screen configured\n   \u2022 Client ID authorized for your domain\n4. Check Railway env vars:\n   \u2022 GOOGLE_CLIENT_ID\n   \u2022 GOOGLE_CLIENT_SECRET'
          })
        } else {
          setErrorModal({
            title: 'Google Sign-In Failed',
            message: error.message || 'Could not sign in with Google',
            details: 'Common causes:\n\u2022 Google OAuth not configured\n\u2022 Redirect URL mismatch\n\u2022 Network issues'
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
            <div className="auth-v4-error-icon"><AlertTriangle size={24} /></div>
            <h2 className="auth-v4-error-title">{errorModal.title}</h2>
            <p className="auth-v4-error-message">{errorModal.message}</p>
            {errorModal.details && (
              <div className="auth-v4-error-details">{errorModal.details}</div>
            )}
            <div className="auth-v4-error-buttons">
              <button className="auth-v4-error-btn-secondary" onClick={() => window.location.reload()}>
                Try Again
              </button>
              <button className="auth-v4-submit" onClick={() => spaNavigate('/')}>
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Resend verification email via Supabase
  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !supabase || !form.email) return
    try {
      await supabase.auth.resend({ type: 'signup', email: form.email })
      setResendCooldown(60)
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setError('Failed to resend verification email. Please try again.')
    }
  }

  // Show email confirmation screen after successful signup (when email verification is required)
  if (signupSuccess) {
    return (
      <div className="auth-v4">
        <div className="auth-v4-container">
          <a href="/" className="auth-v4-logo" onClick={(e) => { e.preventDefault(); spaNavigate('/') }}>
            <div className="logo-mark-v4">irl</div>
            <span className="logo-name-v4">irlwork.ai</span>
          </a>
          <div className="auth-v4-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              <Mail size={48} style={{ color: 'var(--accent-primary, #6366f1)' }} />
            </div>
            <h1 className="auth-v4-title">Check your email</h1>
            <p className="auth-v4-subtitle" style={{ marginBottom: 24 }}>
              We sent a confirmation link to <strong>{form.email}</strong>. Click the link to verify your email and get started.
            </p>
            <button
              className="auth-v4-submit"
              onClick={() => { setSignupSuccess(false); setIsLogin(true); setError('') }}
            >
              Back to Sign In
            </button>
            <button
              onClick={handleResendVerification}
              disabled={resendCooldown > 0}
              className="auth-v4-switch-link"
              style={{ marginTop: 12, display: 'block', width: '100%', background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer', fontSize: 14, color: 'var(--text-tertiary)' }}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't receive it? Resend email"}
            </button>
          </div>
          <button onClick={() => spaNavigate('/')} className="auth-v4-back">
            &larr; Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-v4">
      <div className="auth-v4-container">
        <a href="/" className="auth-v4-logo" style={{ textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); spaNavigate('/') }}>
          <Logo variant="header" theme="light" />
        </a>

        <div className="auth-v4-card">
          <h1 className="auth-v4-title">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="auth-v4-subtitle">
            {isLogin ? 'Sign in to continue' : 'Start earning from real-world tasks'}
          </p>

          {new URLSearchParams(window.location.search).get('reset') === 'success' && (
            <div style={{ background: '#D1FAE5', color: '#065F46', padding: '12px 16px', borderRadius: 12, marginBottom: 16, fontSize: 14 }}>
              Password updated successfully. Please sign in with your new password.
            </div>
          )}

          {error && (
            <div className="auth-v4-error">{error}</div>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="auth-v4-google-btn"
          >
            {loading ? (
              <div className="loading-v4-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Connecting...' : 'Continue with Google'}
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
                id="auth-name"
                aria-label="Full name"
                autoComplete="name"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="auth-v4-input"
              required
              id="auth-email"
              aria-label="Email address"
              autoComplete="email"
            />
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="auth-v4-input"
                style={{ paddingRight: 44 }}
                required
                minLength={8}
                id="auth-password"
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: -4, marginBottom: 8 }}>
                <a href="/forgot-password" onClick={e => { e.preventDefault(); onNavigate('/forgot-password') }} style={{ fontSize: 13, color: 'var(--text-tertiary)', textDecoration: 'none' }}>
                  Forgot your password?
                </a>
              </div>
            )}
            <button type="submit" className="auth-v4-submit" disabled={loading}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <p className="auth-v4-switch">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setIsLogin(!isLogin); setForm({ email: '', password: '', name: '' }); setError('') }} className="auth-v4-switch-link">
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <button onClick={() => spaNavigate('/')} className="auth-v4-back">
          &larr; Back to home
        </button>
      </div>
    </div>
  )
}

export default AuthPage
