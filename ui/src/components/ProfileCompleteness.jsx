import { useState, useEffect, useMemo } from 'react'
import { Camera, PenLine, Wrench, MapPin, DollarSign, Languages, Landmark } from 'lucide-react'

const PROFILE_FIELDS = [
  {
    key: 'avatar_url',
    label: 'Add a profile photo',
    icon: <Camera size={14} />,
    weight: 15,
    tab: 'profile',
    check: (u) => !!u?.avatar_url,
  },
  {
    key: 'bio',
    label: 'Write a bio',
    icon: <PenLine size={14} />,
    weight: 15,
    tab: 'profile',
    check: (u) => !!(u?.bio && u.bio.trim().length > 10),
  },
  {
    key: 'skills',
    label: 'Add your skills',
    icon: <Wrench size={14} />,
    weight: 15,
    tab: 'profile',
    check: (u) => {
      const skills = Array.isArray(u?.skills) ? u.skills : []
      return skills.length > 0
    },
  },
  {
    key: 'city',
    label: 'Set your location',
    icon: <MapPin size={14} />,
    weight: 15,
    tab: 'profile',
    check: (u) => !!(u?.city && u.city.trim()),
  },
  {
    key: 'hourly_rate',
    label: 'Set your hourly rate',
    icon: <DollarSign size={14} />,
    weight: 10,
    tab: 'profile',
    check: (u) => !!(u?.hourly_rate && u.hourly_rate > 0),
  },
  {
    key: 'languages',
    label: 'Add languages you speak',
    icon: <Languages size={14} />,
    weight: 10,
    tab: 'profile',
    check: (u) => {
      const langs = Array.isArray(u?.languages) ? u.languages : []
      return langs.length > 0
    },
  },
  {
    key: 'stripe_connected',
    label: 'Connect bank account',
    icon: <Landmark size={14} />,
    weight: 20,
    tab: 'payments',
    check: (u) => !!(u?.stripe_connected || u?.stripe_account_id),
  },
]

export default function ProfileCompleteness({ user, onNavigate }) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('irlwork_profile_nudge_dismissed') === 'true'
  })
  const [isClosing, setIsClosing] = useState(false)

  const { percentage, completed, incomplete } = useMemo(() => {
    let totalWeight = 0
    let earnedWeight = 0
    const done = []
    const missing = []

    PROFILE_FIELDS.forEach(field => {
      totalWeight += field.weight
      if (field.check(user)) {
        earnedWeight += field.weight
        done.push(field)
      } else {
        missing.push(field)
      }
    })

    return {
      percentage: totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0,
      completed: done,
      incomplete: missing,
    }
  }, [user])

  const handleDismiss = () => {
    setIsClosing(true)
    setTimeout(() => {
      localStorage.setItem('irlwork_profile_nudge_dismissed', 'true')
      setDismissed(true)
    }, 300)
  }

  // Don't render if dismissed or profile is complete
  if (dismissed || percentage >= 100) return null

  const progressColor = percentage >= 70 ? 'var(--success)' : percentage >= 40 ? 'var(--orange-500)' : 'var(--coral)'

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 20,
        opacity: isClosing ? 0 : 1,
        transform: isClosing ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'all 0.3s var(--ease-smooth)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle top accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${progressColor}, transparent)`,
        opacity: 0.6,
      }} />

      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Circular progress */}
          <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--bg-tertiary)" strokeWidth="4" />
              <circle
                cx="22" cy="22" r="18" fill="none"
                stroke={progressColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - percentage / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              />
            </svg>
            <span style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              {percentage}%
            </span>
          </div>

          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.3,
            }}>
              Complete your profile
            </h3>
            <p style={{
              fontSize: 13,
              color: 'var(--text-tertiary)',
              margin: 0,
            }}>
              {incomplete.length} item{incomplete.length !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            fontSize: 18,
            lineHeight: 1,
            borderRadius: 6,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => e.target.style.color = 'var(--text-secondary)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text-tertiary)'}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6,
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: `linear-gradient(90deg, ${progressColor}, ${progressColor}dd)`,
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
      </div>

      {/* Action chips */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        {incomplete.slice(0, 4).map(field => (
          <button
            key={field.key}
            onClick={() => onNavigate?.(field.tab)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              background: 'var(--bg-tertiary)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: 'var(--radius-full)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s var(--ease-smooth)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(232, 133, 61, 0.08)'
              e.currentTarget.style.borderColor = 'rgba(232, 133, 61, 0.2)'
              e.currentTarget.style.color = 'var(--orange-600)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)'
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.06)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>{field.icon}</span>
            {field.label}
          </button>
        ))}
      </div>
    </div>
  )
}
