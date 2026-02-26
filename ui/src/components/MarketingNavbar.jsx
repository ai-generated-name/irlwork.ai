// MarketingNavbar — single source of truth for public/marketing page navbar
// Used via shared layout in App.jsx for all public pages
// Consistent with NavbarV4 (V4Layout.jsx) — brand kit Logo, LanguageSelector, mobile hamburger

import React, { useState } from 'react'
import { Logo } from './Logo'
import LanguageSelector from './LanguageSelector'
import { useLanguage } from '../context/LanguageContext'

export default function MarketingNavbar({ user, activePage }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = (path) => { window.location.href = path }
  const { t } = useLanguage()

  return (
    <nav className="navbar-v4">
      <a href="/" className="logo-v4" style={{ textDecoration: 'none' }}>
        <Logo variant="header" theme="light" />
      </a>

      {/* Mobile hamburger toggle */}
      <button
        className="navbar-v4-mobile-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle navigation menu"
      >
        {mobileMenuOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      <div className={`navbar-v4-links${mobileMenuOpen ? ' open' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <a
          href="/connect-agent"
          className="nav-link-v4"
          style={activePage === 'connect-agent' ? { color: 'var(--accent-orange)' } : undefined}
        >
          {t('nav.forAgents')}
        </a>
        <a
          href="/browse/tasks"
          className="nav-link-v4"
          style={activePage === 'browse' ? { color: 'var(--accent-orange)' } : undefined}
        >
          {t('nav.browse')}
        </a>

        <LanguageSelector />

        {user ? (
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/dashboard')}>
            {t('nav.dashboard')}
          </button>
        ) : (
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/auth')}>
            {t('nav.joinNow')}
          </button>
        )}
      </div>
    </nav>
  )
}
