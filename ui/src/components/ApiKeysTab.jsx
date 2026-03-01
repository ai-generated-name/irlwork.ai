// ApiKeysTab - Extracted from App.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, AlertTriangle, Copy, Check, Key, Plus, RotateCw, Trash2, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { EmptyState, Button, Card, ConfirmDialog } from './ui'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

// Get a fresh Supabase JWT for API calls
async function getFreshToken(fallbackToken) {
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) return session.access_token
  }
  return fallbackToken || ''
}

export default function ApiKeysTab({ user }) {
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
      const token = await getFreshToken(user?.token)
      const response = await fetch(`${API_URL}/keys`, {
        headers: { Authorization: token }
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
      const token = await getFreshToken(user?.token)
      const response = await fetch(`${API_URL}/keys/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
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
      const token = await getFreshToken(user?.token)
      const response = await fetch(`${API_URL}/keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: token }
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
      const token = await getFreshToken(user?.token)
      const response = await fetch(`${API_URL}/keys/${keyId}/rotate`, {
        method: 'POST',
        headers: { Authorization: token }
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

  const activeKeys = keys.filter(k => k.is_active)
  const revokedKeys = keys.filter(k => !k.is_active)

  return (
    <div className="apikeys-page">
      {/* Header */}
      <div className="apikeys-header">
        <p className="apikeys-description">
          Manage API keys for programmatic access to irlwork.ai
        </p>
        {keys.length > 0 && (
          <button
            className="v4-btn v4-btn-primary"
            onClick={() => { setShowModal(true); setNewKeyName(''); setNewKey(null); setError(null); }}
          >
            <Plus size={16} />
            Generate new key
          </button>
        )}
      </div>

      {/* Generate Key Modal */}
      {showModal && (
        <div className="apikeys-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setNewKey(null); } }}>
          <div className="apikeys-modal">
            {!newKey ? (
              <>
                <div className="apikeys-modal-header">
                  <div className="apikeys-modal-icon">
                    <Key size={20} />
                  </div>
                  <h2>Generate new API key</h2>
                  <p>Give your key a name to help you identify it later.</p>
                </div>
                <input
                  type="text"
                  className="apikeys-input"
                  placeholder="e.g. Production, Development, Trading Bot"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') generateKey(); }}
                />
                {error && (
                  <div className="apikeys-error">
                    <AlertTriangle size={14} />
                    {error}
                  </div>
                )}
                <div className="apikeys-modal-actions">
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
                    {generating ? 'Generating...' : 'Generate key'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="apikeys-modal-header">
                  <div className="apikeys-modal-icon apikeys-modal-icon--success">
                    <Check size={20} />
                  </div>
                  <h2>API key generated</h2>
                  <p>Copy this key now. You won't be able to see it again.</p>
                </div>

                <div className="apikeys-key-display">
                  <code>{newKey}</code>
                  <button
                    className={`apikeys-copy-btn ${copied ? 'apikeys-copy-btn--copied' : ''}`}
                    onClick={() => copyToClipboard(newKey)}
                  >
                    {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy key</>}
                  </button>
                </div>

                <div className="apikeys-warning">
                  <AlertTriangle size={14} />
                  <span>Store this key securely. It won't be shown again.</span>
                </div>

                <button
                  className="v4-btn v4-btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => { setShowModal(false); setNewKey(null); }}
                >
                  Close dialog
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      <ConfirmDialog
        open={!!confirmRevoke}
        title="Revoke API key?"
        description={confirmRevoke ? `Are you sure you want to revoke ${confirmRevoke.name}? Any agents using this key will lose access immediately.` : ''}
        confirmLabel="Revoke key"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => revokeKey(confirmRevoke.id)}
        onCancel={() => setConfirmRevoke(null)}
      />

      {/* Filter bar */}
      {keys.length > 0 && (
        <div className="apikeys-filter-bar">
          <span className="apikeys-count">
            {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}
            {revokedKeys.length > 0 && (
              <span className="apikeys-count-revoked"> · {revokedKeys.length} revoked</span>
            )}
          </span>
          {revokedKeys.length > 0 && (
            <button
              className="apikeys-toggle-revoked"
              onClick={() => setShowRevoked(!showRevoked)}
            >
              {showRevoked ? <EyeOff size={14} /> : <Eye size={14} />}
              {showRevoked ? 'Hide' : 'Show'} revoked
            </button>
          )}
        </div>
      )}

      {/* Keys List */}
      {loading ? (
        <div className="apikeys-loading">Loading keys...</div>
      ) : keys.length === 0 ? (
        <EmptyState
          icon={<Key size={48} />}
          title="No API keys yet"
          description="Generate an API key to connect your agent to irlwork.ai."
          action={
            <Button variant="primary" onClick={() => { setShowModal(true); setNewKeyName(''); setNewKey(null); setError(null); }}>
              <Plus size={16} /> Generate first key
            </Button>
          }
        />
      ) : (
        <div className="apikeys-list">
          {keys.filter(key => showRevoked || key.is_active).map(key => (
            <Card
              key={key.id}
              className={`apikeys-card ${!key.is_active ? 'apikeys-card--revoked' : ''}`}
            >
              <div className="apikeys-card-top">
                <div className="apikeys-card-name">
                  <span className="apikeys-card-title">{key.name}</span>
                  <span className={`apikeys-badge ${key.is_active ? 'apikeys-badge--active' : 'apikeys-badge--revoked'}`}>
                    {key.is_active ? 'Active' : 'Revoked'}
                  </span>
                </div>
                {key.is_active && (
                  <div className="apikeys-card-actions">
                    <button className="apikeys-action-btn" onClick={() => rotateKey(key.id)}>
                      <RotateCw size={14} />
                      Rotate key
                    </button>
                    <button className="apikeys-action-btn apikeys-action-btn--danger" onClick={() => setConfirmRevoke(key)}>
                      <Trash2 size={14} />
                      Revoke key
                    </button>
                  </div>
                )}
              </div>
              <code className="apikeys-card-prefix">{key.key_prefix}</code>
              <div className="apikeys-card-meta">
                <span>Created {formatDate(key.created_at)}</span>
                <span>Last used {formatDate(key.last_used_at)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Usage Instructions */}
      <div className="apikeys-usage">
        <div className="apikeys-usage-header">
          <h3>Quick start</h3>
          <a href="/connect-agent" className="apikeys-docs-link">
            Full documentation <ExternalLink size={13} />
          </a>
        </div>
        <p className="apikeys-usage-desc">Include your API key in the Authorization header:</p>
        <div className="apikeys-code-block">
          <div className="apikeys-code-comment"># Post a task</div>
          <div className="apikeys-code-line">
            <span className="apikeys-code-cmd">curl</span> -X POST https://api.irlwork.ai/api/mcp/tasks \
          </div>
          <div className="apikeys-code-line apikeys-code-indent">
            -H <span className="apikeys-code-str">'Authorization: Bearer irl_sk_...'</span> \
          </div>
          <div className="apikeys-code-line apikeys-code-indent">
            -H <span className="apikeys-code-str">'Content-Type: application/json'</span> \
          </div>
          <div className="apikeys-code-line apikeys-code-indent">
            -d <span className="apikeys-code-str">{`'{"title": "Package Pickup", "budget": 35}'`}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
