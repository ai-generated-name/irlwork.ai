import { useState } from 'react'
import { supabase } from '../App'
import { Logo } from '../components/Logo'

export default function ResetPassword({ onNavigate }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setLoading(true)
    if (!supabase) { setError('Authentication service not configured'); setLoading(false); return }

    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setLoading(false); return }

    onNavigate('/auth?reset=success')
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
          <form onSubmit={handleSubmit} className="auth-v4-form">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              required
              minLength={8}
              className="auth-v4-input"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              required
              className="auth-v4-input"
            />
            {error && <div className="auth-v4-error">{error}</div>}
            <button type="submit" disabled={loading} className="auth-v4-submit">
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
