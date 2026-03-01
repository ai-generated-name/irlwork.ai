import { useState } from 'react'
import { supabase } from '../App'
import { Logo } from '../components/Logo'

export default function ForgotPassword({ onNavigate }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Always show success — do not reveal whether email exists
    if (supabase) {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="auth-v4">
        <div className="auth-v4-container">
          <a href="/" className="auth-v4-logo" style={{ textDecoration: 'none' }}>
            <Logo variant="header" theme="light" />
          </a>
          <div className="auth-v4-card" style={{ textAlign: 'center' }}>
            <h1 className="auth-v4-title">Check your email</h1>
            <p className="auth-v4-subtitle" style={{ marginBottom: 24 }}>
              If an account exists for <strong>{email}</strong>, we sent a password reset link.
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
          <form onSubmit={handleSubmit} className="auth-v4-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="auth-v4-input"
              autoComplete="email"
            />
            <button type="submit" disabled={loading} className="auth-v4-submit">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <p className="auth-v4-switch">
            <button onClick={() => onNavigate('/auth')} className="auth-v4-switch-link">
              Back to Sign In
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
