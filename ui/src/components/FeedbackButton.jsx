import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, Bug, Sparkles, Pin, X } from 'lucide-react'
import { Button } from './ui'

const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + '/api'
  : 'https://api.irlwork.ai/api'

const C = {
  teal: '#E8853D',
  tealLight: '#E8853D',
  coral: '#E8853D',
  coralDark: '#D4703A',
  coralBg: 'rgba(232, 133, 61, 0.08)',
  orange: '#E8853D',
  orangeBg: 'rgba(244, 140, 95, 0.1)',
  cream: '#FAFAF8',
  creamDark: '#F5F3F0',
  creamDeep: '#EDE8E1',
  white: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#333333',
  textTertiary: '#888888',
  border: 'rgba(0, 0, 0, 0.08)',
  borderMed: 'rgba(0, 0, 0, 0.12)',
  borderHover: 'rgba(0, 0, 0, 0.18)',
  success: '#16A34A',
  successBg: 'rgba(22, 163, 74, 0.08)',
}

const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

const TYPES = [
  { id: 'feedback', label: 'Feedback', icon: <MessageCircle size={14} /> },
  { id: 'bug', label: 'Bug', icon: <Bug size={14} /> },
  { id: 'feature_request', label: 'Feature', icon: <Sparkles size={14} /> },
  { id: 'other', label: 'Other', icon: <Pin size={14} /> },
]

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
  })

export default function FeedbackButton({ user, variant = 'floating', isOpen: controlledOpen, onToggle }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = variant === 'sidebar' ? (controlledOpen || false) : internalOpen
  const setIsOpen = variant === 'sidebar' ? (onToggle || (() => {})) : setInternalOpen
  const [type, setType] = useState('feedback')
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

  useEffect(() => {
    if (isOpen) setShowPulse(false)
  }, [isOpen])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const resetForm = useCallback(() => {
    setType('feedback')
    setSubject('')
    setMessage('')
    setFiles([])
    setUploadedUrls([])
    setSubmitted(false)
  }, [])

  const handleFileSelect = async (e) => {
    const rawFiles = Array.from(e.target.files || [])
    // Clone file data BEFORE resetting input — iOS Safari invalidates
    // File blobs when input.value is cleared
    const selected = await Promise.all(
      rawFiles.map(async (f) => {
        const buf = await f.arrayBuffer()
        return new File([buf], f.name, { type: f.type, lastModified: f.lastModified })
      })
    )
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (selected.length + files.length > 3) return
    const oversized = selected.find(f => f.size > 20 * 1024 * 1024)
    if (oversized) return
    const processed = []
    for (const file of selected) {
      const ext = file.name?.split('.').pop()?.toLowerCase()
      const isGif = file.type === 'image/gif' || ext === 'gif'
      const isImage = file.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext)
      if (!isGif && isImage) {
        try {
          const imageCompression = (await import('browser-image-compression')).default
          processed.push(await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 2000, useWebWorker: typeof Worker !== 'undefined' }))
        } catch {
          processed.push(file)
        }
      } else {
        processed.push(file)
      }
    }
    setFiles((prev) => [...prev, ...processed].slice(0, 3))
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setUploadedUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!message.trim() || !user) return
    setSubmitting(true)

    try {
      const urls = [...uploadedUrls]
      for (let i = urls.length; i < files.length; i++) {
        const base64 = await toBase64(files[i])
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 45000)
        try {
          const res = await fetch(`${API_URL}/upload/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
            body: JSON.stringify({
              file: base64,
              filename: files[i].name,
              mimeType: files[i].type || 'image/jpeg',
            }),
            signal: controller.signal,
          })
          clearTimeout(timeout)
          const data = await res.json()
          if (data.url) urls.push(data.url)
        } catch (uploadErr) {
          clearTimeout(timeout)
          console.error('Feedback file upload error:', uploadErr)
        }
      }

      await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
        body: JSON.stringify({
          type,
          subject: subject || undefined,
          message,
          image_urls: urls,
          page_url: window.location.origin + window.location.pathname,
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

  useEffect(() => {
    if (document.getElementById('feedback-btn-styles')) return
    const style = document.createElement('style')
    style.id = 'feedback-btn-styles'
    style.textContent = `
      @keyframes feedbackPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(232, 133, 61, 0.4); }
        50% { box-shadow: 0 0 0 12px rgba(232, 133, 61, 0); }
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

  const canSubmit = message.trim() && user && !submitting

  if (!user) return null

  return (
    <>
      {/* Backdrop (mobile) */}
      {isOpen && isMobile && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.25)',
            zIndex: 9998,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Floating Button (only in floating mode) */}
      {variant === 'floating' && !isOpen && (
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
            background: C.coral,
            color: C.white,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            boxShadow: '0 6px 20px rgba(232, 133, 61, 0.35), 0 2px 6px rgba(0, 0, 0, 0.06)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            animation: showPulse ? 'feedbackPulse 2s ease-in-out 3' : 'none',
            fontFamily: FONT,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)'
            e.currentTarget.style.boxShadow =
              '0 12px 32px rgba(232, 133, 61, 0.4), 0 4px 10px rgba(0, 0, 0, 0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow =
              '0 6px 20px rgba(232, 133, 61, 0.35), 0 2px 6px rgba(0, 0, 0, 0.06)'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M8 10h.01M12 10h.01M16 10h.01" opacity="0.6" />
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
          background: C.cream,
          zIndex: 9999,
          borderLeft: `1px solid ${C.borderMed}`,
          borderTop: `1px solid ${C.borderMed}`,
          borderTopLeftRadius: 20,
          boxShadow: isOpen
            ? '-8px -4px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.04)'
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
            padding: '16px 20px',
            borderBottom: `1px solid ${C.borderMed}`,
            background: C.white,
            flexShrink: 0,
            borderTopLeftRadius: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: C.orangeBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
              }}
            >
              <MessageCircle size={15} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary, letterSpacing: '-0.01em' }}>
              Send feedback
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.textTertiary,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.creamDark
              e.currentTarget.style.color = C.textPrimary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = C.textTertiary
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', flex: 1 }}>
          {submitted ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '44px 20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: C.successBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                  animation: 'feedbackCheckIn 0.5s ease-out forwards',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  color: C.textPrimary,
                  marginBottom: 4,
                  animation: 'feedbackFadeUp 0.4s ease-out 0.2s both',
                }}
              >
                Thank you
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: C.textSecondary,
                  animation: 'feedbackFadeUp 0.4s ease-out 0.35s both',
                }}
              >
                Your feedback has been submitted.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Type Selector */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Type
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      style={{
                        padding: '6px 13px',
                        borderRadius: 8,
                        border: `1.5px solid ${type === t.id ? C.coral : C.border}`,
                        background: type === t.id ? C.coralBg : C.white,
                        color: type === t.id ? C.coralDark : C.textSecondary,
                        fontSize: 13,
                        fontWeight: type === t.id ? 600 : 500,
                        cursor: 'pointer',
                        fontFamily: FONT,
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary (optional)"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `1.5px solid ${C.borderMed}`,
                    background: C.white,
                    color: C.textPrimary,
                    fontSize: 13,
                    fontFamily: FONT,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = C.coral}
                  onBlur={(e) => e.currentTarget.style.borderColor = C.borderMed}
                />
              </div>

              {/* Message */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Message <span style={{ color: C.coral, textTransform: 'none' }}>*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the issue or feedback..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `1.5px solid ${C.borderMed}`,
                    background: C.white,
                    color: C.textPrimary,
                    fontSize: 13,
                    fontFamily: FONT,
                    outline: 'none',
                    resize: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = C.coral}
                  onBlur={(e) => e.currentTarget.style.borderColor = C.borderMed}
                />
              </div>

              {/* Image Upload */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Screenshots{' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(max 3)</span>
                </label>
                {files.length < 3 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${C.borderHover}`,
                      borderRadius: 10,
                      padding: '14px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: C.white,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = C.coral
                      e.currentTarget.style.background = C.creamDark
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.borderHover
                      e.currentTarget.style.background = C.white
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.style.borderColor = C.coral
                      e.currentTarget.style.background = C.creamDark
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = C.borderHover
                      e.currentTarget.style.background = C.white
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.style.borderColor = C.borderHover
                      e.currentTarget.style.background = C.white
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
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={C.textTertiary}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ margin: '0 auto 4px' }}
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <p style={{ fontSize: 12, color: C.textSecondary, margin: 0 }}>
                      Click or drag images
                    </p>
                  </div>
                )}

                {files.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {files.map((file, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          width: 68,
                          height: 68,
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: `1.5px solid ${C.borderMed}`,
                        }}
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          onClick={() => removeFile(i)}
                          style={{
                            position: 'absolute',
                            top: 3,
                            right: 3,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.55)',
                            color: C.white,
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
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button
                variant="primary"
                size="lg"
                className="w-full gap-2"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {submitting && (
                  <span
                    style={{
                      width: 15,
                      height: 15,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: C.white,
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'feedbackSpin 0.6s linear infinite',
                    }}
                  />
                )}
                {submitting ? 'Sending...' : 'Send feedback'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
