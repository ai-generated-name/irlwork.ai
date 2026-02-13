// ApiKeysTab - Extracted from App.jsx
import React, { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

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
          href="/connect-agent"
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
