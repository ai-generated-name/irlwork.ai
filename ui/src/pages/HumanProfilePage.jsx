import React, { useState, useEffect } from 'react'
import { MapPin, Check, Star, Briefcase, TrendingUp, Loader2, Clock, Calendar, ArrowLeft, Share2, ShieldCheck } from 'lucide-react'
import { StarRating } from '../components/HumanProfileCard'
import { SocialIconsRow } from '../components/SocialIcons'
import ForAgentsBox from '../components/ForAgentsBox'
import { PageLayoutV4 } from '../components/V4Layout'
import { Button } from '../components/ui'
import API_URL from '../config/api'
import { fixAvatarUrl } from '../utils/avatarUrl'
import { formatTimezoneShort } from '../utils/timezone'
import { navigate } from '../utils/navigate'
import { usePageTitle } from '../hooks/usePageTitle'

export default function HumanProfilePage({ humanId, user, onLogout, onNavigate }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  usePageTitle(profile?.name ? `${profile.name}'s Profile` : 'Profile')

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
        const fixed = fixAvatarUrl(data)

        setProfile(fixed)
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

  const isOwnProfile = user && profile && user.id === profile.id
  const isAvailable = profile?.availability === 'available'
  const jobsDone = profile?.jobs_completed || profile?.total_tasks_completed || 0
  const completionRate = profile?.completion_rate ? `${profile.completion_rate}%` : null
  const hasReviews = profile?.reviews && profile.reviews.length > 0
  const numRating = parseFloat(profile?.rating) || 0
  const numCount = parseInt(profile?.total_ratings_count) || 0

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleHire = () => {
    if (user) {
      navigate(`/browse/humans?hire=${profile.id}`)
    } else {
      navigate('/auth')
    }
  }

  return (
    <PageLayoutV4 user={user} onLogout={onLogout} showNavbar={false} showFooter={false}>
      {/* Responsive CSS */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .profile-two-col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        .profile-right-col {
          position: static;
        }
        .profile-sticky-hire {
          display: none;
        }
        @media (min-width: 768px) {
          .profile-two-col {
            grid-template-columns: 1fr 340px;
            gap: 28px;
          }
          .profile-right-col {
            position: sticky;
            top: 24px;
            align-self: start;
          }
        }
        @media (max-width: 767px) {
          .profile-sticky-hire {
            display: flex;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Back + Share */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => onNavigate?.('/browse/humans') || navigate('/browse/humans')}
          >
            <ArrowLeft size={16} style={{ marginRight: 6 }} />
            Back to browse
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleShare}
            style={copied ? { color: '#059669', borderColor: '#059669' } : {}}
          >
            {copied ? <Check size={16} style={{ marginRight: 6 }} /> : <Share2 size={16} style={{ marginRight: 6 }} />}
            {copied ? 'Link copied' : 'Share profile'}
          </Button>
        </div>

        {loading ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <Loader2 size={32} style={{ color: '#F4845F', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: 16, color: 'var(--text-tertiary, #8A8A8A)', fontSize: 14 }}>Loading profile...</p>
          </div>
        ) : error ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary, #525252)', fontSize: 18, fontWeight: 600 }}>Profile not found</p>
            <p style={{ color: 'var(--text-tertiary, #8A8A8A)', fontSize: 14, marginTop: 8 }}>{error}</p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/browse/humans')}
              style={{ marginTop: 24 }}
            >
              View other workers
            </Button>
          </div>
        ) : profile ? (
          <>
            <div className="profile-two-col">
              {/* ==================== LEFT COLUMN ==================== */}
              <div style={{
                background: 'white',
                borderRadius: 20,
                border: '1px solid rgba(26,26,26,0.06)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                overflow: 'hidden'
              }}>
                {/* Profile Header */}
                <div style={{ padding: '32px 32px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24 }}>
                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {profile.avatar_url ? (
                        <img
                          key={profile.avatar_url}
                          src={profile.avatar_url}
                          alt={profile.name || ''}
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            boxShadow: '0 4px 20px rgba(244,132,95,0.3)'
                          }}
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }}
                        />
                      ) : null}
                      <div style={{
                        width: 88,
                        height: 88,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #F4845F, #E07A5F)',
                        display: profile.avatar_url ? 'none' : 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 34,
                        boxShadow: '0 4px 20px rgba(244,132,95,0.3)'
                      }}>
                        {profile.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name + Verified + NEW Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <h1 style={{
                          fontSize: 26,
                          fontWeight: 700,
                          color: 'var(--text-primary, #1A1A1A)',
                          margin: 0,
                          lineHeight: 1.2
                        }}>
                          {profile.name || 'Anonymous'}
                        </h1>
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
                            <Check size={13} style={{ color: 'white' }} />
                          </div>
                        )}
                        {numRating === 0 && numCount === 0 && (
                          <span style={{
                            padding: '2px 8px',
                            background: 'linear-gradient(135deg, #10B981, #059669)',
                            borderRadius: 999,
                            fontSize: 10,
                            color: 'white',
                            fontWeight: 600,
                            letterSpacing: '0.03em',
                          }}>
                            NEW
                          </span>
                        )}
                        {isOwnProfile && !profile.verified && (
                          <a
                            href="/premium"
                            title="Verified profiles get up to 3× more task offers"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 10px',
                              background: 'transparent',
                              border: '1px solid #E8863A',
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#E8863A',
                              textDecoration: 'none',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(232, 134, 58, 0.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <ShieldCheck size={13} />
                            Get verified
                          </a>
                        )}
                      </div>

                      {/* Headline */}
                      {profile.headline && (
                        <p style={{ fontSize: 15, color: 'var(--text-secondary, #525252)', margin: '2px 0 6px', lineHeight: 1.4 }}>
                          {profile.headline}
                        </p>
                      )}

                      {/* Location + Timezone */}
                      {profile.city && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 14,
                          color: 'var(--text-secondary, #525252)',
                          marginBottom: 2,
                          flexWrap: 'wrap'
                        }}>
                          <MapPin size={14} style={{ color: '#F4845F' }} />
                          {profile.city}{profile.state ? `, ${profile.state}` : ''}
                          {profile.timezone && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 6, color: 'var(--text-tertiary, #8A8A8A)', fontSize: 13 }}>
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
                          color: 'var(--text-tertiary, #8A8A8A)',
                          marginBottom: 6
                        }}>
                          <Calendar size={12} />
                          Member since {memberSince}
                        </div>
                      )}

                      {/* Social Links */}
                      {profile.social_links && typeof profile.social_links === 'object' && Object.keys(profile.social_links).length > 0 && (
                        <div style={{ marginTop: 2 }}>
                          <SocialIconsRow socialLinks={profile.social_links} size={18} gap={10} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Sections */}
                <div style={{ padding: '0 32px 32px' }}>
                  {/* Bio */}
                  {profile.bio && (
                    <div style={{ marginBottom: 20 }}>
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
                    <div style={{ marginBottom: 20 }}>
                      <SectionLabel>Skills</SectionLabel>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
                    <div style={{ marginBottom: 20 }}>
                      <SectionLabel>Languages</SectionLabel>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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

                  {/* Reviews - full list on left column for profiles with reviews */}
                  {hasReviews && (
                    <div>
                      <SectionLabel>Recent reviews</SectionLabel>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {profile.reviews.slice(0, 10).map((review, idx) => (
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
                                    size={13}
                                    fill={i <= (review.score || review.rating || review.rating_score || 0) ? '#F59E0B' : 'none'}
                                    stroke={i <= (review.score || review.rating || review.rating_score || 0) ? '#F59E0B' : '#D1D5DB'}
                                    strokeWidth={1.5}
                                  />
                                ))}
                              </div>
                              <span style={{ fontSize: 12, color: 'var(--text-tertiary, #8A8A8A)' }}>
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
                    </div>
                  )}
                </div>
              </div>

              {/* ==================== RIGHT COLUMN ==================== */}
              <div className="profile-right-col" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Hire Card */}
                <div style={{
                  background: 'white',
                  borderRadius: 16,
                  border: '1px solid rgba(26,26,26,0.06)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                  padding: 24,
                }}>
                  {/* Rate */}
                  <div style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: '#F4845F',
                    marginBottom: 4,
                    lineHeight: 1,
                  }}>
                    ${profile.hourly_rate || 25}<span style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-tertiary, #8A8A8A)' }}>/hr</span>
                  </div>

                  {/* Availability Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 999,
                    background: isAvailable ? 'rgba(16,185,129,0.08)' : 'rgba(156,163,175,0.1)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: isAvailable ? '#059669' : '#9CA3AF',
                    marginBottom: 20,
                  }}>
                    <span style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: isAvailable ? 'var(--success)' : '#9CA3AF',
                      display: 'inline-block',
                    }} />
                    {isAvailable ? 'Available' : 'Unavailable'}
                  </div>

                  {/* Hire Button */}
                  {!isAvailable ? (
                    <div style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: '#E5E7EB',
                      color: '#9CA3AF',
                      fontWeight: 600,
                      fontSize: 16,
                      borderRadius: 12,
                      border: 'none',
                      textAlign: 'center',
                    }}>
                      Currently unavailable
                    </div>
                  ) : (
                    <button
                      onClick={handleHire}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'linear-gradient(135deg, #F4845F, #E07A5F)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: 16,
                        borderRadius: 12,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 20px rgba(244,132,95,0.3)',
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
                      Hire {profile.name?.split(' ')[0] || 'this worker'}
                    </button>
                  )}

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid rgba(26,26,26,0.06)', margin: '20px 0 16px' }} />

                  {/* Compact Stats */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary, #525252)', marginBottom: 8 }}>
                    <Briefcase size={14} style={{ color: 'var(--text-tertiary, #8A8A8A)' }} />
                    {jobsDone > 0 ? (
                      <span>
                        <strong>{jobsDone}</strong> {jobsDone === 1 ? 'job' : 'jobs'} done
                        {completionRate && <span style={{ color: 'var(--text-tertiary, #8A8A8A)' }}> · {completionRate} completion</span>}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary, #8A8A8A)' }}>New to irlwork</span>
                    )}
                  </div>

                  {/* Compact Reviews Summary */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary, #525252)' }}>
                    <Star size={14} style={{ color: hasReviews ? '#F59E0B' : 'var(--text-tertiary, #8A8A8A)' }} fill={hasReviews ? '#F59E0B' : 'none'} />
                    {hasReviews ? (
                      <span>
                        <strong>{numRating.toFixed(1)}</strong> rating · {numCount} {numCount === 1 ? 'review' : 'reviews'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary, #8A8A8A)' }}>No reviews yet</span>
                    )}
                  </div>
                </div>

                {/* For Agents Accordion */}
                <ForAgentsBox human={profile} collapsible={true} />
              </div>
            </div>

            {/* Mobile Sticky Bottom Hire Bar */}
            {!isOwnProfile && isAvailable && (
              <div
                className="profile-sticky-hire"
                style={{
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  padding: '10px 20px',
                  paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderTop: '1px solid rgba(26,26,26,0.08)',
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <button
                  onClick={handleHire}
                  style={{
                    width: '100%',
                    maxWidth: 480,
                    margin: '0 auto',
                    display: 'block',
                    padding: '14px 24px',
                    background: 'linear-gradient(135deg, #F4845F, #E07A5F)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 16,
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(244,132,95,0.3)',
                  }}
                >
                  Hire {profile.name?.split(' ')[0] || 'this worker'}
                </button>
              </div>
            )}

            {/* Mobile bottom padding to prevent content hidden behind sticky bar */}
            {!isOwnProfile && isAvailable && (
              <div className="profile-sticky-hire" style={{ height: 72 }} />
            )}
          </>
        ) : null}
      </div>
    </PageLayoutV4>
  )
}

function SectionLabel({ children }) {
  return (
    <h4 style={{
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-tertiary, #8A8A8A)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      margin: '0 0 8px 0'
    }}>
      {children}
    </h4>
  )
}
