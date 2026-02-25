import { useState, useRef, useEffect } from 'react'
import TierBadge from './TierBadge'

export default function UserDropdown({ user, onLogout, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="user-dropdown-v4" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`user-dropdown-v4-trigger w-full ${isOpen ? 'open' : ''}`}
      >
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name || 'User'}
            className="user-dropdown-v4-avatar"
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        <div className="user-dropdown-v4-avatar" style={{ display: user?.avatar_url ? 'none' : 'flex' }}>
          {getInitials(user?.name)}
        </div>
        <div className="user-dropdown-v4-info flex-1">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p className="user-dropdown-v4-name truncate" style={{ margin: 0 }}>{user?.name || 'User'}</p>
            <TierBadge tier={user?.subscription_tier} size="xs" />
          </div>
          <p className="user-dropdown-v4-email truncate">{user?.email || ''}</p>
        </div>
        <svg
          className="user-dropdown-v4-chevron w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="user-dropdown-v4-menu">
          <button
            onClick={() => { onNavigate?.('profile'); setIsOpen(false) }}
            className="user-dropdown-v4-menu-item"
          >
            <span>Profile</span>
          </button>
          <button
            onClick={() => { onNavigate?.('settings'); setIsOpen(false) }}
            className="user-dropdown-v4-menu-item"
          >
            <span>Settings</span>
          </button>
          <div className="user-dropdown-v4-divider" />
          <button
            onClick={() => { onLogout(); setIsOpen(false) }}
            className="user-dropdown-v4-menu-item danger"
          >
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  )
}
