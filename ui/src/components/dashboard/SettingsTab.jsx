// Extracted from Dashboard.jsx — settings with general, notifications, and account sections
import React from 'react'
import { Button } from '../ui'
import { supabase } from '../../lib/supabase'
import { safeArr } from '../../utils/appConstants'
import { trackEvent, setUserProperties } from '../../utils/analytics'
import API_URL from '../../config/api'
import { useToast } from '../../context/ToastContext'

export default function SettingsTab({
  user,
  settingsPageTab, setSettingsPageTab,
  hiringMode,
  setHiringMode,
  updateTabUrl,
  emailVerifCode, setEmailVerifCode,
  emailVerifSent, setEmailVerifSent,
  emailVerifSending, setEmailVerifSending,
  emailVerifError, setEmailVerifError,
  emailVerifSuccess, setEmailVerifSuccess,
  emailVerifying, setEmailVerifying,
  onUserUpdate,
  onLogout,
}) {
  const toast = useToast()

  return (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h1 className="dashboard-v4-page-title">Settings</h1>

            {/* Settings Page Tabs */}
            <div className="settings-page-tabs">
              {['General', 'Notifications', 'Account'].map(tab => (
                <button
                  key={tab}
                  className={`settings-page-tab${settingsPageTab === tab.toLowerCase() ? ' settings-page-tab-active' : ''}`}
                  onClick={() => setSettingsPageTab(tab.toLowerCase())}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* ===== GENERAL TAB ===== */}
            {settingsPageTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Compact Plan Row */}
                <div className="settings-plan-row" style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ padding: '3px 10px', background: 'rgba(244,132,95,0.1)', borderRadius: 999, fontSize: 12, fontWeight: 600, color: 'var(--orange-600)', flexShrink: 0 }}>
                      {(user?.subscription_tier || 'free').charAt(0).toUpperCase() + (user?.subscription_tier || 'free').slice(1)} Plan
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)', minWidth: 0 }}>
                      {user?.subscription_tier === 'business' ? '5% fee'
                        : user?.subscription_tier === 'pro' ? '10% fee'
                        : '15% fee'}
                      {' \u00b7 '}
                      <span style={{ color: 'var(--orange-600)' }}>Save on fees with verification</span>
                    </span>
                  </div>
                  <a href="/premium" style={{ fontSize: 13, fontWeight: 500, color: 'var(--orange-500)', textDecoration: 'none', whiteSpace: 'nowrap' }}>View Plans &rarr;</a>
                </div>

                {/* Available for Hire */}
                <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: user?.availability === 'available' ? 'var(--success)' : '#9CA3AF',
                        marginTop: 5,
                        flexShrink: 0
                      }} />
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 2 }}>Available for Hire</p>
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {user?.availability === 'available'
                            ? 'Visible to agents for task invites'
                            : 'Hidden from search results'}
                        </p>
                      </div>
                    </div>
                    <button
                      className="settings-availability-toggle"
                      onClick={async () => {
                        const newStatus = user?.availability === 'available' ? 'unavailable' : 'available'

                        try {
                          let token = user.token || ''
                          if (supabase) {
                            const { data: { session } } = await supabase.auth.getSession()
                            if (session?.access_token) token = session.access_token
                          }
                          if (!token) {
                            console.error('[Availability] No auth token available')
                            toast.error('Please sign in again to update availability')
                            return
                          }
                          const res = await fetch(`${API_URL}/humans/profile`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: token },
                            body: JSON.stringify({ availability: newStatus })
                          })
                          if (res.ok) {
                            const data = await res.json()

                            if (data.user) {
                              const updatedUser = { ...data.user, token, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
                              onUserUpdate(updatedUser)
                              localStorage.setItem('user', JSON.stringify({ ...updatedUser, token: undefined }))
                            }
                            toast.success(newStatus === 'available' ? 'You\'re now available for work' : 'You\'re now unavailable')
                          } else {
                            const err = await res.json().catch(() => ({}))
                            console.error('[Availability] API error:', res.status, err)
                            toast.error(err.error || 'Failed to update availability')
                          }
                        } catch (e) { console.error('[Availability] Error:', e); toast.error('Failed to update availability') }
                      }}
                      style={{
                        width: 48,
                        height: 28,
                        borderRadius: 14,
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background 0.2s',
                        background: user?.availability === 'available' ? 'var(--success)' : '#D1D5DB',
                        flexShrink: 0
                      }}
                    >
                      <div className="settings-availability-toggle-knob" style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: 3,
                        left: user?.availability === 'available' ? 23 : 3,
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                      }} />
                    </button>
                  </div>
                </div>

                {/* Dashboard Mode — Segmented Control */}
                <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 2 }}>Dashboard Mode</p>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Switch between working and hiring</p>
                    </div>
                    <div style={{
                      display: 'flex',
                      background: 'rgba(26,26,26,0.06)',
                      borderRadius: 999,
                      padding: 3,
                      gap: 2
                    }}>
                      <button
                        onClick={() => {
                          if (hiringMode) {
                            setHiringMode(false)
                            setUserProperties({ user_mode: 'working' })
                            trackEvent('mode_switch', { mode: 'working' })
                            updateTabUrl('settings', false)
                          }
                        }}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 999,
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: !hiringMode ? 'white' : 'transparent',
                          color: !hiringMode ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          boxShadow: !hiringMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
                        Working
                      </button>
                      <button
                        onClick={() => {
                          if (!hiringMode) {
                            setHiringMode(true)
                            setUserProperties({ user_mode: 'hiring' })
                            trackEvent('mode_switch', { mode: 'hiring' })
                            updateTabUrl('settings', true)
                          }
                        }}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 999,
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: hiringMode ? 'white' : 'transparent',
                          color: hiringMode ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          boxShadow: hiringMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                        Hiring
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== NOTIFICATIONS TAB ===== */}
            {settingsPageTab === 'notifications' && (
              <div>
                <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                  {/* Email notifications master toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>Email notifications</p>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Receive notifications via email when you're offline</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={localStorage.getItem('irlwork_email_notifs') !== 'false'}
                      onChange={(e) => {
                        localStorage.setItem('irlwork_email_notifs', e.target.checked)
                        toast.success(e.target.checked ? 'Email notifications enabled' : 'Email notifications disabled')
                      }}
                      style={{ width: 20, height: 20, accentColor: 'var(--orange-500)', cursor: 'pointer', flexShrink: 0 }}
                    />
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-secondary)', margin: '14px 0', opacity: 0.5 }} />

                  {/* Category toggles */}
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 10 }}>Notify me about</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(hiringMode ? [
                      { key: 'new_applications', label: 'New applications', desc: 'When someone applies to your posted task' },
                      { key: 'task_completed', label: 'Task completions', desc: 'When a worker marks a task as done' },
                      { key: 'messages', label: 'Messages', desc: 'New messages from workers' },
                      { key: 'reviews', label: 'Reviews received', desc: 'When a worker leaves you a review' },
                    ] : [
                      { key: 'task_assignments', label: 'Task assignments', desc: 'When you\'re assigned or invited to a task' },
                      { key: 'task_updates', label: 'Task updates', desc: 'Status changes on tasks you\'re working on' },
                      { key: 'payments', label: 'Payments', desc: 'Payment received, pending, or failed' },
                      { key: 'messages', label: 'Messages', desc: 'New messages from agents' },
                      { key: 'reviews', label: 'Reviews received', desc: 'When an agent leaves you a review' },
                    ]).map(({ key, label, desc }) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '6px 0' }}>
                        <input
                          type="checkbox"
                          defaultChecked={localStorage.getItem(`irlwork_notif_${key}`) !== 'false'}
                          onChange={(e) => localStorage.setItem(`irlwork_notif_${key}`, e.target.checked)}
                          style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--orange-500)', flexShrink: 0 }}
                        />
                        <div>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 14 }}>{label}</span>
                          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{desc}</p>
                        </div>
                      </label>
                    ))}

                    <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: 8, marginTop: 2 }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '6px 0' }}>
                        <input
                          type="checkbox"
                          defaultChecked={localStorage.getItem('irlwork_notif_marketing') === 'true'}
                          onChange={(e) => localStorage.setItem('irlwork_notif_marketing', e.target.checked)}
                          style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--orange-500)', flexShrink: 0 }}
                        />
                        <div>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 14 }}>Marketing & updates</span>
                          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Product news, tips, and feature announcements</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== ACCOUNT TAB ===== */}
            {settingsPageTab === 'account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Account info card */}
                <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 14 }}>Email</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{user?.email}</p>
                      {(emailVerifSuccess || user?.email_verified) ? (
                        <span style={{ padding: '2px 8px', background: 'rgba(22, 163, 74, 0.1)', color: '#16A34A', fontSize: 11, fontWeight: 600, borderRadius: 999 }}>Verified</span>
                      ) : (
                        <span style={{ padding: '2px 8px', background: 'rgba(251, 191, 36, 0.1)', color: '#D97706', fontSize: 11, fontWeight: 600, borderRadius: 999 }}>Unverified</span>
                      )}
                    </div>
                  </div>

                  {/* Email verification section */}
                  {!(emailVerifSuccess || user?.email_verified) && (
                    <div style={{ padding: '12px 14px', background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.15)', borderRadius: 'var(--radius-md)', marginBottom: 14 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Verify your email</p>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>Verified accounts get more task offers and build trust with agents</p>

                      {emailVerifError && (
                        <div style={{ padding: '8px 10px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', marginBottom: 8, fontSize: 12, color: '#EF4444' }}>{emailVerifError}</div>
                      )}

                      {!emailVerifSent ? (
                        <Button
                          variant="primary"
                          size="md"
                          className="w-full"
                          disabled={emailVerifSending}
                          onClick={async () => {
                            setEmailVerifSending(true)
                            setEmailVerifError('')
                            try {
                              let token = user.token || ''
                              if (supabase) {
                                const { data: { session } } = await supabase.auth.getSession()
                                if (session?.access_token) token = session.access_token
                              }
                              const res = await fetch(`${API_URL}/auth/send-verification`, {
                                method: 'POST',
                                headers: { Authorization: token }
                              })
                              const data = await res.json().catch(() => ({}))
                              if (res.ok) {
                                if (data.message === 'Email already verified') {
                                  setEmailVerifSuccess(true)
                                  toast.success('Email already verified')
                                } else {
                                  setEmailVerifSent(true)
                                  toast.success('Verification code sent')
                                }
                              } else {
                                setEmailVerifError(data.error || 'Failed to send verification code')
                              }
                            } catch (e) {
                              setEmailVerifError('Network error. Please try again.')
                            } finally {
                              setEmailVerifSending(false)
                            }
                          }}
                        >
                          {emailVerifSending ? 'Sending...' : 'Send verification code'}
                        </Button>
                      ) : (
                        <div>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, textAlign: 'center' }}>
                            Enter the 6-digit code sent to <strong>{user?.email}</strong>
                          </p>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={emailVerifCode}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                              setEmailVerifCode(val)
                            }}
                            style={{
                              width: '100%', textAlign: 'center', fontSize: 20, fontWeight: 600,
                              letterSpacing: 8, fontFamily: 'monospace', padding: '10px 12px',
                              background: 'var(--bg-secondary)', border: '1px solid rgba(0,0,0,0.1)',
                              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                              outline: 'none', boxSizing: 'border-box'
                            }}
                          />
                          <Button
                            variant="primary"
                            size="md"
                            className="w-full mt-2"
                            disabled={emailVerifying || emailVerifCode.length < 6}
                            onClick={async () => {
                              if (!emailVerifCode.trim()) return
                              setEmailVerifying(true)
                              setEmailVerifError('')
                              try {
                                let token = user.token || ''
                                if (supabase) {
                                  const { data: { session } } = await supabase.auth.getSession()
                                  if (session?.access_token) token = session.access_token
                                }
                                const res = await fetch(`${API_URL}/auth/verify-email`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: token },
                                  body: JSON.stringify({ code: emailVerifCode.trim() })
                                })
                                const data = await res.json().catch(() => ({}))
                                if (res.ok) {
                                  setEmailVerifSuccess(true)
                                  toast.success('Email verified successfully')
                                } else {
                                  setEmailVerifError(data.error || 'Invalid code')
                                }
                              } catch (e) {
                                setEmailVerifError('Network error. Please try again.')
                              } finally {
                                setEmailVerifying(false)
                              }
                            }}
                          >
                            {emailVerifying ? 'Verifying...' : 'Verify'}
                          </Button>
                          <button
                            onClick={async () => {
                              setEmailVerifSending(true)
                              setEmailVerifError('')
                              try {
                                let token = user.token || ''
                                if (supabase) {
                                  const { data: { session } } = await supabase.auth.getSession()
                                  if (session?.access_token) token = session.access_token
                                }
                                const res = await fetch(`${API_URL}/auth/send-verification`, {
                                  method: 'POST',
                                  headers: { Authorization: token }
                                })
                                if (res.ok) toast.success('Code resent')
                                else {
                                  const data = await res.json().catch(() => ({}))
                                  setEmailVerifError(data.error || 'Failed to resend')
                                }
                              } catch (e) {
                                setEmailVerifError('Network error.')
                              } finally {
                                setEmailVerifSending(false)
                              }
                            }}
                            disabled={emailVerifSending}
                            style={{
                              background: 'none', border: 'none', color: 'var(--text-tertiary)',
                              fontSize: 12, cursor: 'pointer', marginTop: 6, width: '100%',
                              textAlign: 'center'
                            }}
                          >
                            {emailVerifSending ? 'Sending...' : 'Resend code'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: 14, marginBottom: 14, opacity: 0.5 }} />

                  <div>
                    <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 14 }}>Member since</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}</p>
                  </div>

                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full mt-4"
                    onClick={onLogout}
                  >
                    Sign out
                  </Button>
                </div>

                {/* Danger Zone */}
                <div style={{ padding: '14px 16px', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', background: 'rgba(239,68,68,0.04)' }}>
                  <p style={{ fontWeight: 500, color: '#FF5F57', marginBottom: 4, fontSize: 14 }}>Danger Zone</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>Deactivating your account hides your profile and pauses all activity. You can reactivate anytime by signing back in.</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to deactivate your account? Your profile will be hidden and all active tasks will be paused. You can reactivate by signing back in.')) {
                        toast.success('Account deactivated')
                        onLogout()
                      }
                    }}
                  >
                    Deactivate account
                  </Button>
                </div>
              </div>
            )}
          </div>
  )
}
