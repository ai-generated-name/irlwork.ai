import React, { useState } from 'react'
import { Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'

function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password'
      })
      // Always show success (prevent email enumeration)
      setSent(true)
    } catch (err) {
      // Still show success to prevent enumeration
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="auth-v4">
        <div className="auth-v4-container">
          <a href="/" className="auth-v4-logo" style={{ textDecoration: 'none' }}>
            <Logo variant="header" theme="light" />
          </a>
          <div className="auth-v4-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              <Mail size={48} style={{ color: 'var(--accent-primary, #6366f1)' }} />
            </div>
            <h1 className="auth-v4-title">Check your email</h1>
            <p className="auth-v4-subtitle" style={{ marginBottom: 24 }}>
              If an account exists for <strong>{email}</strong>, we sent a password reset link. Check your inbox and follow the instructions.
            </p>
            <button
              className="auth-v4-submit"
              onClick={() => onNavigate('/auth')}
            >
              Back to Sign In
            </button>
          </div>
          <button onClick={() => window.location.href = '/'} className="auth-v4-back">
            &larr; Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-v4">
      <div className="auth-v4-container">
        <a href="/" className="auth-v4-logo" style={{ textDecoration: 'none' }}>
          <Logo variant="header" theme="light" />
        </a>
        <div className="auth-v4-card">
          <h1 className="auth-v4-title">Reset your password</h1>
          <p className="auth-v4-subtitle">
            Enter your email and we'll send you a reset link.
          </p>

          {error && <div className="auth-v4-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-v4-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="auth-v4-input"
              required
              autoComplete="email"
              autoFocus
            />
            <button type="submit" className="auth-v4-submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="auth-v4-switch">
            Remember your password?{' '}
            <button onClick={() => onNavigate('/auth')} className="auth-v4-switch-link">
              Sign in
            </button>
          </p>
        </div>
        <button onClick={() => window.location.href = '/'} className="auth-v4-back">
          &larr; Back to home
        </button>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
