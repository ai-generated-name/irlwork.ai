import React from 'react'
import { MapPin, Star, Check, Globe, Clock } from 'lucide-react'
import { SocialIconsRow } from './SocialIcons'

function StarRating({ rating, count, showNewBadge = false }) {
  const numRating = parseFloat(rating) || 0
  const numCount = parseInt(count) || 0

  if (numRating === 0 && numCount === 0) {
    if (showNewBadge) {
      return (
        <span style={{
          padding: '3px 10px',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          borderRadius: 999,
          fontSize: 11,
          color: 'white',
          fontWeight: 600,
          letterSpacing: '0.03em',
          display: 'inline-block',
          marginTop: 2
        }}>
          NEW
        </span>
      )
    }
    return <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, display: 'inline-block' }}>No reviews yet</span>
  }

  const fullStars = Math.floor(numRating)
  const hasHalf = numRating - fullStars >= 0.25

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
      <div style={{ display: 'flex', gap: 1 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={13}
            fill={i <= fullStars ? '#F59E0B' : (i === fullStars + 1 && hasHalf ? '#F59E0B' : 'none')}
            stroke={i <= fullStars || (i === fullStars + 1 && hasHalf) ? '#F59E0B' : '#D1D5DB'}
            strokeWidth={1.5}
            style={{ opacity: i <= fullStars ? 1 : (i === fullStars + 1 && hasHalf ? 0.6 : 0.4) }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
        {numRating.toFixed(1)}
        {numCount > 0 && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}> ({numCount})</span>}
      </span>
    </div>
  )
}

export default function HumanProfileCard({ human, onHire, onExpand, variant = 'browse' }) {
  const skills = Array.isArray(human.skills) ? human.skills : []
  const languages = Array.isArray(human.languages) ? human.languages : []
  const maxSkills = variant === 'dashboard' ? 4 : 3

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(26,26,26,0.06)',
        padding: 24,
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative'
      }}
      onClick={() => onExpand?.(human)}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(244,132,95,0.12), 0 4px 12px rgba(0,0,0,0.06)'
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.borderColor = 'rgba(244,132,95,0.2)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = 'rgba(26,26,26,0.06)'
      }}
    >
      {/* Header: Avatar + Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        {/* Avatar */}
        {human.avatar_url ? (
          <img
            src={human.avatar_url}
            alt={human.name || ''}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(244,132,95,0.25)'
            }}
          />
        ) : (
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F4845F, #E07A5F)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: 20,
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(244,132,95,0.25)'
          }}>
            {human.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}

        {/* Name + Headline + Location + Rating */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h3 style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: 0,
              lineHeight: 1.3
            }}>
              {human.name || 'Anonymous'}
            </h3>
            {human.verified && (
              <div style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Check size={10} style={{ color: 'white' }} />
              </div>
            )}
          </div>
          {human.headline && (
            <p style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              margin: '2px 0 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3
            }}>
              {human.headline}
            </p>
          )}
          {human.city && (
            <span style={{
              fontSize: 13,
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              marginTop: 2
            }}>
              <MapPin size={12} style={{ color: '#F4845F' }} />
              {human.city}{human.state ? `, ${human.state}` : ''}
              {human.timezone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6 }}>
                  <Clock size={11} style={{ color: 'var(--text-tertiary)' }} />
                  {human.timezone.replace(/_/g, ' ').split('/').pop()}
                </span>
              )}
            </span>
          )}
          <StarRating rating={human.rating} count={human.total_ratings_count || 0} showNewBadge={true} />
        </div>
      </div>

      {/* Bio */}
      <p style={{
        fontSize: 14,
        color: 'var(--text-secondary)',
        marginBottom: 14,
        lineHeight: 1.55,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: 43,
        flex: '0 0 auto',
        margin: '0 0 14px 0'
      }}>
        {human.bio || 'No bio provided'}
      </p>

      {/* Skills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: languages.length > 0 ? 8 : 16,
        minHeight: 28
      }}>
        {skills.slice(0, maxSkills).map((skill, idx) => (
          <span
            key={idx}
            style={{
              padding: '4px 12px',
              background: 'rgba(244,132,95,0.08)',
              borderRadius: 'var(--radius-full, 999px)',
              fontSize: 12,
              color: '#E07A5F',
              fontWeight: 500,
              border: '1px solid rgba(244,132,95,0.12)'
            }}
          >
            {skill.replace(/_/g, ' ')}
          </span>
        ))}
        {skills.length > maxSkills && (
          <span style={{
            padding: '4px 10px',
            fontSize: 12,
            color: 'var(--text-tertiary)',
            fontWeight: 500
          }}>
            +{skills.length - maxSkills} more
          </span>
        )}
      </div>

      {/* Languages */}
      {languages.length > 0 && (
        <div style={{
          fontSize: 12,
          color: 'var(--text-tertiary)',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          <Globe size={12} style={{ flexShrink: 0 }} />
          {languages.join(' \u00B7 ')}
        </div>
      )}

      {/* Social Links */}
      {human.social_links && typeof human.social_links === 'object' && Object.keys(human.social_links).length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SocialIconsRow socialLinks={human.social_links} size={16} gap={8} />
        </div>
      )}

      {/* Footer: Rate + Hire Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: 16,
        borderTop: '1px solid rgba(26,26,26,0.06)'
      }}>
        <div>
          <span style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#F4845F'
          }}>
            ${human.hourly_rate || 25}
          </span>
          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-tertiary)' }}>/hr</span>
          {(human.jobs_completed > 0 || human.total_tasks_completed > 0) && (
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 12 }}>
              {human.jobs_completed || human.total_tasks_completed || 0} jobs done
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onHire?.(human)
          }}
          style={{
            padding: '10px 24px',
            background: 'linear-gradient(135deg, #F4845F, #E07A5F)',
            color: 'white',
            fontWeight: 600,
            fontSize: 14,
            borderRadius: 'var(--radius-md, 10px)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(244,132,95,0.25)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(244,132,95,0.35)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(244,132,95,0.25)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          {variant === 'dashboard' ? 'Create Task' : 'Hire'}
        </button>
      </div>
    </div>
  )
}

export { StarRating }
