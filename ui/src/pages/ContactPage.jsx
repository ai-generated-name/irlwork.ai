import React, { useState } from 'react'
import { Mail, Send, ChevronDown } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { Button } from '../components/ui'

export default function ContactPage() {
  usePageTitle('Contact')
  const { t } = useLanguage()
  const [category, setCategory] = useState('support')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [sent, setSent] = useState(false)

  const categories = {
    support: { label: t('contact.support'), email: 'support@irlwork.ai', description: t('contact.supportDesc') },
    press: { label: t('contact.pressMedia'), email: 'press@irlwork.ai', description: t('contact.pressDesc') },
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
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Navbar provided by shared MarketingNavbar in App.jsx */}

        {/* Hero */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '720px',
          margin: '0 auto',
          padding: '100px var(--space-6) 80px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(232, 133, 61, 0.1)',
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
              {t('contact.title')}
            </h1>
            <p style={{
              fontSize: '17px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              maxWidth: '480px',
              margin: '0 auto',
            }}>
              {t('contact.subtitle')}
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
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange-600)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(232,133,61,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('contact.support')}</div>
              <div style={{ fontSize: '15px', color: 'var(--orange-600)', fontWeight: 500 }}>support@irlwork.ai</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                {t('contact.supportDesc')}
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
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange-600)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(232,133,61,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{t('contact.pressMedia')}</div>
              <div style={{ fontSize: '15px', color: 'var(--orange-600)', fontWeight: 500 }}>press@irlwork.ai</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                {t('contact.pressDesc')}
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
              {t('contact.sendMessage')}
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
                  {t('contact.openingEmail')}
                </h3>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
                  {t('contact.emailPreFilled')}<br />
                  {t('contact.ifNotOpened')}{' '}
                  <a href={`mailto:${categories[category].email}`} style={{ color: 'var(--orange-600)', fontWeight: 500 }}>
                    {categories[category].email}
                  </a>
                </p>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => { setSent(false); setMessage('') }}
                >
                  {t('contact.sendAnother')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Category selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      {t('contact.whatsThisAbout')}
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
                                background: category === key ? 'rgba(232,133,61,0.05)' : 'transparent',
                                border: 'none',
                                borderBottom: key !== 'press' ? '1px solid var(--border-primary)' : 'none',
                                fontSize: '15px',
                                color: 'var(--text-primary)',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => { if (category !== key) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = category === key ? 'rgba(232,133,61,0.05)' : 'transparent' }}
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
                        {t('contact.yourName')}
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
                        {t('contact.yourEmail')}
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
                      {t('contact.message')}
                    </label>
                    <textarea
                      required
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder={t('contact.messagePlaceholder')}
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
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="gap-2 w-full justify-center"
                  >
                    <Send size={18} />
                    {t('contact.sendTo')} {categories[category].email}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
