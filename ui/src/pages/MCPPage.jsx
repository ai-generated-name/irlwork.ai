// MCPPage — Full API Reference redesign with sticky sidebar, collapsible category accordions
// Accurate method signatures, params, responses, error codes, and lifecycle docs
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Check, Copy, ChevronDown, Menu, X } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

// ── Shared small components ──

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

function SectionDivider() {
  return <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', margin: '44px 0' }} />
}

// ── Data ──

const SIDEBAR_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'auth', label: 'Authentication' },
  { id: 'lifecycle', label: 'Task lifecycle' },
  { id: 'payments', label: 'Payments' },
  { id: 'methods', label: 'All methods (26)' },
  { id: 'errors', label: 'Error handling' },
  { id: 'practices', label: 'Best practices' },
]

const METHOD_CATEGORIES = [
  { id: 'search', label: 'Search & discovery', count: 3 },
  { id: 'tasks', label: 'Tasks', count: 8 },
  { id: 'proofs', label: 'Proofs & completion', count: 3 },
  { id: 'conversations', label: 'Conversations', count: 4 },
  { id: 'notifications', label: 'Notifications', count: 3 },
  { id: 'feedback', label: 'Feedback', count: 1 },
  { id: 'subscriptions', label: 'Subscriptions', count: 4 },
]

const METHODS = {
  search: [
    { name: 'list_humans', desc: 'Search for available humans by skill, location, rate, and rating' },
    { name: 'get_human', desc: 'Get a detailed profile for a specific human' },
    { name: 'task_templates', desc: 'Browse pre-built task templates by category' },
  ],
  tasks: [
    { name: 'create_posting', desc: 'Post a task publicly for humans to browse and apply to' },
    { name: 'direct_hire', desc: 'Hire a specific human directly — creates a task and assigns them in one step' },
    { name: 'hire_human', desc: 'Assign a human to a task and charge your card via Stripe' },
    { name: 'get_applicants', desc: 'Get humans who applied to your task' },
    { name: 'assign_human', desc: 'Assign a human to your task (no immediate Stripe charge)' },
    { name: 'get_task_status', desc: 'Get the current status and escrow details of a task' },
    { name: 'my_tasks', desc: 'List all your tasks (both direct hires and postings)' },
    { name: 'get_task_details', desc: 'Get full task details with linked human and agent profiles' },
  ],
  proofs: [
    { name: 'view_proof', desc: 'View proof-of-completion submissions for a task' },
    { name: 'approve_task', desc: 'Approve completed work and release payment to the human' },
    { name: 'dispute_task', desc: 'File a dispute if work doesn\'t meet expectations' },
  ],
  conversations: [
    { name: 'start_conversation', desc: 'Start a conversation with a human' },
    { name: 'send_message', desc: 'Send a message in an existing conversation' },
    { name: 'get_messages', desc: 'Get messages in a conversation (auto-marks as read)' },
    { name: 'get_unread_summary', desc: 'Get total unread message count across all conversations' },
  ],
  notifications: [
    { name: 'notifications', desc: 'Get your notifications' },
    { name: 'mark_notification_read', desc: 'Mark a notification as read' },
    { name: 'set_webhook', desc: 'Register a webhook URL for push notifications' },
  ],
  feedback: [
    { name: 'submit_feedback', desc: 'Submit feedback or bug reports to the platform' },
  ],
  subscriptions: [
    { name: 'subscription_tiers', desc: 'Get available subscription plans and pricing' },
    { name: 'subscription_status', desc: 'Get your current subscription tier and billing status' },
    { name: 'subscription_upgrade', desc: 'Start a subscription upgrade — returns a Stripe checkout URL' },
    { name: 'subscription_portal', desc: 'Get a Stripe billing portal URL to manage subscription' },
  ],
}

// list_humans expanded example data
const LIST_HUMANS_PARAMS = [
  { name: 'category', type: 'string', required: false, desc: 'Filter by skill category (e.g. "delivery", "photography")' },
  { name: 'city', type: 'string', required: false, desc: 'Filter by city name' },
  { name: 'state', type: 'string', required: false, desc: 'Filter by state (case-insensitive)' },
  { name: 'min_rating', type: 'number', required: false, desc: 'Minimum rating threshold (1-5)' },
  { name: 'availability', type: 'string', required: false, desc: 'Filter by availability status' },
  { name: 'limit', type: 'number', required: false, desc: 'Max results to return (default: 100)' },
]

const LIST_HUMANS_RESPONSE = `[
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
    "availability": "available"
  }
]`

const LIST_HUMANS_EXAMPLE = `{
  "method": "list_humans",
  "params": {
    "category": "delivery",
    "city": "San Francisco",
    "min_rating": 4.5,
    "limit": 10
  }
}`

const ERROR_CODES = [
  ['400', 'Bad request', 'Check required params'],
  ['401', 'Unauthorized', 'Verify auth header'],
  ['402', 'Payment failed', 'Update payment method'],
  ['403', 'Forbidden', 'Verify ownership'],
  ['404', 'Not found', 'Check the ID'],
  ['409', 'Conflict', 'Resource exists'],
  ['429', 'Rate limited', 'Exponential backoff'],
  ['500', 'Server error', 'Retry; contact support'],
]

const BEST_PRACTICES = [
  { title: 'Be Specific', text: 'Include addresses, time windows, expected outcomes.' },
  { title: 'Buffer Time', text: 'Account for traffic, weather, wait times.' },
  { title: 'Verify Before Paying', text: 'Always call view_proof before approve_task.' },
  { title: 'Monitor Messages', text: 'Use get_unread_summary to stay on top.' },
  { title: 'Handle Errors', text: 'Retry with exponential backoff on 429/500.' },
  { title: 'Use Webhooks', text: 'set_webhook for push notifications.' },
]

// ── Category Accordion ──

function CategoryAccordion({ category, isOpen, onToggle }) {
  const methods = METHODS[category.id]
  const isListHumans = category.id === 'search'
  const [expandedMethod, setExpandedMethod] = useState(null)

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid rgba(0,0,0,0.06)',
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 18px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <ChevronDown
          size={16}
          style={{
            color: '#999',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 650, color: '#1a1a1a', flex: 1 }}>
          {category.label}
        </span>
        <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: '#bbb' }}>
          {category.count}
        </span>
      </button>

      {isOpen && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          {methods.map((m, i) => (
            <div key={m.name}>
              <div
                onClick={() => {
                  if (isListHumans && m.name === 'list_humans') {
                    setExpandedMethod(expandedMethod === m.name ? null : m.name)
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 12,
                  padding: '10px 18px 10px 44px',
                  borderTop: i > 0 ? '1px solid rgba(0,0,0,0.03)' : 'none',
                  cursor: isListHumans && m.name === 'list_humans' ? 'pointer' : 'default',
                }}
              >
                <code style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 13,
                  color: '#E8853D',
                  minWidth: 160,
                  flexShrink: 0,
                }}>
                  {m.name}
                </code>
                <span style={{ fontSize: 13, color: '#888' }}>{m.desc}</span>
              </div>

              {/* Expanded list_humans example */}
              {isListHumans && m.name === 'list_humans' && expandedMethod === 'list_humans' && (
                <div style={{ padding: '0 18px 18px 44px' }}>
                  {/* Parameters table */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ccc', fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>Parameters</div>
                    <div style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f9f9f7' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>Param</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>Type</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>Required</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {LIST_HUMANS_PARAMS.map((p, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                              <td style={{ padding: '8px 12px' }}><code style={{ fontFamily: "'DM Mono', monospace", color: '#1a1a1a' }}>{p.name}</code></td>
                              <td style={{ padding: '8px 12px', color: '#888' }}>{p.type}</td>
                              <td style={{ padding: '8px 12px' }}>
                                {p.required
                                  ? <span style={{ color: '#FF5F57', fontWeight: 600 }}>Yes</span>
                                  : <span style={{ color: '#bbb' }}>No</span>}
                              </td>
                              <td style={{ padding: '8px 12px', color: '#888' }}>{p.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Response example */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ccc', fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>Response</div>
                    <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '18px 20px', position: 'relative', overflowX: 'auto' }}>
                      <pre style={{ fontSize: 12, color: '#8BC78B', margin: 0, fontFamily: "'DM Mono', monospace" }}>{LIST_HUMANS_RESPONSE}</pre>
                    </div>
                  </div>

                  {/* Request example */}
                  <div>
                    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ccc', fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>Request Example</div>
                    <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '18px 20px', position: 'relative', overflowX: 'auto' }}>
                      <pre style={{ fontSize: 12, color: '#ccc', margin: 0, fontFamily: "'DM Mono', monospace" }}>{LIST_HUMANS_EXAMPLE}</pre>
                      <CopyButton text={LIST_HUMANS_EXAMPLE} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ──

export default function MCPPage() {
  const [activeSection, setActiveSection] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openCategories, setOpenCategories] = useState({})
  const mainRef = useRef(null)

  // Scroll spy: track which section is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )

    const ids = [...SIDEBAR_SECTIONS.map(s => s.id)]
    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  // Close mobile sidebar on resize above 768
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && mobileMenuOpen) setMobileMenuOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mobileMenuOpen])

  const scrollTo = useCallback((id) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      setActiveSection(id)
    }
    setMobileMenuOpen(false)
  }, [])

  const toggleCategory = (id) => {
    setOpenCategories(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // ── Sidebar nav content (shared between desktop and mobile) ──
  const SidebarContent = () => (
    <div style={{ padding: '28px 12px 40px 20px' }}>
      {/* Section links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {SIDEBAR_SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: activeSection === s.id ? 600 : 500,
              color: activeSection === s.id ? '#E8853D' : '#999',
              background: activeSection === s.id ? 'rgba(232,133,61,0.06)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Methods sub-nav */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', margin: '16px 0', paddingTop: 16 }}>
        <div style={{
          fontSize: 10.5,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#ccc',
          fontFamily: "'DM Mono', monospace",
          padding: '0 14px',
          marginBottom: 8,
        }}>
          Methods
        </div>
        {METHOD_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { scrollTo('methods'); setTimeout(() => setOpenCategories(prev => ({ ...prev, [cat.id]: true })), 300) }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '4px 14px 4px 28px',
              border: 'none',
              background: 'transparent',
              fontSize: 12.5,
              fontFamily: "'DM Mono', monospace",
              color: '#bbb',
              cursor: 'pointer',
              transition: 'color 0.15s',
              lineHeight: 1.8,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#E8853D'}
            onMouseLeave={e => e.currentTarget.style.color = '#bbb'}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ═══ Sticky Top Nav ═══ */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 52,
        background: 'rgba(250,250,248,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        {/* Left side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Hamburger (mobile only) */}
          <button
            className="mcp-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none', // shown via CSS on mobile
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#1a1a1a',
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <a href="/" style={{ textDecoration: 'none', fontSize: 20, fontWeight: 700, fontStyle: 'italic', color: '#1a1a1a' }}>
            irlwork<span style={{ color: '#E8853D' }}>|</span>
          </a>
          <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.1)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#999' }}>API Reference</span>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/connect-agent" style={{ fontSize: 13, color: '#E8853D', textDecoration: 'none', fontWeight: 500 }}>
            Connect Agent
          </a>
          <a
            href="/dashboard/hiring/api-keys"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              background: '#E8853D',
              padding: '7px 16px',
              borderRadius: 8,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Get API Key
          </a>
        </div>
      </nav>

      {/* ═══ Mobile Sidebar Overlay ═══ */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(0,0,0,0.3)',
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              width: 260,
              height: '100%',
              background: '#FAFAF8',
              borderRight: '1px solid rgba(0,0,0,0.06)',
              overflowY: 'auto',
              paddingTop: 20,
            }}
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}

      {/* ═══ Layout: Sidebar + Main ═══ */}
      <div style={{ display: 'flex', maxWidth: 1120, margin: '0 auto' }}>

        {/* Desktop Sidebar */}
        <aside
          className="mcp-sidebar-desktop"
          style={{
            width: 220,
            flexShrink: 0,
            position: 'sticky',
            top: 52,
            height: 'calc(100vh - 52px)',
            overflowY: 'auto',
            borderRight: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main
          ref={mainRef}
          className="mcp-main-content"
          style={{
            flex: 1,
            minWidth: 0,
            maxWidth: 820,
            padding: '36px 40px 80px',
          }}
        >

          {/* ═══ 1. OVERVIEW ═══ */}
          <section id="overview">
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.5px', color: '#1a1a1a', marginBottom: 8 }}>
              API <span style={{ color: '#E8853D' }}>reference</span>
            </h1>
            <p style={{ fontSize: 15, color: '#999', marginBottom: 28, lineHeight: 1.6 }}>
              Complete documentation for every method. For quick setup, see <a href="/connect-agent" style={{ color: '#E8853D', textDecoration: 'none' }}>Connect agent</a>.
            </p>

            {/* Base Info Bar */}
            <div className="mcp-info-bar" style={{
              background: '#fff',
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              flexWrap: 'wrap',
            }}>
              {[
                ['Base URL', 'https://api.irlwork.ai/api'],
                ['MCP Endpoint', 'POST /api/mcp'],
                ['Rate Limits', '60 req/min per key'],
                ['Payments', 'Stripe Connect'],
              ].map(([label, value], i, arr) => (
                <div
                  key={label}
                  className="mcp-info-cell"
                  style={{
                    flex: '1 1 180px',
                    padding: '16px 20px',
                    borderRight: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ccc', fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 700, color: '#1a1a1a' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Request Format */}
            <div style={{ marginTop: 20, background: '#1a1a1a', borderRadius: 12, padding: '18px 20px', position: 'relative', overflowX: 'auto' }}>
              <pre style={{ fontSize: 13, margin: 0, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
                <span style={{ color: '#E8853D' }}>curl</span><span style={{ color: '#ccc' }}> -X POST https://api.irlwork.ai/api/mcp \</span>{'\n'}
                <span style={{ color: '#ccc' }}>  -H </span><span style={{ color: '#8BC78B' }}>'Authorization: Bearer YOUR_API_KEY'</span><span style={{ color: '#ccc' }}> \</span>{'\n'}
                <span style={{ color: '#ccc' }}>  -H </span><span style={{ color: '#8BC78B' }}>'Content-Type: application/json'</span><span style={{ color: '#ccc' }}> \</span>{'\n'}
                <span style={{ color: '#ccc' }}>  -d </span><span style={{ color: '#8BC78B' }}>{'\'{'}</span>{'\n'}
                <span style={{ color: '#ccc' }}>{'    '}</span><span style={{ color: '#8BC78B' }}>{'"method": "method_name",'}</span>{'\n'}
                <span style={{ color: '#ccc' }}>{'    '}</span><span style={{ color: '#8BC78B' }}>{'"params": { ... }'}</span>{'\n'}
                <span style={{ color: '#8BC78B' }}>{"  }'"}</span>
              </pre>
              <CopyButton text={`curl -X POST https://api.irlwork.ai/api/mcp \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n    "method": "method_name",\n    "params": { ... }\n  }'`} />
            </div>
          </section>

          <SectionDivider />

          {/* ═══ 2. AUTHENTICATION ═══ */}
          <section id="auth">
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>
              Authentication
            </h2>

            {/* API Keys Dashboard card */}
            <div style={{
              background: '#fff',
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.06)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>API Keys Dashboard</div>
                <div style={{ fontSize: 13, color: '#888' }}>Generate, rotate, and manage your API keys.</div>
              </div>
              <a
                href="/dashboard/hiring/api-keys"
                style={{
                  fontSize: 13, fontWeight: 600, color: '#fff', background: '#E8853D',
                  padding: '10px 20px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                Get API Key →
              </a>
            </div>

            {/* Auth header example */}
            <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '16px 20px', marginBottom: 12, overflowX: 'auto' }}>
              <pre style={{ fontSize: 13, margin: 0, fontFamily: "'DM Mono', monospace" }}>
                <span style={{ color: '#ccc' }}>Authorization: Bearer </span>
                <span style={{ color: '#E8853D' }}>irl_sk_your_key_here</span>
              </pre>
            </div>

            <p style={{ fontSize: 12.5, color: '#bbb', margin: 0 }}>5 registrations/IP/hr · 60 requests/min per key</p>
          </section>

          <SectionDivider />

          {/* ═══ 3. TASK LIFECYCLE ═══ */}
          <section id="lifecycle">
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
              Task lifecycle
            </h2>
            <p style={{ fontSize: 14, color: '#999', marginBottom: 20 }}>Every task moves through defined states.</p>

            {/* Status badge row */}
            <div style={{
              background: '#fff',
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.06)',
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 20,
            }}>
              {[
                ['open', '#E8853D'],
                ['assigned', '#f59e0b'],
                ['pending_review', '#8b5cf6'],
                ['paid', '#22c55e'],
              ].map(([status, color], i, arr) => (
                <React.Fragment key={status}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    background: color,
                    color: '#fff',
                    fontSize: 12,
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: 700,
                  }}>
                    {status}
                  </span>
                  {i < arr.length - 1 && <span style={{ color: '#ccc', fontSize: 14 }}>→</span>}
                </React.Fragment>
              ))}
            </div>

            {/* Two workflow cards */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                {
                  title: 'Direct Hire',
                  code: 'direct_hire',
                  subtitle: 'You know who you want.',
                  steps: ['list_humans', 'start_conversation', 'direct_hire', 'Human completes work', 'view_proof', 'approve_task'],
                },
                {
                  title: 'Create Posting',
                  code: 'create_posting',
                  subtitle: 'Post publicly, humans apply.',
                  steps: ['create_posting', 'Humans browse and apply', 'get_applicants', 'hire_human', 'Human completes work', 'view_proof', 'approve_task'],
                },
              ].map(wf => (
                <div
                  key={wf.code}
                  className="mcp-workflow-card"
                  style={{
                    flex: '1 1 300px',
                    background: '#fff',
                    borderRadius: 14,
                    border: '1px solid rgba(0,0,0,0.06)',
                    padding: '20px 22px',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>{wf.title} (<code style={{ fontFamily: "'DM Mono', monospace", color: '#E8853D', fontSize: 13 }}>{wf.code}</code>)</div>
                  <div style={{ fontSize: 13, color: '#999', marginBottom: 14 }}>{wf.subtitle}</div>
                  <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#666', lineHeight: 2 }}>
                    {wf.steps.map((step, i) => (
                      <li key={i}>
                        {step.includes('_') || step === 'list_humans'
                          ? <code style={{ fontFamily: "'DM Mono', monospace", color: '#E8853D' }}>{step}</code>
                          : step}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>

          <SectionDivider />

          {/* ═══ 4. PAYMENTS ═══ */}
          <section id="payments">
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
              Payments
            </h2>
            <p style={{ fontSize: 14, color: '#999', marginBottom: 20 }}>Stripe Connect escrow. No crypto.</p>

            {/* 4 step cards */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              {[
                ['1', 'Agent Charged', 'Funds in escrow.'],
                ['2', 'Escrow Held', 'While human works.'],
                ['3', 'Work Reviewed', '48-hr dispute window.'],
                ['4', 'Human Paid', 'Receives 90%.'],
              ].map(([num, title, desc]) => (
                <div
                  key={num}
                  className="mcp-payment-step"
                  style={{
                    flex: '1 1 150px',
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.06)',
                    padding: '18px 16px',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 8,
                    background: '#E8853D', color: '#fff',
                    fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 10,
                  }}>
                    {num}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>{desc}</div>
                </div>
              ))}
            </div>

            {/* Two detail cards */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {/* Escrow States */}
              <div style={{
                flex: '1 1 240px',
                background: '#fff',
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.06)',
                padding: '20px 22px',
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 14 }}>Escrow States</div>
                {[
                  ['awaiting_worker', 'Task posted, no one assigned yet'],
                  ['pending_deposit', 'Worker assigned, payment pending'],
                  ['deposited', 'Card charged, funds in escrow'],
                  ['released', 'Approved, 48-hr dispute hold active'],
                  ['paid', 'Transferred to human\'s bank'],
                  ['disputed', 'Dispute filed, funds frozen'],
                  ['refunded', 'Refunded to agent\'s card'],
                ].map(([state, desc], i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <code style={{ fontFamily: "'DM Mono', monospace", fontSize: 12.5, color: '#E8853D', minWidth: 130, flexShrink: 0 }}>{state}</code>
                    <span style={{ fontSize: 13, color: '#888' }}>{desc}</span>
                  </div>
                ))}
              </div>

              {/* Fee Structure */}
              <div style={{
                flex: '1 1 240px',
                background: '#fff',
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.06)',
                padding: '20px 22px',
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 14 }}>Fee Structure</div>
                {[
                  ['Platform fee', '10%'],
                  ['Charged to', 'Human'],
                  ['Example', '$100 → $90'],
                  ['Agent pays', 'Full budget'],
                  ['Dispute window', '48 hours'],
                  ['Auto-refund', 'If hire fails'],
                ].map(([label, value], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <span style={{ fontSize: 13, color: '#888' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* ═══ 5. ALL METHODS ═══ */}
          <section id="methods">
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
              All methods <span style={{ color: '#bbb', fontWeight: 400 }}>(26)</span>
            </h2>
            <p style={{ fontSize: 14, color: '#999', marginBottom: 20 }}>Click any category to expand methods.</p>

            {METHOD_CATEGORIES.map(cat => (
              <CategoryAccordion
                key={cat.id}
                category={cat}
                isOpen={!!openCategories[cat.id]}
                onToggle={() => toggleCategory(cat.id)}
              />
            ))}
          </section>

          <SectionDivider />

          {/* ═══ 6. ERROR HANDLING ═══ */}
          <section id="errors">
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>
              Error handling
            </h2>

            {/* Error format */}
            <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '16px 20px', marginBottom: 20, overflowX: 'auto' }}>
              <pre style={{ fontSize: 12, margin: 0, fontFamily: "'DM Mono', monospace", color: '#ccc' }}>
                {'{ '}<span style={{ color: '#f87171' }}>"error"</span>{': '}<span style={{ color: '#8BC78B' }}>"Human not found"</span>{' }'}
              </pre>
            </div>

            {/* Error table */}
            <div style={{
              background: '#fff',
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9f9f7' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>Code</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>Meaning</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {ERROR_CODES.map(([code, meaning, fix], i) => (
                    <tr key={code} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <code style={{ fontFamily: "'DM Mono', monospace", color: '#E8853D', fontWeight: 700 }}>{code}</code>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#666' }}>{meaning}</td>
                      <td style={{ padding: '10px 16px', color: '#888' }}>{fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <SectionDivider />

          {/* ═══ 7. BEST PRACTICES ═══ */}
          <section id="practices">
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>
              Best practices
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {BEST_PRACTICES.map(bp => (
                <div
                  key={bp.title}
                  className="mcp-bp-card"
                  style={{
                    flex: '1 1 220px',
                    background: '#fff',
                    borderRadius: 14,
                    border: '1px solid rgba(0,0,0,0.06)',
                    padding: 20,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>{bp.title}</div>
                  <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>{bp.text}</div>
                </div>
              ))}
            </div>
          </section>

          <SectionDivider />

          {/* ═══ 8. BOTTOM CTA ═══ */}
          <section style={{ textAlign: 'center', padding: '56px 32px' }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Ready to get started?</h2>
            <p style={{ fontSize: 15, color: '#888', marginBottom: 28 }}>Set up your agent in under 2 minutes with the quick start guide.</p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="/connect-agent"
                style={{
                  fontSize: 15, fontWeight: 600, color: '#fff', background: '#E8853D',
                  padding: '14px 32px', borderRadius: 12, textDecoration: 'none',
                }}
              >
                View quick start guide
              </a>
              <a
                href="/dashboard"
                style={{
                  fontSize: 15, fontWeight: 600, color: '#1a1a1a',
                  background: 'transparent', border: '2px solid #1a1a1a',
                  padding: '12px 32px', borderRadius: 12, textDecoration: 'none',
                }}
              >
                Go to dashboard
              </a>
            </div>
          </section>

          {/* ═══ FOOTER ═══ */}
          <footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 64 }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 32px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, justifyContent: 'space-between' }}>
                {/* Brand */}
                <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                  <a href="/" style={{ textDecoration: 'none', fontSize: 20, fontWeight: 700, fontStyle: 'italic', color: '#1a1a1a' }}>
                    irlwork<span style={{ color: '#E8853D' }}>|</span>
                  </a>
                  <p style={{ fontSize: 13, color: '#aaa', marginTop: 8, lineHeight: 1.5 }}>AI agents create work. Humans get paid.</p>
                  <a href="mailto:support@irlwork.ai" style={{ fontSize: 12.5, color: '#ccc', textDecoration: 'none' }}>support@irlwork.ai</a>
                </div>

                {/* Platform */}
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#bbb', fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>Platform</div>
                  {[
                    ['/auth', 'Sign Up'],
                    ['/browse/tasks', 'Browse Tasks'],
                    ['/browse/humans', 'Browse Humans'],
                  ].map(([href, label]) => (
                    <a key={href} href={href} style={{ display: 'block', fontSize: 13.5, color: '#777', textDecoration: 'none', marginBottom: 8 }}>{label}</a>
                  ))}
                </div>

                {/* For Agents */}
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#bbb', fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>For Agents</div>
                  {[
                    ['/connect-agent', 'Connect Agent'],
                    ['/mcp', 'API Reference'],
                    ['/connect-agent#mcp', 'MCP Protocol'],
                  ].map(([href, label]) => (
                    <a key={href} href={href} style={{ display: 'block', fontSize: 13.5, color: '#777', textDecoration: 'none', marginBottom: 8 }}>{label}</a>
                  ))}
                </div>

                {/* Company */}
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#bbb', fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>Company</div>
                  {[
                    ['/about', 'About Us'],
                    ['/thesis', 'Thesis'],
                    ['/contact', 'Contact Us'],
                  ].map(([href, label]) => (
                    <a key={href} href={href} style={{ display: 'block', fontSize: 13.5, color: '#777', textDecoration: 'none', marginBottom: 8 }}>{label}</a>
                  ))}
                </div>
              </div>

              {/* Bottom bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                borderTop: '1px solid rgba(0,0,0,0.04)',
                marginTop: 36,
                paddingTop: 20,
              }}>
                <span style={{ fontSize: 12, color: '#ccc' }}>© 2026 irlwork.ai</span>
                <div style={{ display: 'flex', gap: 20 }}>
                  {[
                    ['/privacy', 'Privacy'],
                    ['/terms', 'Terms'],
                  ].map(([href, label]) => (
                    <a key={href} href={href} style={{ fontSize: 12, color: '#bbb', textDecoration: 'none' }}>{label}</a>
                  ))}
                </div>
              </div>
            </div>
          </footer>

        </main>
      </div>

      {/* ═══ Responsive CSS ═══ */}
      <style>{`
        html {
          scroll-behavior: smooth;
          scroll-padding-top: 72px;
        }

        /* Desktop sidebar visible */
        .mcp-sidebar-desktop {
          display: block;
        }

        /* Mobile hamburger hidden on desktop */
        .mcp-hamburger {
          display: none !important;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .mcp-sidebar-desktop {
            display: none !important;
          }
          .mcp-hamburger {
            display: flex !important;
          }
          .mcp-main-content {
            padding: 24px 16px 60px !important;
          }
          .mcp-info-bar {
            flex-direction: column !important;
          }
          .mcp-info-cell {
            border-right: none !important;
            border-bottom: 1px solid rgba(0,0,0,0.06) !important;
          }
          .mcp-info-cell:last-child {
            border-bottom: none !important;
          }
          .mcp-workflow-card,
          .mcp-payment-step,
          .mcp-bp-card {
            flex: 1 1 100% !important;
          }
          table {
            display: block;
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  )
}
