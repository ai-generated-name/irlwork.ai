import React, { useState, useRef, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + '/api'
  : 'https://api.irlwork.ai/api'

const COLORS = {
  teal: '#0F4C5C',
  tealLight: '#1A6B7F',
  coral: '#E07A5F',
  coralDark: '#C45F4A',
  cream: '#FAF8F5',
  creamDark: '#F5F2ED',
  white: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#525252',
  textTertiary: '#8A8A8A',
  border: 'rgba(26, 26, 26, 0.08)',
  borderHover: 'rgba(26, 26, 26, 0.16)',
  success: '#059669',
  successBg: '#D1FAE5',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  amber: '#D97706',
  amberBg: '#FEF3C7',
  gray: '#6B7280',
  grayBg: '#F3F4F6',
}

const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

const TYPES = [
  { id: 'feedback', label: 'Feedback' },
  { id: 'bug', label: 'Bug' },
  { id: 'feature_request', label: 'Feature' },
  { id: 'other', label: 'Other' },
]

const URGENCY = [
  { id: 'low', label: 'Low', color: COLORS.gray, bg: COLORS.grayBg },
  { id: 'normal', label: 'Normal', color: COLORS.teal, bg: '#E8F4F7' },
  { id: 'high', label: 'High', color: COLORS.amber, bg: COLORS.amberBg },
  { id: 'critical', label: 'Critical', color: COLORS.coral, bg: COLORS.errorBg },
]

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
  })

export default function FeedbackButton({ user }) {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState('feedback')
  const [urgency, setUrgency] = useState('normal')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState([])
  const [uploadedUrls, setUploadedUrls] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showPulse, setShowPulse] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const fileInputRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Stop pulse after first open
  useEffect(() => {
    if (isOpen) setShowPulse(false)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const resetForm = useCallback(() => {
    setType('feedback')
    setUrgency('normal')
    setSubject('')
    setMessage('')
    setFiles([])
    setUploadedUrls([])
    setSubmitted(false)
  }, [])

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length + files.length > 3) return
    setFiles((prev) => [...prev, ...selected].slice(0, 3))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setUploadedUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!message.trim() || !user) return
    setSubmitting(true)

    try {
      // Upload images first
      const urls = [...uploadedUrls]
      for (let i = urls.length; i < files.length; i++) {
        const base64 = await toBase64(files[i])
        const res = await fetch(`${API_URL}/upload/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: user.id },
          body: JSON.stringify({
            file: base64,
            filename: files[i].name,
            mimeType: files[i].type,
          }),
        })
        const data = await res.json()
        if (data.url) urls.push(data.url)
      }

      // Submit feedback
      await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.id },
        body: JSON.stringify({
          type,
          urgency,
          subject: subject || undefined,
          message,
          image_urls: urls,
          page_url: window.location.href,
        }),
      })

      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        setTimeout(resetForm, 300)
      }, 2000)
    } catch (err) {
      console.error('Feedback submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Inject keyframes once
  useEffect(() => {
    if (document.getElementById('feedback-btn-styles')) return
    const style = document.createElement('style')
    style.id = 'feedback-btn-styles'
    style.textContent = `
      @keyframes feedbackPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(15, 76, 92, 0.4); }
        50% { box-shadow: 0 0 0 12px rgba(15, 76, 92, 0); }
      }
      @keyframes feedbackCheckIn {
        0% { transform: scale(0) rotate(-45deg); opacity: 0; }
        50% { transform: scale(1.15) rotate(0deg); opacity: 1; }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      @keyframes feedbackFadeUp {
        0% { transform: translateY(8px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes feedbackSpin {
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)
  }, [])

  return (
    <>
      {/* Backdrop (mobile) */}
      {isOpen && isMobile && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 9998,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Send feedback"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: COLORS.teal,
            color: COLORS.white,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            boxShadow: '0 8px 24px rgba(15, 76, 92, 0.3), 0 2px 6px rgba(0, 0, 0, 0.08)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            animation: showPulse ? 'feedbackPulse 2s ease-in-out 3' : 'none',
            fontFamily: FONT,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)'
            e.currentTarget.style.boxShadow =
              '0 16px 48px rgba(15, 76, 92, 0.35), 0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow =
              '0 8px 24px rgba(15, 76, 92, 0.3), 0 2px 6px rgba(0, 0, 0, 0.08)'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M8 10h.01M12 10h.01M16 10h.01" opacity="0.7" />
          </svg>
        </button>
      )}

      {/* Slide-out Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          right: 0,
          bottom: 0,
          width: isMobile ? '100vw' : 400,
          maxHeight: '85vh',
          background: COLORS.white,
          zIndex: 9999,
          borderLeft: `1px solid ${COLORS.border}`,
          borderTop: `1px solid ${COLORS.border}`,
          borderTopLeftRadius: 20,
          boxShadow: isOpen
            ? '0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)'
            : 'none',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: FONT,
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px',
            borderBottom: `1px solid ${COLORS.border}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealLight})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: COLORS.textPrimary }}>
              Send Feedback
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: COLORS.textTertiary,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLORS.creamDark
              e.currentTarget.style.color = COLORS.textPrimary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = COLORS.textTertiary
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', flex: 1 }}>
          {submitted ? (
            /* Success State */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: COLORS.successBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  animation: 'feedbackCheckIn 0.5s ease-out forwards',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLORS.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: COLORS.textPrimary,
                  marginBottom: 6,
                  animation: 'feedbackFadeUp 0.4s ease-out 0.2s both',
                }}
              >
                Thank you!
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: COLORS.textSecondary,
                  animation: 'feedbackFadeUp 0.4s ease-out 0.35s both',
                }}
              >
                Your feedback helps us improve.
              </p>
            </div>
          ) : (
            /* Form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Not logged in notice */}
              {!user && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: COLORS.amberBg,
                    border: `1px solid rgba(217, 119, 6, 0.2)`,
                    fontSize: 13,
                    color: COLORS.amber,
                    lineHeight: 1.5,
                  }}
                >
                  <a
                    href="/auth"
                    style={{
                      color: COLORS.teal,
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    Sign in
                  </a>{' '}
                  to submit feedback.
                </div>
              )}

              {/* Type Selector */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Type
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 20,
                        border: `1.5px solid ${type === t.id ? COLORS.teal : COLORS.border}`,
                        background: type === t.id ? COLORS.teal : COLORS.cream,
                        color: type === t.id ? COLORS.white : COLORS.teal,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: FONT,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Urgency Selector */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Urgency
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {URGENCY.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setUrgency(u.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: `1.5px solid ${urgency === u.id ? u.color : COLORS.border}`,
                        background: urgency === u.id ? u.bg : COLORS.white,
                        color: urgency === u.id ? u.color : COLORS.textTertiary,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: FONT,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: u.color,
                          opacity: urgency === u.id ? 1 : 0.4,
                          transition: 'opacity 0.15s',
                        }}
                      />
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary (optional)"
                  className="w-full bg-white border-2 border-[rgba(26,26,26,0.1)] rounded-xl px-4 py-3 text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:border-[#0F4C5C] transition-colors text-sm"
                />
              </div>

              {/* Message */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Message <span style={{ color: COLORS.coral }}>*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the issue or feedback..."
                  rows={4}
                  className="w-full bg-white border-2 border-[rgba(26,26,26,0.1)] rounded-xl px-4 py-3 text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:border-[#0F4C5C] transition-colors text-sm resize-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Screenshots{' '}
                  <span style={{ fontWeight: 400, color: COLORS.textTertiary }}>
                    (max 3)
                  </span>
                </label>
                {files.length < 3 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${COLORS.borderHover}`,
                      borderRadius: 12,
                      padding: '16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: COLORS.cream,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = COLORS.teal
                      e.currentTarget.style.background = COLORS.creamDark
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = COLORS.borderHover
                      e.currentTarget.style.background = COLORS.cream
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.style.borderColor = COLORS.teal
                      e.currentTarget.style.background = COLORS.creamDark
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = COLORS.borderHover
                      e.currentTarget.style.background = COLORS.cream
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.style.borderColor = COLORS.borderHover
                      e.currentTarget.style.background = COLORS.cream
                      const dropped = Array.from(e.dataTransfer.files).filter((f) =>
                        f.type.startsWith('image/')
                      )
                      if (dropped.length + files.length <= 3) {
                        setFiles((prev) => [...prev, ...dropped].slice(0, 3))
                      }
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={COLORS.textTertiary}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ margin: '0 auto 6px' }}
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>
                      Click or drag images
                    </p>
                  </div>
                )}

                {/* File thumbnails */}
                {files.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {files.map((file, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          width: 72,
                          height: 72,
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: `1.5px solid ${COLORS.border}`,
                        }}
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <button
                          onClick={() => removeFile(i)}
                          style={{
                            position: 'absolute',
                            top: 3,
                            right: 3,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.55)',
                            color: COLORS.white,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            lineHeight: 1,
                            fontFamily: FONT,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || !user || submitting}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: 12,
                  border: 'none',
                  background:
                    !message.trim() || !user
                      ? COLORS.creamDark
                      : COLORS.coral,
                  color:
                    !message.trim() || !user
                      ? COLORS.textTertiary
                      : COLORS.white,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor:
                    !message.trim() || !user || submitting
                      ? 'not-allowed'
                      : 'pointer',
                  fontFamily: FONT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'background 0.15s, transform 0.1s',
                  boxShadow:
                    message.trim() && user
                      ? '0 4px 14px rgba(224, 122, 95, 0.3)'
                      : 'none',
                }}
                onMouseEnter={(e) => {
                  if (message.trim() && user && !submitting) {
                    e.currentTarget.style.background = COLORS.coralDark
                  }
                }}
                onMouseLeave={(e) => {
                  if (message.trim() && user && !submitting) {
                    e.currentTarget.style.background = COLORS.coral
                  }
                }}
              >
                {submitting && (
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: COLORS.white,
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'feedbackSpin 0.6s linear infinite',
                    }}
                  />
                )}
                {submitting ? 'Sending...' : 'Submit Feedback'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
