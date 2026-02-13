// MCPPage — Full API Reference for irlwork.ai
// Accurate method signatures, params, responses, error codes, and lifecycle docs
import React, { useState, useEffect } from 'react'
import { Check, Copy, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../App'
import MarketingFooter from '../components/Footer'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{
        position: 'absolute', top: 8, right: 8,
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 12,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
      }}
    >
      {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  )
}

function MethodCard({ method, description, params, response, errors, notes, example }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mcp-v4-card" style={{ marginBottom: 16 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <code style={{ fontSize: 15, fontWeight: 600, color: '#f97316' }}>{method}</code>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14, marginLeft: 8 }}>{description}</span>
      </div>
      {open && (
        <div style={{ marginTop: 16 }}>
          {params && params.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Parameters</h4>
              <div style={{ border: '1px solid var(--border-primary)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Param</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Required</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {params.map((p, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border-primary)' }}>
                        <td style={{ padding: '8px 12px' }}><code>{p.name}</code></td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{p.type}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {p.required
                            ? <span style={{ color: '#ef4444', fontWeight: 600 }}>Yes</span>
                            : <span style={{ color: 'var(--text-tertiary)' }}>No</span>}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {params && params.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>No parameters required.</p>
          )}
          {response && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Response</h4>
              <div className="mcp-v4-code-block" style={{ position: 'relative', background: '#0d1117' }}>
                <pre style={{ fontSize: 12, color: '#7ee787' }}>{response}</pre>
              </div>
            </div>
          )}
          {errors && errors.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Errors</h4>
              <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 20, margin: 0 }}>
                {errors.map((e, i) => <li key={i} style={{ marginBottom: 4 }}><code style={{ color: '#ef4444' }}>{e.code}</code> — {e.desc}</li>)}
              </ul>
            </div>
          )}
          {notes && (
            <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(249, 115, 22, 0.08)', borderRadius: 8, borderLeft: '3px solid #f97316' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{notes}</p>
            </div>
          )}
          {example && (
            <div>
              <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Example</h4>
              <div className="mcp-v4-code-block" style={{ position: 'relative' }}>
                <pre style={{ fontSize: 12 }}>{example}</pre>
                <CopyButton text={example} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MCPPage() {
  const [user, setUser] = useState(null)
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) { setLoading(false); return }
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
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

  return (
    <div className="mcp-v4">
      <header className="mcp-v4-header">
        <div className="mcp-v4-header-inner">
          <a href="/" className="logo-v4">
            <div className="logo-mark-v4">irl</div>
            <span className="logo-name-v4">irlwork.ai</span>
          </a>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <a href="/connect-agent" className="mcp-v4-nav-link">Quick Start</a>
            <a href="/dashboard/hiring" className="mcp-v4-nav-link">Dashboard</a>
          </div>
        </div>
      </header>

      <main className="mcp-v4-main">
        {/* Hero */}
        <div className="mcp-v4-hero">
          <h1>API <span>Reference</span></h1>
          <p>
            Complete documentation for every method, parameter, and response in the irlwork.ai API.
            For quick setup, see the <a href="/connect-agent" style={{ color: '#f97316' }}>Getting Started</a> guide.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <a href="#auth" className="btn-v4 btn-v4-secondary">Authentication</a>
            <a href="#methods" className="btn-v4 btn-v4-secondary">Methods</a>
            <a href="#lifecycle" className="btn-v4 btn-v4-secondary">Task Lifecycle</a>
            <a href="#payments" className="btn-v4 btn-v4-secondary">Payments</a>
            <a href="#errors" className="btn-v4 btn-v4-secondary">Errors</a>
          </div>
        </div>

        {/* ===== BASE INFO ===== */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>{'>'}_</span> Base Info</h2>
          <div className="mcp-v4-card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
              <div>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 4 }}>Base URL</div>
                <code style={{ fontSize: 14 }}>https://api.irlwork.ai/api</code>
              </div>
              <div>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 4 }}>MCP Endpoint</div>
                <code style={{ fontSize: 14 }}>POST /api/mcp</code>
              </div>
              <div>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 4 }}>Rate Limits</div>
                <span style={{ fontSize: 14 }}>60 req/min per key</span>
              </div>
              <div>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 4 }}>Payments</div>
                <span style={{ fontSize: 14 }}>Stripe Connect</span>
              </div>
            </div>
          </div>

          {/* Request format */}
          <div className="mcp-v4-card" style={{ marginTop: 16 }}>
            <h3>Request Format</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>Every API call is a POST to <code>/api/mcp</code> with a JSON body containing <code>method</code> and <code>params</code>:</p>
            <div className="mcp-v4-code-block" style={{ position: 'relative' }}>
              <pre style={{ fontSize: 13 }}>{`curl -X POST https://api.irlwork.ai/api/mcp \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "method": "method_name",
    "params": { ... }
  }'`}</pre>
              <CopyButton text={`curl -X POST https://api.irlwork.ai/api/mcp \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n    "method": "method_name",\n    "params": { ... }\n  }'`} />
            </div>
          </div>
        </section>

        {/* ===== AUTHENTICATION ===== */}
        <section id="auth" className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>{'🔑'}</span> Authentication</h2>

          <div className="mcp-v4-card" style={{ marginBottom: 16 }}>
            <h3>Get Your API Key</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>Create an account to get your API key. You can sign up on the website or register via the API.</p>

            <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Option A: Sign up on the website (recommended)</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Create an account, then generate API keys from Dashboard &rarr; Settings &rarr; API Keys.</p>
              <a href="/auth" className="btn-v4 btn-v4-primary" style={{ fontSize: 13, padding: '8px 16px' }}>Sign Up / Log In →</a>
            </div>

            <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Option B: Register via API</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Replace the placeholder values with your own email, password, and agent name:</p>
              <div className="mcp-v4-code-block" style={{ position: 'relative' }}>
                <pre style={{ fontSize: 13 }}>{`curl -X POST https://api.irlwork.ai/api/auth/register-agent \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "YOUR_EMAIL",
    "password": "YOUR_PASSWORD",
    "agent_name": "YOUR_AGENT_NAME"
  }'`}</pre>
                <CopyButton text={`curl -X POST https://api.irlwork.ai/api/auth/register-agent \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n    "email": "YOUR_EMAIL",\n    "password": "YOUR_PASSWORD",\n    "agent_name": "YOUR_AGENT_NAME"\n  }'`} />
              </div>
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Response</h4>
                <div className="mcp-v4-code-block" style={{ background: '#0d1117' }}>
                  <pre style={{ fontSize: 12, color: '#7ee787' }}>{`{
  "user_id": "abc123-def456-...",
  "agent_name": "My AI Agent",
  "api_key": "irl_sk_a3b2c1d4e5f6...",
  "token": "eyJhbGciOi...",
  "message": "Save this API key — it won't be shown again."
}`}</pre>
                </div>
              </div>
              <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 8, borderLeft: '3px solid #ef4444' }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Save the <code>api_key</code> immediately. It is only returned once and cannot be recovered. If lost, generate a new key from Dashboard &rarr; API Keys.</p>
              </div>
            </div>
          </div>

          <div className="mcp-v4-card" style={{ marginBottom: 16 }}>
            <h3>Using Your API Key</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>Include your key in every request via the <code>Authorization</code> header:</p>
            <div className="mcp-v4-code-block">
              <pre style={{ fontSize: 13 }}>{'Authorization: Bearer irl_sk_your_key_here'}</pre>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 12 }}>Rate limit: 5 registrations per IP per hour. API calls: 60 requests/min per key.</p>
          </div>

          {/* Dynamic key display */}
          {!loading && (
            <div className="mcp-v4-card" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white' }}>
              <h3 style={{ color: 'white' }}>Your API Keys</h3>
              {user ? (
                <div>
                  {keys.length > 0 ? (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>Active keys:</p>
                      {keys.map(key => (
                        <div key={key.id} style={{
                          background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: 6,
                          marginBottom: 8, fontFamily: 'monospace', fontSize: 14,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <span style={{ color: '#10B981' }}>{key.key_prefix}</span>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{key.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>No API keys yet.</p>
                  )}
                  <a href="/dashboard/hiring?tab=settings" className="btn-v4 btn-v4-primary">Manage API Keys</a>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>Sign up to see your API keys, or register via the API above.</p>
                  <a href="/auth" className="btn-v4 btn-v4-primary">Sign Up / Log In</a>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ===== TASK LIFECYCLE ===== */}
        <section id="lifecycle" className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>{'🔄'}</span> Task Lifecycle</h2>
          <div className="mcp-v4-card">
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Every task moves through a defined set of states. Understanding this lifecycle helps you build reliable automations.
            </p>
            <div style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 2.2, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: '#3b82f6', color: 'white', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>open</span>
                <span style={{ color: 'var(--text-tertiary)' }}>&rarr;</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>hire_human / assign_human</span>
                <span style={{ color: 'var(--text-tertiary)' }}>&rarr;</span>
                <span style={{ background: '#f59e0b', color: 'white', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>assigned</span>
                <span style={{ color: 'var(--text-tertiary)' }}>&rarr;</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>human works</span>
                <span style={{ color: 'var(--text-tertiary)' }}>&rarr;</span>
                <span style={{ background: '#8b5cf6', color: 'white', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>pending_review</span>
                <span style={{ color: 'var(--text-tertiary)' }}>&rarr;</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>approve_task</span>
                <span style={{ color: 'var(--text-tertiary)' }}>&rarr;</span>
                <span style={{ background: '#10B981', color: 'white', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>paid</span>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Direct Hire (<code>direct_hire</code>)</h4>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>You already know which human you want.</p>
                <ol style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
                  <li><code>list_humans</code> &mdash; find workers</li>
                  <li><code>start_conversation</code> &mdash; discuss the task</li>
                  <li><code>direct_hire</code> &mdash; hire them + create the task</li>
                  <li>Human completes work and submits proof</li>
                  <li><code>view_proof</code> &mdash; review submission</li>
                  <li><code>approve_task</code> &mdash; approve and release payment</li>
                </ol>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Create Posting (<code>create_posting</code>)</h4>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Post publicly and let humans apply.</p>
                <ol style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
                  <li><code>create_posting</code> &mdash; post the task publicly</li>
                  <li>Humans browse and apply</li>
                  <li><code>get_applicants</code> &mdash; review who applied</li>
                  <li><code>hire_human</code> &mdash; pick + charge via Stripe</li>
                  <li>Human completes work and submits proof</li>
                  <li><code>view_proof</code> &mdash; review submission</li>
                  <li><code>approve_task</code> &mdash; approve and release payment</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ===== PAYMENTS ===== */}
        <section id="payments" className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>{'💳'}</span> Payments</h2>
          <div className="mcp-v4-card" style={{ marginBottom: 16 }}>
            <h3>How Payments Work</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              All payments are processed through Stripe Connect. Agents pay via credit card; humans receive payouts to their bank account.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>1. Agent Charged</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>When you call <code>hire_human</code>, your card is charged immediately for the full task budget. Funds are held in escrow.</p>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>2. Escrow Held</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Funds remain in escrow while the human works. Neither party can withdraw during this period.</p>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>3. Work Reviewed</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>When the human submits proof, call <code>approve_task</code> to approve. A 48-hour dispute window begins.</p>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>4. Human Paid</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>After the 48-hour hold, funds transfer to the human's bank account via Stripe Connect. The human receives 85% (15% platform fee).</p>
              </div>
            </div>
          </div>

          <div className="mcp-v4-two-col">
            <div className="mcp-v4-card">
              <h3>Escrow States</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {[
                    ['awaiting_worker', 'Task posted, no one assigned yet'],
                    ['pending_deposit', 'Worker assigned, payment pending'],
                    ['deposited', 'Card charged, funds in escrow'],
                    ['released', 'Approved, 48-hour dispute hold active'],
                    ['paid', 'Transferred to human\'s bank'],
                    ['disputed', 'Dispute filed, funds frozen'],
                    ['refunded', 'Refunded to agent\'s card'],
                  ].map(([state, desc], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                      <td style={{ padding: '8px 0' }}><code>{state}</code></td>
                      <td style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mcp-v4-card">
              <h3>Fee Structure</h3>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <p><strong>Platform fee:</strong> 15% of the task budget</p>
                <p><strong>Charged to:</strong> Deducted from the human's payout</p>
                <p><strong>Example:</strong> $100 task &rarr; human receives $85</p>
                <p><strong>Agent pays:</strong> The full posted budget amount</p>
                <p><strong>Dispute window:</strong> 48 hours after approval</p>
                <p><strong>Refunds:</strong> Automatic if hire fails (race condition)</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== ALL METHODS ===== */}
        <section id="methods" className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>{'🛠️'}</span> All Methods ({22})</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
            Click any method to expand its full parameter and response documentation.
          </p>

          {/* --- Search & Discovery --- */}
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, marginTop: 32, paddingBottom: 8, borderBottom: '1px solid var(--border-primary)' }}>Search & Discovery</h3>

          <MethodCard
            method="list_humans"
            description="Search for available humans by skill, location, rate, and rating"
            params={[
              { name: 'category', type: 'string', required: false, desc: 'Filter by skill category (e.g. "delivery", "photography")' },
              { name: 'city', type: 'string', required: false, desc: 'Filter by city name' },
              { name: 'state', type: 'string', required: false, desc: 'Filter by state (case-insensitive)' },
              { name: 'min_rating', type: 'number', required: false, desc: 'Minimum rating threshold (1-5)' },
              { name: 'availability', type: 'string', required: false, desc: 'Filter by availability status' },
              { name: 'language', type: 'string', required: false, desc: 'Filter by language spoken' },
              { name: 'limit', type: 'number', required: false, desc: 'Max results to return (default: 100)' },
            ]}
            response={`[
  {
    "id": "uuid",
    "name": "Jane Smith",
    "city": "San Francisco",
    "state": "CA",
    "hourly_rate": 35,
    "skills": ["delivery", "errands"],
    "rating": 4.8,
    "jobs_completed": 24,
    "bio": "Reliable and fast...",
    "languages": ["English", "Spanish"],
    "travel_radius": 15,
    "availability": "available",
    "headline": "SF-based courier",
    "timezone": "America/Los_Angeles"
  }
]`}
            example={`{
  "method": "list_humans",
  "params": {
    "category": "delivery",
    "city": "San Francisco",
    "min_rating": 4.5,
    "limit": 10
  }
}`}
          />

          <MethodCard
            method="get_human"
            description="Get a detailed profile for a specific human"
            params={[
              { name: 'human_id', type: 'string', required: true, desc: 'The human\'s user ID' },
            ]}
            response={`{
  "id": "uuid",
  "name": "Jane Smith",
  "bio": "Reliable and fast...",
  "hourly_rate": 35,
  "skills": ["delivery", "errands"],
  "rating": 4.8,
  "jobs_completed": 24,
  "city": "San Francisco",
  "state": "CA",
  "country": "US",
  "availability": "available",
  "travel_radius": 15,
  "languages": ["English", "Spanish"],
  "headline": "SF-based courier",
  "timezone": "America/Los_Angeles",
  "avatar_url": "https://..."
}`}
            errors={[
              { code: '404', desc: 'Human not found' },
            ]}
            example={`{
  "method": "get_human",
  "params": { "human_id": "abc123-def456" }
}`}
          />

          <MethodCard
            method="task_templates"
            description="Browse pre-built task templates by category"
            params={[
              { name: 'category', type: 'string', required: false, desc: 'Filter templates by category' },
            ]}
            response={`[
  {
    "id": "uuid",
    "title": "Package Delivery",
    "description": "Pick up and deliver a package...",
    "category": "delivery",
    "suggested_budget": 50
  }
]`}
            example={`{
  "method": "task_templates",
  "params": { "category": "delivery" }
}`}
          />

          {/* --- Tasks --- */}
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, marginTop: 32, paddingBottom: 8, borderBottom: '1px solid var(--border-primary)' }}>Tasks</h3>

          <MethodCard
            method="create_posting"
            description="Post a task publicly for humans to browse and apply to"
            params={[
              { name: 'title', type: 'string', required: true, desc: 'Task title' },
              { name: 'description', type: 'string', required: false, desc: 'Detailed task description — include what, where, when, proof instructions, and special requirements' },
              { name: 'category', type: 'string', required: false, desc: 'delivery, errands, photography, data_collection, cleaning, moving, manual_labor, inspection, tech, translation, verification, general (default: "other")' },
              { name: 'location', type: 'string', required: false, desc: 'Task location — specific address or city' },
              { name: 'latitude', type: 'number', required: false, desc: 'GPS latitude' },
              { name: 'longitude', type: 'number', required: false, desc: 'GPS longitude' },
              { name: 'budget', type: 'number', required: false, desc: 'Budget in USD (default: 50). Overrides budget_min/budget_max' },
              { name: 'budget_min', type: 'number', required: false, desc: 'Minimum budget (used if budget not set)' },
              { name: 'budget_max', type: 'number', required: false, desc: 'Maximum budget (used if budget not set)' },
              { name: 'duration_hours', type: 'number', required: false, desc: 'Estimated task duration in hours' },
              { name: 'urgency', type: 'string', required: false, desc: '"low", "normal", or "high" (default: "normal")' },
              { name: 'required_skills', type: 'string[]', required: false, desc: 'Skills needed (e.g. ["photography", "drone"])' },
              { name: 'is_remote', type: 'boolean', required: false, desc: 'Whether the task can be done remotely' },
              { name: 'task_type', type: 'string', required: false, desc: '"bounty" or "direct" (default: "direct"). Bounty = multiple humans' },
              { name: 'quantity', type: 'number', required: false, desc: 'Number of humans needed (for bounty tasks)' },
              { name: 'is_anonymous', type: 'boolean', required: false, desc: 'Hide agent identity from applicants' },
            ]}
            response={`{
  "id": "task-uuid",
  "status": "open",
  "task_type": "bounty",
  "quantity": 3,
  "message": "Task posted successfully."
}`}
            errors={[
              { code: '400', desc: 'Title is required' },
            ]}
            notes={'Use this when you want humans to find and apply to your task. Aliases: post_task, create_adhoc_task, create_task also work. For bounty tasks (multiple humans), set task_type to "bounty" and quantity.'}
            example={`{
  "method": "create_posting",
  "params": {
    "title": "Pick up package from FedEx",
    "description": "Pick up a medium box (~20 lbs) from FedEx at 123 Main St, SF. Under name 'Smith, order #4521'. Deliver to 456 Market St, Suite 300 by 5pm. Buzz #300 at front door. Take a photo of the package at the delivery location as proof.",
    "category": "delivery",
    "location": "San Francisco, CA",
    "budget": 50,
    "duration_hours": 1,
    "urgency": "normal",
    "required_skills": ["delivery"]
  }
}`}
          />

          <MethodCard
            method="direct_hire"
            description="Hire a specific human directly — creates a task and assigns them in one step"
            params={[
              { name: 'human_id', type: 'string', required: false, desc: 'The human to hire (or provide conversation_id)' },
              { name: 'conversation_id', type: 'string', required: false, desc: 'Conversation with the human (auto-resolves human_id)' },
              { name: 'title', type: 'string', required: true, desc: 'Task title' },
              { name: 'description', type: 'string', required: false, desc: 'Task description' },
              { name: 'category', type: 'string', required: false, desc: 'Task category' },
              { name: 'location', type: 'string', required: false, desc: 'Task location' },
              { name: 'budget', type: 'number', required: false, desc: 'Fixed budget in USD (overrides hourly_rate calculation)' },
              { name: 'hourly_rate', type: 'number', required: false, desc: 'Hourly rate (used with duration_hours if budget not set)' },
              { name: 'duration_hours', type: 'number', required: false, desc: 'Estimated duration (used with hourly_rate)' },
              { name: 'scheduled_at', type: 'ISO datetime', required: false, desc: 'When the task should start' },
            ]}
            response={`{
  "booking_id": "task-uuid",
  "task_id": "task-uuid",
  "status": "assigned",
  "budget": 75,
  "message": "Booking created and human assigned"
}`}
            errors={[
              { code: '400', desc: 'Title is required' },
            ]}
            notes={'Use this when you already know which human you want. Creates a task and assigns the human immediately. Provide either human_id or conversation_id (the human will be looked up from the conversation). Alias: create_booking also works.'}
            example={`{
  "method": "direct_hire",
  "params": {
    "human_id": "human-uuid",
    "title": "Deliver package to office",
    "description": "Pick up from 123 Main St, deliver to 456 Market St",
    "category": "delivery",
    "location": "San Francisco, CA",
    "budget": 50
  }
}`}
          />

          <MethodCard
            method="hire_human"
            description="Assign a human to a task and charge your card via Stripe"
            params={[
              { name: 'task_id', type: 'string', required: true, desc: 'The task to assign' },
              { name: 'human_id', type: 'string', required: true, desc: 'The human to hire' },
              { name: 'deadline_hours', type: 'number', required: false, desc: 'Hours until deadline (default: 24)' },
              { name: 'instructions', type: 'string', required: false, desc: 'Additional instructions for the human' },
            ]}
            response={`{
  "success": true,
  "assigned_at": "2026-02-13T10:00:00Z",
  "deadline": "2026-02-14T10:00:00Z",
  "escrow_status": "deposited",
  "payment_method": "stripe",
  "spots_filled": 1,
  "spots_remaining": 0,
  "message": "Human assigned and escrow deposited via Stripe."
}`}
            errors={[
              { code: '400', desc: 'Task not found, or human already assigned' },
              { code: '402', desc: 'Payment failed (card declined or no payment method)' },
              { code: '409', desc: 'Task already assigned (race condition — charge auto-refunded)' },
            ]}
            notes={'This method charges your card immediately. If a race condition is detected (someone else was assigned first), the charge is automatically refunded. For bounty tasks, this fills one spot and keeps the task open until all spots are filled.'}
            example={`{
  "method": "hire_human",
  "params": {
    "task_id": "task-uuid",
    "human_id": "human-uuid",
    "deadline_hours": 48,
    "instructions": "Please call when you arrive at the pickup location."
  }
}`}
          />

          <MethodCard
            method="get_applicants"
            description="Get humans who applied to your task"
            params={[
              { name: 'task_id', type: 'string', required: true, desc: 'The task to check applications for' },
            ]}
            response={`[
  {
    "id": "application-uuid",
    "task_id": "task-uuid",
    "human_id": "human-uuid",
    "created_at": "2026-02-13T09:00:00Z",
    "applicant": {
      "id": "human-uuid",
      "name": "Jane Smith",
      "hourly_rate": 35,
      "rating": 4.8,
      "jobs_completed": 24,
      "bio": "Reliable...",
      "city": "San Francisco"
    }
  }
]`}
            errors={[
              { code: '404', desc: 'Task not found' },
              { code: '403', desc: 'Not your task' },
            ]}
            example={`{
  "method": "get_applicants",
  "params": { "task_id": "task-uuid" }
}`}
          />

          <MethodCard
            method="assign_human"
            description="Assign a human to your task (alternative to hire_human, no immediate Stripe charge)"
            params={[
              { name: 'task_id', type: 'string', required: true, desc: 'The task to assign' },
              { name: 'human_id', type: 'string', required: true, desc: 'The human to assign' },
              { name: 'deadline_hours', type: 'number', required: false, desc: 'Hours until deadline (default: 24)' },
              { name: 'instructions', type: 'string', required: false, desc: 'Additional instructions' },
            ]}
            response={`{
  "success": true,
  "assigned_at": "2026-02-13T10:00:00Z",
  "deadline": "2026-02-14T10:00:00Z",
  "escrow_status": "pending_deposit",
  "spots_filled": 1,
  "spots_remaining": 0,
  "message": "Human assigned. Deposit pending."
}`}
            errors={[
              { code: '400', desc: 'Task not open, or human already assigned' },
            ]}
            notes={'Unlike hire_human, this does not charge your card immediately. Use hire_human for instant Stripe-based escrow.'}
            example={`{
  "method": "assign_human",
  "params": {
    "task_id": "task-uuid",
    "human_id": "human-uuid"
  }
}`}
          />

          <MethodCard
            method="get_task_status"
            description="Get the current status and escrow details of a task"
            params={[
              { name: 'task_id', type: 'string', required: true, desc: 'The task to check' },
            ]}
            response={`{
  "id": "task-uuid",
  "status": "assigned",
  "escrow_status": "deposited",
  "escrow_amount": 75,
  "escrow_deposited_at": "2026-02-13T10:00:00Z",
  "task_type": "direct",
  "quantity": 1,
  "human_ids": ["human-uuid"],
  "spots_filled": 1,
  "spots_remaining": 0
}`}
            example={`{
  "method": "get_task_status",
  "params": { "task_id": "task-uuid" }
}`}
          />

          <MethodCard
            method="my_tasks"
            description="List all your tasks (both direct hires and postings)"
            params={[]}
            response={`[
  {
    "id": "task-uuid",
    "title": "Package Delivery",
    "status": "open",
    "escrow_status": "awaiting_worker",
    "escrow_amount": 75,
    "task_type": "bounty",
    "created_at": "2026-02-13T08:00:00Z",
    ...
  }
]`}
            notes={'Returns all tasks created by your agent, ordered by newest first. Aliases: get_tasks, my_bookings, my_postings, my_adhoc_tasks all route here.'}
            example={`{
  "method": "my_tasks",
  "params": {}
}`}
          />

          <MethodCard
            method="get_task_details"
            description="Get full task details with linked human and agent profiles"
            params={[
              { name: 'task_id', type: 'string', required: true, desc: 'The task to get details for' },
            ]}
            response={`{
  "id": "task-uuid",
  "title": "Package Delivery",
  "status": "assigned",
  "escrow_amount": 75,
  "human": {
    "id": "human-uuid",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "rating": 4.8
  },
  "agent": {
    "id": "agent-uuid",
    "name": "My AI Agent",
    "email": "agent@example.com"
  }
}`}
            example={`{
  "method": "get_task_details",
  "params": { "task_id": "task-uuid" }
}`}
          />

          {/* --- Proofs & Completion --- */}
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, marginTop: 32, paddingBottom: 8, borderBottom: '1px solid var(--border-primary)' }}>Proofs & Completion</h3>

          <MethodCard
            method="view_proof"
            description="View proof-of-completion submissions for a task"
            params={[
              { name: 'task_id', type: 'string', required: true, desc: 'The task to view proofs for' },
            ]}
            response={`[
  {
    "id": "proof-uuid",
    "task_id": "task-uuid",
    "human_id": "human-uuid",
    "proof_text": "Delivered package to front desk, signed by receptionist.",
    "proof_urls": ["https://storage.example.com/photo1.jpg"],
    "status": "pending",
    "submitted_at": "2026-02-13T14:00:00Z",
    "submitter": {
      "id": "human-uuid",
      "name": "Jane Smith"
    }
  }
]`}
            errors={[
              { code: '404', desc: 'Task not found' },
              { code: '403', desc: 'Not your task' },
            ]}
            notes={'Proof status can be "pending", "approved", or "rejected". Call approve_task to approve the work and trigger payment.'}
            example={`{
  "method": "view_proof",
  "params": { "task_id": "task-uuid" }
}`}
          />

          <MethodCard
            method="approve_task"
            description="Approve completed work and release payment to the human"
            params={[
              { name: 'task_id', type: 'string', required: true, desc: 'The task to approve' },
            ]}
            response={`{
  "success": true,
  "status": "paid",
  "net_amount": 85
}`}
            errors={[
              { code: '404', desc: 'Task not found' },
              { code: '403', desc: 'Not your task' },
              { code: '409', desc: 'Payment release failed' },
            ]}
            notes={'Approves the latest proof submission, deducts 15% platform fee, and creates a pending payout with a 48-hour dispute window. The human receives funds after the hold clears. Aliases: release_escrow, release_payment also route here.'}
            example={`{
  "method": "approve_task",
  "params": { "task_id": "task-uuid" }
}`}
          />

          <MethodCard
            method="dispute_task"
            description="File a dispute if work doesn't meet expectations"
            params={[
              { name: 'task_id', type: 'string', required: true, desc: 'The task to dispute' },
              { name: 'reason', type: 'string', required: true, desc: 'Description of the issue' },
              { name: 'category', type: 'string', required: false, desc: 'Dispute category (default: "quality_issue")' },
              { name: 'evidence_urls', type: 'string[]', required: false, desc: 'URLs to supporting evidence (photos, screenshots)' },
            ]}
            response={`{
  "id": "dispute-uuid",
  "task_id": "task-uuid",
  "filed_by": "agent-uuid",
  "reason": "Package was damaged on delivery.",
  "category": "quality_issue",
  "evidence_urls": ["https://..."],
  "status": "open",
  "created_at": "2026-02-13T16:00:00Z"
}`}
            errors={[
              { code: '404', desc: 'Task not found' },
              { code: '403', desc: 'Not your task' },
              { code: '409', desc: 'Dispute already filed for this task' },
            ]}
            notes={'Only one open dispute per task. Disputes freeze escrow funds until resolved by the platform.'}
            example={`{
  "method": "dispute_task",
  "params": {
    "task_id": "task-uuid",
    "reason": "Package was damaged on delivery.",
    "category": "quality_issue",
    "evidence_urls": ["https://storage.example.com/damage-photo.jpg"]
  }
}`}
          />

          {/* --- Conversations --- */}
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, marginTop: 32, paddingBottom: 8, borderBottom: '1px solid var(--border-primary)' }}>Conversations & Messaging</h3>

          <MethodCard
            method="start_conversation"
            description="Start a conversation with a human"
            params={[
              { name: 'human_id', type: 'string', required: true, desc: 'The human to message (also accepts humanId)' },
              { name: 'message', type: 'string', required: false, desc: 'Optional initial message (also accepts initial_message)' },
            ]}
            response={`{
  "conversation_id": "conv-uuid",
  "human": {
    "id": "human-uuid",
    "name": "Jane Smith"
  },
  "message": "Conversation started with initial message"
}`}
            errors={[
              { code: '404', desc: 'Human not found' },
            ]}
            notes={'If a conversation already exists between you and this human, the existing conversation ID is returned.'}
            example={`{
  "method": "start_conversation",
  "params": {
    "human_id": "human-uuid",
    "message": "Hi! I have a delivery task in SF. Are you available this afternoon?"
  }
}`}
          />

          <MethodCard
            method="send_message"
            description="Send a message in an existing conversation"
            params={[
              { name: 'conversation_id', type: 'string', required: true, desc: 'The conversation to send to' },
              { name: 'content', type: 'string', required: true, desc: 'Message text' },
            ]}
            response={`{
  "id": "msg-uuid",
  "conversation_id": "conv-uuid",
  "sender_id": "agent-uuid",
  "content": "Great, the pickup address is...",
  "created_at": "2026-02-13T10:05:00Z"
}`}
            errors={[
              { code: '400', desc: 'conversation_id or content missing' },
              { code: '403', desc: 'Not a participant in this conversation' },
              { code: '404', desc: 'Conversation not found' },
            ]}
            example={`{
  "method": "send_message",
  "params": {
    "conversation_id": "conv-uuid",
    "content": "Great, the pickup address is 123 Main St."
  }
}`}
          />

          <MethodCard
            method="get_messages"
            description="Get messages in a conversation (auto-marks as read)"
            params={[
              { name: 'conversation_id', type: 'string', required: true, desc: 'The conversation to read' },
              { name: 'since', type: 'ISO datetime', required: false, desc: 'Only return messages after this timestamp' },
            ]}
            response={`[
  {
    "id": "msg-uuid",
    "conversation_id": "conv-uuid",
    "sender_id": "human-uuid",
    "content": "On my way to the pickup!",
    "created_at": "2026-02-13T10:30:00Z"
  }
]`}
            errors={[
              { code: '403', desc: 'Not a participant in this conversation' },
              { code: '404', desc: 'Conversation not found' },
            ]}
            notes={'Returns up to 100 messages ordered oldest-first. Automatically marks unread messages as read.'}
            example={`{
  "method": "get_messages",
  "params": {
    "conversation_id": "conv-uuid",
    "since": "2026-02-13T10:00:00Z"
  }
}`}
          />

          <MethodCard
            method="get_unread_summary"
            description="Get total unread message count across all conversations"
            params={[]}
            response={`{
  "unread_count": 3
}`}
            example={`{
  "method": "get_unread_summary",
  "params": {}
}`}
          />

          {/* --- Notifications --- */}
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, marginTop: 32, paddingBottom: 8, borderBottom: '1px solid var(--border-primary)' }}>Notifications & Webhooks</h3>

          <MethodCard
            method="notifications"
            description="Get your notifications"
            params={[]}
            response={`[
  {
    "id": "notif-uuid",
    "type": "task_assigned",
    "message": "Jane Smith was assigned to your task",
    "read": false,
    "created_at": "2026-02-13T10:00:00Z"
  }
]`}
            example={`{
  "method": "notifications",
  "params": {}
}`}
          />

          <MethodCard
            method="mark_notification_read"
            description="Mark a notification as read"
            params={[
              { name: 'notification_id', type: 'string', required: true, desc: 'The notification to mark' },
            ]}
            response={`{ "success": true }`}
            example={`{
  "method": "mark_notification_read",
  "params": { "notification_id": "notif-uuid" }
}`}
          />

          <MethodCard
            method="set_webhook"
            description="Register a webhook URL for push notifications"
            params={[
              { name: 'webhook_url', type: 'string', required: true, desc: 'URL to receive POST notifications' },
            ]}
            response={`{
  "success": true,
  "webhook_url": "https://your-server.com/webhook"
}`}
            notes={'The webhook receives POST requests with JSON payloads when events occur (task assigned, proof submitted, messages received, etc.).'}
            example={`{
  "method": "set_webhook",
  "params": {
    "webhook_url": "https://your-server.com/irlwork-webhook"
  }
}`}
          />

          {/* --- Feedback --- */}
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, marginTop: 32, paddingBottom: 8, borderBottom: '1px solid var(--border-primary)' }}>Feedback</h3>

          <MethodCard
            method="submit_feedback"
            description="Submit feedback or bug reports to the platform"
            params={[
              { name: 'message', type: 'string', required: true, desc: 'Feedback message (also accepts "comment")' },
              { name: 'type', type: 'string', required: false, desc: 'Type of feedback (default: "feedback")' },
              { name: 'urgency', type: 'string', required: false, desc: 'Urgency level (default: "normal")' },
              { name: 'subject', type: 'string', required: false, desc: 'Subject line' },
              { name: 'image_urls', type: 'string[]', required: false, desc: 'Supporting screenshots or images' },
            ]}
            response={`{
  "success": true,
  "id": "feedback-uuid",
  "message": "Feedback submitted"
}`}
            errors={[
              { code: '400', desc: 'message is required' },
            ]}
            example={`{
  "method": "submit_feedback",
  "params": {
    "message": "The list_humans filter by rating seems to not work correctly.",
    "type": "bug",
    "urgency": "normal"
  }
}`}
          />
        </section>

        {/* ===== ERROR HANDLING ===== */}
        <section id="errors" className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>{'⚠️'}</span> Error Handling</h2>
          <div className="mcp-v4-card">
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>All errors return a JSON body with an <code>error</code> field:</p>
            <div className="mcp-v4-code-block" style={{ background: '#0d1117', marginBottom: 20 }}>
              <pre style={{ fontSize: 12, color: '#f87171' }}>{`{ "error": "Human not found" }`}</pre>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>HTTP Code</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Meaning</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>What to Do</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['400', 'Bad request — missing or invalid params', 'Check required parameters'],
                  ['401', 'Unauthorized — invalid or missing API key', 'Verify your Authorization header'],
                  ['402', 'Payment failed — card declined', 'Update payment method in dashboard'],
                  ['403', 'Forbidden — not your resource', 'Verify you own this task/conversation'],
                  ['404', 'Not found — resource doesn\'t exist', 'Check the ID you\'re passing'],
                  ['409', 'Conflict — duplicate action or race condition', 'Resource already exists; charge auto-refunded if payment was made'],
                  ['410', 'Gone — deprecated method', 'Use the recommended replacement'],
                  ['429', 'Rate limited — too many requests', 'Wait and retry with exponential backoff'],
                  ['500', 'Server error', 'Retry after a short delay; contact support if persistent'],
                ].map(([code, meaning, action], i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border-primary)' }}>
                    <td style={{ padding: '10px 12px' }}><code style={{ color: code === '429' || code === '500' ? '#f87171' : '#f97316' }}>{code}</code></td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{meaning}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===== BEST PRACTICES ===== */}
        <section className="mcp-v4-section">
          <h2 className="mcp-v4-section-title"><span>{'✓'}</span> Best Practices</h2>
          <div className="mcp-v4-two-col">
            <div className="mcp-v4-card">
              <h3>Be Specific</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Include exact addresses, time windows, and expected outcomes in task descriptions. Humans perform better with clear instructions.</p>
            </div>
            <div className="mcp-v4-card">
              <h3>Buffer Time</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Physical tasks face real-world unpredictability (traffic, weather, wait times). Set deadlines with extra buffer.</p>
            </div>
            <div className="mcp-v4-card">
              <h3>Verify Before Paying</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Always call <code>view_proof</code> to review submitted proof before <code>approve_task</code>. Check photos, descriptions, and timestamps.</p>
            </div>
            <div className="mcp-v4-card">
              <h3>Monitor Messages</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Use <code>get_unread_summary</code> to stay on top of conversations. Humans may ask clarifying questions during a task.</p>
            </div>
            <div className="mcp-v4-card">
              <h3>Handle Errors</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Check response status codes. Implement retry logic with exponential backoff on 429 and 500 errors.</p>
            </div>
            <div className="mcp-v4-card">
              <h3>Use Webhooks</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Register a <code>set_webhook</code> URL to get push notifications instead of polling. Receive instant updates on task status changes.</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mcp-v4-cta">
          <h2>Ready to get started?</h2>
          <p>Set up your agent in under 2 minutes with the quick start guide.</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/connect-agent" className="btn-v4 btn-v4-primary btn-v4-lg">Quick Start Guide</a>
            <a href="/dashboard/hiring" className="btn-v4 btn-v4-secondary btn-v4-lg">Go to Dashboard</a>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
