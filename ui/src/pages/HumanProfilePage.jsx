import React, { useState, useEffect } from 'react'
import { MapPin, Check, Star, Briefcase, Clock, Shield, Calendar, TrendingUp, Loader2, Globe, ArrowLeft, Share2 } from 'lucide-react'
import { StarRating } from '../components/HumanProfileCard'
import { SocialIconsRow } from '../components/SocialIcons'
import ForAgentsBox from '../components/ForAgentsBox'
import { PageLayoutV4 } from '../components/V4Layout'
import API_URL from '../config/api'

export default function HumanProfilePage({ humanId, user, onLogout, onNavigate }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!humanId) return
    setLoading(true)
    setError(null)
    fetch(`${API_URL}/humans/${humanId}/profile`)
      .then(r => {
        if (!r.ok) throw new Error('Profile not found')
        return r.json()
      })
      .then(data => {
        setProfile(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [humanId])

  const skills = profile ? (Array.isArray(profile.skills) ? profile.skills : []) : []
  const languages = profile ? (Array.isArray(profile.languages) ? profile.languages : []) : []
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <PageLayoutV4 user={user} onLogout={onLogout}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Back + Share */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button
            onClick={() => onNavigate?.('/browse') || (window.location.href = '/browse')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: 'none',
              border: '1px solid rgba(26,26,26,0.1)',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 14,
              color: 'var(--text-secondary, #525252)',
              transition: 'all 0.2s'
            }}
          >
            <ArrowLeft size={16} />
            Back to Browse
          </button>
          <button
            onClick={handleShare}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: 'none',
              border: '1px solid rgba(26,26,26,0.1)',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 14,
              color: copied ? '#059669' : 'var(--text-secondary, #525252)',
              transition: 'all 0.2s'
            }}
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? 'Copied!' : 'Share Profile'}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <Loader2 size={32} style={{ color: '#F4845F', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: 16, color: 'var(--text-tertiary, #8A8A8A)', fontSize: 14 }}>Loading profile...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : error ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary, #525252)', fontSize: 18, fontWeight: 600 }}>Profile not found</p>
            <p style={{ color: 'var(--text-tertiary, #8A8A8A)', fontSize: 14, marginTop: 8 }}>{error}</p>
            <button
              onClick={() => window.location.href = '/browse'}
              style={{
                marginTop: 24,
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #F4845F, #E07A5F)',
                color: 'white',
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Browse Humans
            </button>
          </div>
        ) : profile ? (
          <div style={{
            background: 'white',
            borderRadius: 20,
            border: '1px solid rgba(26,26,26,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            overflow: 'hidden'
          }}>
            {/* Profile Header */}
            <div style={{ padding: '40px 40px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 28 }}>
                {/* Large Avatar */}
                <div style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F4845F, #E07A5F)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 38,
                  flexShrink: 0,
                  boxShadow: '0 4px 20px rgba(244,132,95,0.3)'
                }}>
                  {profile.name?.[0]?.toUpperCase() || '?'}
                </div>

                <div style={{ flex: 1 }}>
                  {/* Name + Verified */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h1 style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: 'var(--text-primary, #1A1A1A)',
                      margin: 0,
                      lineHeight: 1.2
                    }}>
                      {profile.name || 'Anonymous'}
                    </h1>
                    {profile.verified && (
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Check size={14} style={{ color: 'white' }} />
                      </div>
                    )}
                  </div>

                  {/* Headline */}
                  {profile.headline && (
                    <p style={{ fontSize: 16, color: 'var(--text-secondary, #525252)', margin: '4px 0 8px', lineHeight: 1.4 }}>
                      {profile.headline}
                    </p>
                  )}

                  {/* Location + Timezone */}
                  {profile.city && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 15,
                      color: 'var(--text-secondary, #525252)',
                      marginBottom: 4,
                      flexWrap: 'wrap'
                    }}>
                      <MapPin size={15} style={{ color: '#F4845F' }} />
                      {profile.city}{profile.state ? `, ${profile.state}` : ''}
                      {profile.timezone && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8, color: 'var(--text-tertiary, #8A8A8A)', fontSize: 14 }}>
                          <Clock size={13} />
                          {profile.timezone.replace(/_/g, ' ')}
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
                      fontSize: 14,
                      color: 'var(--text-tertiary, #8A8A8A)',
                      marginBottom: 8
                    }}>
                      <Calendar size={13} />
                      Member since {memberSince}
                    </div>
                  )}

                  {/* Social Links */}
                  {profile.social_links && typeof profile.social_links === 'object' && Object.keys(profile.social_links).length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <SocialIconsRow socialLinks={profile.social_links} size={20} gap={12} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rating + Rate Bar */}
            <div style={{
              padding: '16px 40px',
              background: 'rgba(245,158,11,0.04)',
              borderTop: '1px solid rgba(26,26,26,0.04)',
              borderBottom: '1px solid rgba(26,26,26,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 0
            }}>
              <StarRating rating={profile.rating} count={profile.total_ratings_count || 0} showNewBadge={true} />
              <span style={{ fontSize: 32, fontWeight: 700, color: '#F4845F' }}>
                ${profile.hourly_rate || 25}<span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-tertiary, #8A8A8A)' }}>/hr</span>
              </span>
            </div>

            {/* Content */}
            <div style={{ padding: '32px 40px 40px' }}>
              {/* Bio */}
              {profile.bio && (
                <div style={{ marginBottom: 28 }}>
                  <SectionLabel>About</SectionLabel>
                  <p style={{
                    fontSize: 15,
                    color: 'var(--text-secondary, #525252)',
                    lineHeight: 1.7,
                    margin: 0
                  }}>
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <SectionLabel>Skills</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {skills.map((skill, idx) => (
                      <span key={idx} style={{
                        padding: '7px 16px',
                        background: 'rgba(244,132,95,0.08)',
                        borderRadius: 999,
                        fontSize: 14,
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
                <div style={{ marginBottom: 28 }}>
                  <SectionLabel>Languages</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {languages.map((lang, idx) => (
                      <span key={idx} style={{
                        padding: '7px 16px',
                        background: 'rgba(59,130,246,0.08)',
                        borderRadius: 999,
                        fontSize: 14,
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
                gap: 14,
                marginBottom: 28
              }}>
                <StatBox
                  icon={<Briefcase size={18} />}
                  value={profile.jobs_completed || profile.total_tasks_completed || 0}
                  label="Jobs Done"
                />
                <StatBox
                  icon={<TrendingUp size={18} />}
                  value={profile.completion_rate ? `${profile.completion_rate}%` : '--'}
                  label="Completion"
                />
                <StatBox
                  icon={<Shield size={18} />}
                  value={profile.availability?.replace(/_/g, ' ') || 'Available'}
                  label="Status"
                />
              </div>

              {/* Reviews Section */}
              <div style={{ marginBottom: 28 }}>
                <SectionLabel>Recent Reviews</SectionLabel>
                {profile.reviews && profile.reviews.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {profile.reviews.slice(0, 10).map((review, idx) => (
                      <div key={idx} style={{
                        padding: 18,
                        background: 'var(--bg-tertiary, #F9FAFB)',
                        borderRadius: 14,
                        border: '1px solid rgba(26,26,26,0.04)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star
                                key={i}
                                size={14}
                                fill={i <= (review.score || review.rating || review.rating_score || 0) ? '#F59E0B' : 'none'}
                                stroke={i <= (review.score || review.rating || review.rating_score || 0) ? '#F59E0B' : '#D1D5DB'}
                                strokeWidth={1.5}
                              />
                            ))}
                          </div>
                          <span style={{ fontSize: 13, color: 'var(--text-tertiary, #8A8A8A)' }}>
                            {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        {review.comment && (
                          <p style={{
                            fontSize: 14,
                            color: 'var(--text-secondary, #525252)',
                            lineHeight: 1.6,
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
                    padding: 32,
                    textAlign: 'center',
                    background: 'var(--bg-tertiary, #F9FAFB)',
                    borderRadius: 14
                  }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px'
                    }}>
                      <Star size={22} style={{ color: 'white' }} />
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #1A1A1A)', margin: '0 0 4px' }}>New to irlwork</p>
                    <p style={{ fontSize: 14, color: 'var(--text-tertiary, #8A8A8A)', margin: 0 }}>This human hasn't received any reviews yet. Be the first to work with them!</p>
                  </div>
                )}
              </div>

              {/* For Agents Box */}
              <ForAgentsBox human={profile} />

              {/* Hire Button */}
              <button
                onClick={() => {
                  if (user) {
                    window.location.href = `/browse?hire=${profile.id}`
                  } else {
                    window.location.href = '/auth'
                  }
                }}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #F4845F, #E07A5F)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 17,
                  borderRadius: 14,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(244,132,95,0.3)',
                  marginTop: 16
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 28px rgba(244,132,95,0.4)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(244,132,95,0.3)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Hire {profile.name?.split(' ')[0] || 'This Human'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </PageLayoutV4>
  )
}

function SectionLabel({ children }) {
  return (
    <h4 style={{
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-tertiary, #8A8A8A)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      margin: '0 0 12px 0'
    }}>
      {children}
    </h4>
  )
}

function StatBox({ icon, value, label }) {
  return (
    <div style={{
      padding: 18,
      background: 'var(--bg-tertiary, #F9FAFB)',
      borderRadius: 14,
      textAlign: 'center',
      border: '1px solid rgba(26,26,26,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: '#F4845F' }}>
        {icon}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #1A1A1A)', marginBottom: 2 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary, #8A8A8A)', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  )
}
