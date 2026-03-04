import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Logo } from '../components/Logo'

function ResetPasswordPage({ onNavigate }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    if (!supabase) {
      setError('Authentication service not configured')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      onNavigate('/auth?reset=success')
    } catch (err) {
      setError(err.message || 'Failed to update password. The reset link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-v4">
      <div className="auth-v4-container">
        <a href="/" className="auth-v4-logo" style={{ textDecoration: 'none' }}>
          <Logo variant="header" theme="light" />
        </a>
        <div className="auth-v4-card">
          <h1 className="auth-v4-title">Set new password</h1>
          <p className="auth-v4-subtitle">
            Enter your new password below.
          </p>

          {error && <div className="auth-v4-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-v4-form">
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="auth-v4-input"
                style={{ paddingRight: 44 }}
                required
                minLength={8}
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="auth-v4-input"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button type="submit" className="auth-v4-submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
        <button onClick={() => window.location.href = '/'} className="auth-v4-back">
          &larr; Back to home
        </button>
      </div>
    </div>
  )
}

export default ResetPasswordPage
