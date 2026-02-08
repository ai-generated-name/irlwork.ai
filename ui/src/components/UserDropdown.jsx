import { useState, useRef, useEffect } from 'react'

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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-teal-dark/50 transition-all duration-200"
      >
        <div className="w-10 h-10 rounded-full bg-teal-light flex items-center justify-center text-white font-semibold text-sm">
          {getInitials(user?.name)}
        </div>
        <div className="flex-1 text-left">
          <p className="text-white font-medium text-sm truncate">{user?.name || 'User'}</p>
          <p className="text-white/50 text-xs truncate">{user?.email || ''}</p>
        </div>
        <svg
          className={`w-4 h-4 text-white/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-xl shadow-v4-lg border border-gray-100 overflow-hidden">
          <button
            onClick={() => { onNavigate?.('profile'); setIsOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
          >
            <span>Profile</span>
          </button>
          <button
            onClick={() => { onNavigate?.('settings'); setIsOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
          >
            <span>Settings</span>
          </button>
          <div className="border-t border-gray-100" />
          <button
            onClick={() => { onLogout(); setIsOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-sm"
          >
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  )
}
