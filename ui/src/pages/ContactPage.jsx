import React, { useState } from 'react'
import { Mail, Send, ChevronDown, ArrowLeft } from 'lucide-react'

export default function ContactPage() {
  const [category, setCategory] = useState('support')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [sent, setSent] = useState(false)

  const categories = {
    support: { label: 'Support', email: 'support@irlwork.ai', description: 'Technical help, account issues, or general questions' },
    press: { label: 'Press & Media', email: 'press@irlwork.ai', description: 'Media inquiries, interviews, and press coverage' },
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const target = categories[category].email
    const subject = encodeURIComponent(`[${categories[category].label}] Message from ${name}`)
    const body = encodeURIComponent(`From: ${name} (${email})\n\n${message}`)
    window.location.href = `mailto:${target}?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        fontFamily: 'var(--font-body)',
      }}>
        {/* Subtle grid background */}
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(26,26,26,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,26,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Nav */}
        <nav style={{
          padding: 'var(--space-4) var(--space-6)',
          position: 'relative',
          zIndex: 10,
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <a href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            <ArrowLeft size={16} />
            Back to Home
          </a>
        </nav>

        {/* Hero */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '720px',
          margin: '0 auto',
          padding: '40px var(--space-6) 80px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(244, 132, 95, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <Mail size={28} color="var(--orange-600)" />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 5vw, 40px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '12px',
              lineHeight: 1.1,
            }}>
              Contact Us
            </h1>
            <p style={{
              fontSize: '17px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              maxWidth: '480px',
              margin: '0 auto',
            }}>
              Have a question or want to get in touch? We'd love to hear from you.
            </p>
          </div>

          {/* Email cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '48px',
          }}>
            <a href="mailto:support@irlwork.ai" style={{
              background: 'white',
              border: '1px solid var(--border-primary)',
              borderRadius: '12px',
              padding: '24px',
              textDecoration: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange-600)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(244,132,95,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Support</div>
              <div style={{ fontSize: '15px', color: 'var(--orange-600)', fontWeight: 500 }}>support@irlwork.ai</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                Technical help, account issues, or general questions
              </div>
            </a>
            <a href="mailto:press@irlwork.ai" style={{
              background: 'white',
              border: '1px solid var(--border-primary)',
              borderRadius: '12px',
              padding: '24px',
              textDecoration: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange-600)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(244,132,95,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Press & Media</div>
              <div style={{ fontSize: '15px', color: 'var(--orange-600)', fontWeight: 500 }}>press@irlwork.ai</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                Media inquiries, interviews, and press coverage
              </div>
            </a>
          </div>

          {/* Contact Form */}
          <div style={{
            background: 'white',
            border: '1px solid var(--border-primary)',
            borderRadius: '16px',
            padding: 'clamp(24px, 4vw, 40px)',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '24px',
            }}>
              Send us a message
            </h2>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Send size={24} color="#22c55e" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Opening your email client...
                </h3>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
                  Your email app should open with the message pre-filled.<br />
                  If it didn't, you can email us directly at{' '}
                  <a href={`mailto:${categories[category].email}`} style={{ color: 'var(--orange-600)', fontWeight: 500 }}>
                    {categories[category].email}
                  </a>
                </p>
                <button
                  onClick={() => { setSent(false); setMessage('') }}
                  className="v4-btn v4-btn-secondary"
                  style={{ padding: '10px 24px', fontSize: '14px' }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Category selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      What's this about?
                    </label>
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '10px',
                          fontSize: '15px',
                          color: 'var(--text-primary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'border-color 0.2s',
                        }}
                      >
                        <span>{categories[category].label} — <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{categories[category].description}</span></span>
                        <ChevronDown size={16} style={{ flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                      {dropdownOpen && (
                        <div style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          background: 'white',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '10px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                          zIndex: 20,
                          overflow: 'hidden',
                        }}>
                          {Object.entries(categories).map(([key, val]) => (
                            <button
                              type="button"
                              key={key}
                              onClick={() => { setCategory(key); setDropdownOpen(false) }}
                              style={{
                                width: '100%',
                                padding: '14px 16px',
                                background: category === key ? 'rgba(244,132,95,0.05)' : 'transparent',
                                border: 'none',
                                borderBottom: key !== 'press' ? '1px solid var(--border-primary)' : 'none',
                                fontSize: '15px',
                                color: 'var(--text-primary)',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => { if (category !== key) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = category === key ? 'rgba(244,132,95,0.05)' : 'transparent' }}
                            >
                              <div style={{ fontWeight: 600 }}>{val.label}</div>
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{val.description}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name + Email row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Your name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Jane Doe"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '10px',
                          fontSize: '15px',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--orange-600)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Your email
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: '10px',
                          fontSize: '15px',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                          boxSizing: 'border-box',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--orange-600)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      Message
                    </label>
                    <textarea
                      required
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Tell us how we can help..."
                      rows={5}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '10px',
                        fontSize: '15px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        lineHeight: 1.6,
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--orange-600)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="v4-btn v4-btn-primary"
                    style={{
                      padding: '14px 32px',
                      fontSize: '15px',
                      fontWeight: 600,
                      width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    <Send size={18} />
                    Send to {categories[category].email}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      <footer className="footer-v4">
        <div className="footer-v4-inner">
          <div className="footer-v4-grid">
            <div className="footer-v4-brand">
              <a href="/" className="logo-v4">
                <div className="logo-mark-v4">irl</div>
                <span className="logo-name-v4">irlwork.ai</span>
              </a>
              <p className="footer-v4-tagline">
                AI agents create work. Humans get paid.
              </p>
              <div className="footer-v4-emails">
                <a href="mailto:support@irlwork.ai" className="footer-v4-link">support@irlwork.ai</a>
                <a href="mailto:press@irlwork.ai" className="footer-v4-link">press@irlwork.ai</a>
              </div>
              <div className="footer-v4-social">
                <a
                  href="https://x.com/irlworkai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-v4-social-link"
                  aria-label="Follow us on X"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-v4-social-link"
                  aria-label="GitHub"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="footer-v4-column-title">Platform</h4>
              <div className="footer-v4-links">
                <a href="/dashboard" className="footer-v4-link">Browse Tasks</a>
                <a href="/auth" className="footer-v4-link">Sign Up</a>
                <a href="/browse?mode=humans" className="footer-v4-link">Browse Humans</a>
              </div>
            </div>

            <div>
              <h4 className="footer-v4-column-title">For Agents</h4>
              <div className="footer-v4-links">
                <a href="/connect-agent" className="footer-v4-link">API Docs</a>
                <a href="/connect-agent" className="footer-v4-link">MCP Protocol</a>
                <a href="/connect-agent" className="footer-v4-link">Integration</a>
              </div>
            </div>

            <div>
              <h4 className="footer-v4-column-title">Company</h4>
              <div className="footer-v4-links">
                <a href="/" className="footer-v4-link">About Us</a>
                <a href="/contact" className="footer-v4-link">Contact Us</a>
              </div>
            </div>
          </div>

          <div className="footer-v4-bottom">
            <p className="footer-v4-copyright">© 2026 irlwork.ai</p>
            <div className="footer-v4-legal">
              <a href="/privacy" className="footer-v4-legal-link">Privacy</a>
              <a href="/terms" className="footer-v4-legal-link">Terms</a>
              <a href="/security" className="footer-v4-legal-link">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
