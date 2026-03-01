// ApiKeysTab - Extracted from App.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, AlertTriangle, Check, Key } from 'lucide-react'
import { supabase } from '../App'
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Manage API keys for programmatic access to irlwork.ai
          </p>
        </div>
        {keys.length > 0 && (
          <button
            className="v4-btn v4-btn-primary"
            onClick={() => { setShowModal(true); setNewKeyName(''); setNewKey(null); setError(null); }}
            style={{ whiteSpace: 'nowrap' }}
          >
            + Generate new key
          </button>
        )}
      </div>

      {/* Generate Key Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 500, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {!newKey ? (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Generate new API key</h2>
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
                    background: 'rgba(255, 95, 87, 0.1)',
                    border: '1px solid #FECACA',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 20,
                    color: '#FF5F57',
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
                    {generating ? 'Generating...' : 'Generate key'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, #16A34A, #16A34A)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Check size={28} style={{ color: 'white' }} />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>API key generated</h2>
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
                      background: copied ? '#16A34A' : '#FF6B35',
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
                    {copied ? 'Copied' : 'Copy key'}
                  </button>
                </div>

                <div style={{
                  background: 'rgba(254, 188, 46, 0.1)',
                  border: '1px solid rgba(254, 188, 46, 0.3)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 20,
                  display: 'flex',
                  gap: 10
                }}>
                  <AlertTriangle size={16} />
                  <p style={{ fontSize: 13, color: '#92400E' }}>
                    Make sure to save this key securely. It won't be shown again.
                  </p>
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
        <EmptyState
          icon={<Key size={48} />}
          title="No API keys yet"
          description="API keys will appear here when you generate one."
          action={
            <Button variant="primary" onClick={() => setShowModal(true)}>
              Generate first key
            </Button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {keys.filter(key => showRevoked || key.is_active).map(key => (
            <Card
              key={key.id}
              className="api-key-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                opacity: key.is_active ? 1 : 0.6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>{key.name}</h3>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    background: key.is_active ? 'rgba(22, 163, 74, 0.1)' : 'rgba(255, 95, 87, 0.1)',
                    color: key.is_active ? '#16A34A' : '#FF5F57'
                  }}>
                    {key.is_active ? 'Active' : 'Revoked'}
                  </span>
                </div>
                {key.is_active && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" size="sm" onClick={() => rotateKey(key.id)}>
                      Rotate key
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setConfirmRevoke(key)}>
                      Revoke key
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', display: 'inline-block' }}>
                  {key.key_prefix}
                </code>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <span>Created: {formatDate(key.created_at)}</span>
                <span>Last used: {formatDate(key.last_used_at)}</span>
              </div>
            </Card>
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
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Using your API key</h3>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
          Include your API key in the Authorization header of your requests:
        </p>
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 8,
          padding: 16,
          fontFamily: 'monospace',
          fontSize: 12,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <div style={{ color: '#8B8B8B', marginBottom: 4 }}># Post a task</div>
          <div>
            <span style={{ color: '#16A34A' }}>curl</span> -X POST https://api.irlwork.ai/api/mcp/tasks \
          </div>
          <div style={{ paddingLeft: 20 }}>
            -H <span style={{ color: '#E8853D' }}>'Authorization: Bearer irl_sk_...'</span> \
          </div>
          <div style={{ paddingLeft: 20 }}>
            -H <span style={{ color: '#E8853D' }}>'Content-Type: application/json'</span> \
          </div>
          <div style={{ paddingLeft: 20 }}>
            -d <span style={{ color: '#E8853D' }}>'{`{"title": "Package Pickup", "budget": 35}`}'</span>
          </div>
        </div>
        <a
          href="/connect-agent"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 16,
            color: '#E8853D',
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
