// Extracted from Dashboard.jsx — profile editing with avatar, skills, languages, social links
import React, { useRef } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '../ui'
import CityAutocomplete from '../CityAutocomplete'
import TimezoneDropdown from '../TimezoneDropdown'
import { PLATFORMS, PLATFORM_ORDER, extractHandle } from '../SocialIcons'
import { safeArr } from '../../utils/appConstants'
import API_URL from '../../config/api'
import { useToast } from '../../context/ToastContext'

export default function ProfileTab({
  user,
  settingsTab, setSettingsTab,
  profileLocation, setProfileLocation,
  profileTimezone, setProfileTimezone,
  profileGender, setProfileGender,
  skillsList, setSkillsList,
  newSkillInput, setNewSkillInput,
  languagesList, setLanguagesList,
  newLanguageInput, setNewLanguageInput,
  avatarUploading, setAvatarUploading,
  profileLinkCopied, setProfileLinkCopied,
  setHumans,
  onUserUpdate,
}) {
  const toast = useToast()
  const avatarInputRef = useRef(null)

  return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0, gap: 8, flexWrap: 'wrap' }}>
              <h1 className="dashboard-v4-page-title" style={{ marginBottom: 0 }}>Profile</h1>
              <button
                onClick={() => {
                  const profileUrl = `${window.location.origin}/humans/${user?.id}`
                  navigator.clipboard.writeText(profileUrl).then(() => {
                    setProfileLinkCopied(true)
                    setTimeout(() => setProfileLinkCopied(false), 2000)
                  })
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8,
                  border: '1px solid var(--border-secondary)',
                  background: profileLinkCopied ? 'var(--orange-50, #fff7ed)' : 'var(--bg-primary)',
                  color: profileLinkCopied ? 'var(--orange-600)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {profileLinkCopied ? <Check size={14} /> : <Copy size={14} />}
                {profileLinkCopied ? 'Copied' : 'Copy link'}
              </button>
            </div>

            {/* Profile warning banner removed — single contextual banner kept below profile card */}

            <div className="dashboard-v4-form" style={{ maxWidth: 720, marginBottom: 24 }}>
              {/* Avatar Upload */}
              <div className="profile-avatar-section" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div
                  style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {user?.avatar_url ? (
                    <img key={user.avatar_url} src={user.avatar_url} alt={user?.name || ''} style={{
                      width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                      boxShadow: '0 2px 8px rgba(232,133,61,0.25)'
                    }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
                  ) : null}
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))',
                    display: user?.avatar_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 28,
                    boxShadow: '0 2px 8px rgba(232,133,61,0.25)'
                  }}>
                    {user?.name?.charAt(0) || '?'}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--orange-500)', border: '2px solid white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {avatarUploading ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const origFile = e.target.files?.[0]
                      if (!origFile) return
                      // Clone file data BEFORE resetting input — iOS Safari
                      // invalidates File blobs when input.value is cleared
                      const fileData = await origFile.arrayBuffer()
                      const file = new File([fileData], origFile.name, { type: origFile.type, lastModified: origFile.lastModified })
                      e.target.value = ''
                      if (file.size > 20 * 1024 * 1024) {
                        toast.error('Image must be under 20MB')
                        return
                      }
                      // Accept common image types + HEIC/HEIF from iOS + empty type (iOS sometimes omits it)
                      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
                      const ext = file.name?.split('.').pop()?.toLowerCase()
                      const isImageByExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(ext)
                      if (file.type && !allowedTypes.includes(file.type) && !isImageByExt) {
                        toast.error('Please upload a JPG, PNG, WebP, GIF, or HEIC image')
                        return
                      }
                      setAvatarUploading(true)
                      try {
                        // Compress image client-side (converts HEIC→JPEG too)
                        let fileToUpload = file
                        const isGif = file.type === 'image/gif' || ext === 'gif'
                        if (!isGif) {
                          try {
                            const imageCompression = (await import('browser-image-compression')).default
                            const compressed = await imageCompression(file, {
                              maxSizeMB: 1,
                              maxWidthOrHeight: 1200,
                              useWebWorker: typeof Worker !== 'undefined',
                              fileType: 'image/jpeg',
                              initialQuality: 0.85,
                            })
                            // Sanity check: if compression produced a tiny file, use original instead
                            if (compressed.size < 5000) {
                              console.warn(`[Avatar] Compression produced tiny file (${compressed.size} bytes), using original (${file.size} bytes)`)
                              // Still need to convert to JPEG for HEIC compatibility — try without fileType forcing
                              try {
                                const retried = await imageCompression(file, {
                                  maxSizeMB: 2,
                                  maxWidthOrHeight: 1600,
                                  useWebWorker: typeof Worker !== 'undefined',
                                  initialQuality: 0.9,
                                })
                                if (retried.size > 5000) {
                                  fileToUpload = retried
                                } else {
                                  // Both attempts failed — use original if small enough
                                  fileToUpload = file.size <= 5 * 1024 * 1024 ? file : compressed
                                }
                              } catch {
                                fileToUpload = file.size <= 5 * 1024 * 1024 ? file : compressed
                              }
                            } else {
                              fileToUpload = compressed
                            }
                          } catch (compErr) {
                            console.warn('[Avatar] Compression failed:', compErr.message || compErr)
                            if (file.size > 4 * 1024 * 1024) {
                              toast.error('Could not process this image — try a smaller photo')
                              setAvatarUploading(false)
                              return
                            }
                          }
                        }
                        const base64 = await new Promise((resolve, reject) => {
                          const reader = new FileReader()
                          reader.onload = () => resolve(reader.result)
                          reader.onerror = () => reject(new Error('Failed to read file'))
                          reader.readAsDataURL(fileToUpload)
                        })

                        const controller = new AbortController()
                        const timeout = setTimeout(() => controller.abort(), 60000)
                        try {
                          // Use compressed file's name/type — HEIC files get compressed to JPEG client-side
                          // but server rejects .heic extensions, so derive the correct filename
                          const uploadExt = (fileToUpload.type === 'image/jpeg' || !fileToUpload.type) ? 'jpg'
                            : fileToUpload.type === 'image/png' ? 'png'
                            : fileToUpload.type === 'image/webp' ? 'webp'
                            : fileToUpload.type === 'image/gif' ? 'gif'
                            : 'jpg'
                          const uploadFilename = file.name.replace(/\.[^.]+$/, `.${uploadExt}`)
                          // Use the matching MIME type for the derived extension — if compression failed
                          // on HEIC, fileToUpload.type would still be 'image/heic' which the server rejects
                          const uploadMime = uploadExt === 'jpg' ? 'image/jpeg'
                            : uploadExt === 'png' ? 'image/png'
                            : uploadExt === 'webp' ? 'image/webp'
                            : uploadExt === 'gif' ? 'image/gif'
                            : 'image/jpeg'
                          const payload = JSON.stringify({ file: base64, filename: uploadFilename, mimeType: uploadMime })

                          const res = await fetch(`${API_URL}/upload/avatar`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
                            body: payload,
                            signal: controller.signal,
                          })
                          clearTimeout(timeout)
                          if (res.ok) {
                            const data = await res.json()

                            // Use base64 for immediate display (guaranteed to show), but store
                            // the server proxy URL in localStorage for persistence across reloads.
                            const proxyUrl = data.url
                            const updatedUser = { ...user, avatar_url: proxyUrl || base64 }
                            onUserUpdate(updatedUser)
                            // Store proxy URL in localStorage — matches what fetchUserProfile returns
                            const cacheUser = { ...updatedUser, token: undefined }
                            localStorage.setItem('user', JSON.stringify(cacheUser))
                            // Update the humans array so browse cards reflect the new avatar instantly
                            setHumans(prev => prev.map(h => h.id === user.id ? { ...h, avatar_url: proxyUrl || base64 } : h))
                            toast.success('Profile photo updated')
                          } else {
                            const errText = await res.text().catch(() => '')
                            let errMsg = 'Failed to upload photo'
                            try { errMsg = JSON.parse(errText).error || errMsg } catch {}
                            toast.error(errMsg)
                          }
                        } catch (fetchErr) {
                          clearTimeout(timeout)
                          if (fetchErr.name === 'AbortError') {
                            toast.error('Upload timed out — try a stronger connection')
                          } else {
                            toast.error(`Upload failed: ${fetchErr.message || 'network error'}`)
                          }
                        }
                      } catch (err) {
                        console.error('[Avatar] Error:', err)
                        toast.error('Error processing image — try a different photo')
                      }
                      setAvatarUploading(false)
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name || 'Your Name'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{user?.email}</div>
                  {!user?.verified && (
                    <a href="/premium" className="profile-get-verified-btn" style={{ marginTop: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Get Verified
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Profile completion banner — smart contextual messaging */}
            {(() => {
              const hasBio = !!(user?.bio && user.bio.trim().length > 10)
              const hasSkills = Array.isArray(user?.skills) && user.skills.length > 0
              const hasHeadline = !!(user?.headline && user.headline.trim())
              const hasPhoto = !!user?.avatar_url
              let msg = null
              if (!hasBio) msg = 'Add a bio to stand out — profiles with bios get 2\u00d7 more task invites'
              else if (!hasSkills) msg = 'Add your skills to get matched with higher-paying tasks'
              else if (!hasHeadline) msg = 'Add a headline so agents know what you\'re great at'
              else if (!hasPhoto) msg = 'Add a profile photo — profiles with photos are trusted more by agents'
              if (!msg) return null
              return (
                <div style={{
                  maxWidth: 600,
                  marginBottom: 16,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'var(--orange-50, #fff7ed)',
                  border: '1px solid var(--orange-200, #fed7aa)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 14,
                  color: 'var(--orange-700, #c2410c)',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>{msg}</span>
                </div>
              )
            })()}

            {/* Profile editing sub-tabs */}
            <div className="settings-tabs">
              {['Profile', 'Skills', 'Languages', 'Social'].map(tab => (
                <button
                  key={tab}
                  className={`settings-tab${settingsTab === tab.toLowerCase() ? ' settings-tab-active' : ''}`}
                  onClick={() => setSettingsTab(tab.toLowerCase())}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="dashboard-v4-form settings-panel">

              {settingsTab === 'profile' && (
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  try {
                    const locationData = profileLocation || {}
                    const payload = {
                      name: formData.get('name'),
                      headline: formData.get('headline'),
                      city: locationData.city || user?.city,
                      latitude: locationData.latitude ?? user?.latitude,
                      longitude: locationData.longitude ?? user?.longitude,
                      country: locationData.country || user?.country,
                      country_code: locationData.country_code || user?.country_code,
                      hourly_rate: parseInt(formData.get('hourly_rate')) || 25,
                      bio: formData.get('bio'),
                      travel_radius: parseInt(formData.get('travel_radius')) || 25,
                      gender: profileGender || null
                    }
                    if (profileTimezone) payload.timezone = profileTimezone
                    const res = await fetch(`${API_URL}/humans/profile`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
                      body: JSON.stringify(payload)
                    })
                    if (res.ok) {
                      const data = await res.json()
                      if (data.user) {
                        const updatedUser = { ...data.user, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
                        localStorage.setItem('user', JSON.stringify(updatedUser))
                      }
                      const hasSkills = Array.isArray(data?.user?.skills || user?.skills) && (data?.user?.skills || user?.skills).length > 0
                      const hasLangs = Array.isArray(data?.user?.languages || user?.languages) && (data?.user?.languages || user?.languages).length > 0
                      if (!hasSkills) toast.success('Profile saved. Next: add your skills')
                      else if (!hasLangs) toast.success('Profile saved. Next: add your languages')
                      else toast.success('Profile updated')
                      setProfileLocation(null)
                      setTimeout(() => window.location.reload(), 1500)
                    } else {
                      const err = await res.json()
                      toast.error(err.error || 'Unknown error')
                    }
                  } catch (err) {
                    toast.error('Error saving profile')
                  }
                }}>
                  <div className="dashboard-form-grid-2col">
                    <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                      <label className="dashboard-v4-form-label">Full Name</label>
                      <input type="text" name="name" defaultValue={user?.name} className="dashboard-v4-form-input" />
                    </div>
                    <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                      <label className="dashboard-v4-form-label">City</label>
                      <CityAutocomplete
                        value={profileLocation?.city || user?.city || ''}
                        onChange={setProfileLocation}
                        placeholder="San Francisco"
                        className="dashboard-v4-city-input"
                      />
                    </div>
                  </div>

                  <div className="dashboard-v4-form-group">
                    <label className="dashboard-v4-form-label">Gender</label>
                    <div style={{
                      display: 'flex',
                      borderRadius: 8,
                      border: '1px solid var(--border-secondary, rgba(26, 26, 26, 0.1))',
                      overflow: 'hidden',
                    }}>
                      {['Man', 'Woman', 'Other'].map((option, idx) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setProfileGender(option.toLowerCase())}
                          style={{
                            flex: 1,
                            padding: '8px 16px',
                            border: 'none',
                            borderRight: idx < 2 ? '1px solid var(--border-secondary, rgba(26, 26, 26, 0.1))' : 'none',
                            background: profileGender === option.toLowerCase()
                              ? 'var(--orange-500, #f4845f)'
                              : 'var(--bg-primary, white)',
                            color: profileGender === option.toLowerCase()
                              ? 'white'
                              : 'var(--text-secondary)',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="dashboard-v4-form-group">
                    <label className="dashboard-v4-form-label">Headline</label>
                    <input type="text" name="headline" defaultValue={user?.headline || ''} maxLength={120} className="dashboard-v4-form-input" placeholder="e.g. Professional Photographer & Drone Pilot" />
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>A short tagline that appears on your profile card</p>
                  </div>

                  <div className="dashboard-form-grid-2col">
                    <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                      <label className="dashboard-v4-form-label">Hourly Rate ($)</label>
                      <input type="number" name="hourly_rate" defaultValue={user?.hourly_rate || 25} min={5} max={500} className="dashboard-v4-form-input" />
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Your asking rate. Actual pay is set per task by the agent.</p>
                    </div>
                    <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                      <label className="dashboard-v4-form-label">Travel Radius (miles)</label>
                      <input type="number" name="travel_radius" defaultValue={user?.travel_radius || 25} min={1} max={100} className="dashboard-v4-form-input" />
                    </div>
                  </div>

                  <div className="dashboard-v4-form-group">
                    <label className="dashboard-v4-form-label">Timezone</label>
                    <TimezoneDropdown
                      value={profileTimezone}
                      onChange={setProfileTimezone}
                      className="dashboard-v4-form-input"
                    />
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Auto-set when you select a city. You can override manually.</p>
                  </div>

                  <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                    <label className="dashboard-v4-form-label">Bio</label>
                    <textarea name="bio" defaultValue={user?.bio || ''} className="dashboard-v4-form-input dashboard-v4-form-textarea" style={{ minHeight: 80 }} placeholder="Describe your experience, availability, and what makes you great at tasks." />
                  </div>

                  <Button type="submit" variant="secondary" size="md" className="w-full mt-4">Save changes</Button>
                </form>
              )}

              {settingsTab === 'skills' && (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {skillsList.map((skill, idx) => (
                      <span key={idx} style={{
                        padding: '6px 12px',
                        background: '#F3F4F6',
                        borderRadius: 999,
                        fontSize: 13,
                        color: '#374151',
                        fontWeight: 500,
                        border: '1px solid rgba(26,26,26,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        {skill.replace(/_/g, ' ')}
                        <button
                          type="button"
                          onClick={() => setSkillsList(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6B7280', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#1A1A1A'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                        >
                          <span style={{ fontSize: 16, lineHeight: 1 }}>&times;</span>
                        </button>
                      </span>
                    ))}
                    {skillsList.length === 0 && (
                      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No skills added yet</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = newSkillInput.trim()
                          if (val && !skillsList.includes(val)) {
                            setSkillsList(prev => [...prev, val])
                            setNewSkillInput('')
                          }
                        }
                      }}
                      className="dashboard-v4-form-input"
                      placeholder="Type a skill and press Enter"
                      style={{ flex: 1, marginBottom: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newSkillInput.trim()
                        if (val && !skillsList.includes(val)) {
                          setSkillsList(prev => [...prev, val])
                          setNewSkillInput('')
                        }
                      }}
                      className="v4-btn v4-btn-primary"
                      style={{ padding: '10px 20px', flexShrink: 0 }}
                    >
                      Add
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full mt-4"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_URL}/humans/profile`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
                          body: JSON.stringify({ skills: skillsList })
                        })
                        if (res.ok) {
                          const data = await res.json()
                          if (data.user) {
                            const updatedUser = { ...data.user, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
                            localStorage.setItem('user', JSON.stringify(updatedUser))
                          }
                          const hasLangs = Array.isArray(data?.user?.languages || user?.languages) && (data?.user?.languages || user?.languages).length > 0
                          const hasSocial = data?.user?.social_links && Object.keys(data.user.social_links).length > 0
                          if (!hasLangs) toast.success('Skills saved. Next: add your languages')
                          else if (!hasSocial) toast.success('Skills saved. Next: add your social links')
                          else toast.success('Skills updated')
                          setTimeout(() => window.location.reload(), 1500)
                        } else {
                          const err = await res.json()
                          toast.error(err.error || 'Unknown error')
                        }
                      } catch (err) {
                        toast.error('Error saving skills')
                      }
                    }}
                  >
                    Update skills
                  </Button>
                </>
              )}

              {settingsTab === 'languages' && (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {languagesList.map((lang, idx) => (
                      <span key={idx} style={{
                        padding: '6px 12px',
                        background: 'rgba(59,130,246,0.08)',
                        borderRadius: 999,
                        fontSize: 13,
                        color: '#3B82F6',
                        fontWeight: 500,
                        border: '1px solid rgba(59,130,246,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        {lang}
                        <button
                          type="button"
                          onClick={() => setLanguagesList(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#3B82F6', display: 'flex', alignItems: 'center' }}
                        >
                          <span style={{ fontSize: 16, lineHeight: 1 }}>&times;</span>
                        </button>
                      </span>
                    ))}
                    {languagesList.length === 0 && (
                      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No languages added yet</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                      type="text"
                      value={newLanguageInput}
                      onChange={(e) => setNewLanguageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = newLanguageInput.trim()
                          if (val && !languagesList.includes(val)) {
                            setLanguagesList(prev => [...prev, val])
                            setNewLanguageInput('')
                          }
                        }
                      }}
                      className="dashboard-v4-form-input"
                      placeholder="Type a language and press Enter"
                      style={{ flex: 1, marginBottom: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newLanguageInput.trim()
                        if (val && !languagesList.includes(val)) {
                          setLanguagesList(prev => [...prev, val])
                          setNewLanguageInput('')
                        }
                      }}
                      className="v4-btn v4-btn-primary"
                      style={{ padding: '10px 20px', flexShrink: 0 }}
                    >
                      Add
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full mt-4"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_URL}/humans/profile`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
                          body: JSON.stringify({ languages: languagesList })
                        })
                        if (res.ok) {
                          const data = await res.json()
                          if (data.user) {
                            const updatedUser = { ...data.user, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
                            localStorage.setItem('user', JSON.stringify(updatedUser))
                          }
                          const hasSocial = data?.user?.social_links && Object.keys(data.user.social_links).length > 0
                          if (!hasSocial) toast.success('Languages saved. Next: add your social links')
                          else toast.success('Languages updated')
                          setTimeout(() => window.location.reload(), 1500)
                        } else {
                          const err = await res.json()
                          toast.error(err.error || 'Unknown error')
                        }
                      } catch (err) {
                        toast.error('Error saving languages')
                      }
                    }}
                  >
                    Update languages
                  </Button>
                </>
              )}

              {settingsTab === 'social' && (
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  const social_links = {}
                  PLATFORM_ORDER.forEach(p => {
                    const val = formData.get(p)?.trim()
                    if (val) social_links[p] = extractHandle(p, val)
                  })
                  try {
                    const res = await fetch(`${API_URL}/humans/profile`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
                      body: JSON.stringify({ social_links })
                    })
                    if (res.ok) {
                      const data = await res.json()
                      if (data.user) {
                        const updatedUser = { ...data.user, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
                        localStorage.setItem('user', JSON.stringify(updatedUser))
                      }
                      toast.success('Social links updated')
                      setTimeout(() => window.location.reload(), 1500)
                    } else {
                      const err = await res.json()
                      toast.error(err.error || 'Unknown error')
                    }
                  } catch (err) {
                    toast.error('Error saving social links')
                  }
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {PLATFORM_ORDER.map(platform => {
                      const config = PLATFORMS[platform]
                      return (
                        <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', flexShrink: 0, width: 20 }}>
                            {config.icon(18)}
                          </div>
                          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', width: 80, flexShrink: 0 }}>{config.label}</label>
                          <input
                            type="text"
                            name={platform}
                            defaultValue={user?.social_links?.[platform] || ''}
                            placeholder={config.placeholder}
                            maxLength={200}
                            className="dashboard-v4-form-input"
                            style={{ marginBottom: 0 }}
                            onBlur={(e) => {
                              const cleaned = extractHandle(platform, e.target.value)
                              if (cleaned !== e.target.value) e.target.value = cleaned
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12 }}>Enter your username or paste a profile URL — it will be auto-formatted</p>
                  <Button type="submit" variant="secondary" size="md" className="w-full mt-4">Update social links</Button>
                </form>
              )}

            </div>
          </div>
  )
}
