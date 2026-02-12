import React, { useState, useEffect } from 'react'
import { X, MapPin, Check, Star, Briefcase, Clock, Shield, Calendar, TrendingUp, Loader2, Globe } from 'lucide-react'
import { StarRating } from './HumanProfileCard'
import { SocialIconsRow } from './SocialIcons'
import ForAgentsBox from './ForAgentsBox'
import { fixAvatarUrl } from '../utils/avatarUrl'
import { formatTimezoneShort } from '../utils/timezone'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

export default function HumanProfileModal({ humanId, onClose, onHire, user }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!humanId) return
    setLoading(true)
    setError(null)
    fetch(`${API_URL}/humans/${humanId}/profile`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load profile')
        return r.json()
      })
      .then(data => {
        setProfile(fixAvatarUrl(data))
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [humanId])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const skills = profile ? (Array.isArray(profile.skills) ? profile.skills : []) : []
  const languages = profile ? (Array.isArray(profile.languages) ? profile.languages : []) : []
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 24,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 20,
          maxWidth: 560,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.08)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'sticky',
            top: 16,
            float: 'right',
            marginRight: 16,
            marginTop: 16,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(26,26,26,0.06)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(26,26,26,0.12)' }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(26,26,26,0.06)' }}
        >
          <X size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>

        {loading ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <Loader2 size={32} style={{ color: '#F4845F', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: 16, color: 'var(--text-tertiary)', fontSize: 14 }}>Loading profile...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : error ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Could not load profile</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14, marginTop: 8 }}>{error}</p>
          </div>
        ) : profile ? (
          <div style={{ padding: '32px 32px 24px' }}>
            {/* Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
              {/* Large Avatar */}
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name || ''}
                  style={{
                    width: 80, height: 80, borderRadius: '50%',
                    objectFit: 'cover', flexShrink: 0,
                    boxShadow: '0 4px 16px rgba(244,132,95,0.3)'
                  }}
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }}
                />
              ) : null}
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F4845F, #E07A5F)',
                display: profile.avatar_url ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: 32,
                flexShrink: 0,
                boxShadow: '0 4px 16px rgba(244,132,95,0.3)'
              }}>
                {profile.name?.[0]?.toUpperCase() || '?'}
              </div>

              <div style={{ flex: 1 }}>
                {/* Name + Verified */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h2 style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: 1.2
                  }}>
                    {profile.name || 'Anonymous'}
                  </h2>
                  {profile.verified && (
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Check size={12} style={{ color: 'white' }} />
                    </div>
                  )}
                </div>

                {/* Headline */}
                {profile.headline && (
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '2px 0 4px', lineHeight: 1.3 }}>
                    {profile.headline}
                  </p>
                )}

                {/* Location + Timezone */}
                {profile.city && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    marginBottom: 4
                  }}>
                    <MapPin size={14} style={{ color: '#F4845F' }} />
                    {profile.city}{profile.state ? `, ${profile.state}` : ''}
                    {profile.timezone && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 8, color: 'var(--text-tertiary)', fontSize: 13 }}>
                        <Clock size={12} />
                        {formatTimezoneShort(profile.timezone)}
                      </span>
                    )}
                  </div>
                )}

                {/* Member Since */}
                {memberSince && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 13,
                    color: 'var(--text-tertiary)'
                  }}>
                    <Calendar size={12} />
                    Member since {memberSince}
                  </div>
                )}

                {/* Social Links */}
                {profile.social_links && typeof profile.social_links === 'object' && Object.keys(profile.social_links).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <SocialIconsRow socialLinks={profile.social_links} size={18} gap={10} />
                  </div>
                )}
              </div>
            </div>

            {/* Rating Bar */}
            <div style={{
              padding: '14px 20px',
              background: 'rgba(245,158,11,0.06)',
              borderRadius: 12,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <StarRating rating={profile.rating} count={profile.total_ratings_count || 0} showNewBadge={true} />
              <span style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#F4845F'
              }}>
                ${profile.hourly_rate || 25}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-tertiary)' }}>/hr</span>
              </span>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>About</h4>
                <p style={{
                  fontSize: 15,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: 0
                }}>
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>Skills</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {skills.map((skill, idx) => (
                    <span key={idx} style={{
                      padding: '6px 14px',
                      background: 'rgba(244,132,95,0.08)',
                      borderRadius: 999,
                      fontSize: 13,
                      color: '#E07A5F',
                      fontWeight: 500,
                      border: '1px solid rgba(244,132,95,0.12)'
                    }}>
                      {skill.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {languages.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>Languages</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {languages.map((lang, idx) => (
                    <span key={idx} style={{
                      padding: '6px 14px',
                      background: 'rgba(59,130,246,0.08)',
                      borderRadius: 999,
                      fontSize: 13,
                      color: '#3B82F6',
                      fontWeight: 500,
                      border: '1px solid rgba(59,130,246,0.12)'
                    }}>
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {profile.languages && profile.languages.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>Languages</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {profile.languages.map((lang, idx) => (
                    <span key={idx} style={{
                      padding: '6px 14px',
                      background: 'rgba(59,130,246,0.08)',
                      borderRadius: 999,
                      fontSize: 13,
                      color: '#3B82F6',
                      fontWeight: 500,
                      border: '1px solid rgba(59,130,246,0.12)'
                    }}>
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 24
            }}>
              <StatBox
                icon={<Briefcase size={16} />}
                value={profile.jobs_completed || profile.total_tasks_completed || 0}
                label="Jobs Done"
              />
              <StatBox
                icon={<TrendingUp size={16} />}
                value={profile.completion_rate ? `${profile.completion_rate}%` : '--'}
                label="Completion"
              />
              <StatBox
                icon={<Shield size={16} />}
                value={profile.availability?.replace('_', ' ') || 'Available'}
                label="Status"
              />
            </div>

            {/* Reviews Section */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>
                Recent Reviews
              </h4>
              {profile.reviews && profile.reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {profile.reviews.slice(0, 5).map((review, idx) => (
                    <div key={idx} style={{
                      padding: 16,
                      background: 'var(--bg-tertiary, #F9FAFB)',
                      borderRadius: 12,
                      border: '1px solid rgba(26,26,26,0.04)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star
                              key={i}
                              size={12}
                              fill={i <= (review.score || review.rating || 0) ? '#F59E0B' : 'none'}
                              stroke={i <= (review.score || review.rating || 0) ? '#F59E0B' : '#D1D5DB'}
                              strokeWidth={1.5}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      {review.comment && (
                        <p style={{
                          fontSize: 14,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                          margin: 0
                        }}>
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: 24,
                  textAlign: 'center',
                  background: 'var(--bg-tertiary, #F9FAFB)',
                  borderRadius: 12
                }}>
                  <Star size={24} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
                  <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>No reviews yet</p>
                </div>
              )}
            </div>

            {/* For Agents Box */}
            <ForAgentsBox human={profile} />

            {/* Hire Button */}
            {onHire && (
              <button
                onClick={() => onHire(profile)}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #F4845F, #E07A5F)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 16,
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 16px rgba(244,132,95,0.3)',
                  marginTop: 16
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(244,132,95,0.4)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(244,132,95,0.3)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Hire {profile.name?.split(' ')[0] || 'This Human'}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function StatBox({ icon, value, label }) {
  return (
    <div style={{
      padding: 14,
      background: 'var(--bg-tertiary, #F9FAFB)',
      borderRadius: 12,
      textAlign: 'center',
      border: '1px solid rgba(26,26,26,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: '#F4845F' }}>
        {icon}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  )
}
