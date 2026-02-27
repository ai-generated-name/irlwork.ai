// MarketingNavbar — single source of truth for public/marketing page navbar
// Used via MarketingLayout in App.jsx for all public pages
// Uses brand-v2 Logo component and globe-icon LanguageSelector

import React, { useState, useEffect } from 'react'
import { Logo } from './Logo'
import LanguageSelector from './LanguageSelector'
import { useLanguage } from '../context/LanguageContext'

export default function MarketingNavbar({ user, activePage }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useLanguage()
  const navigate = (path) => { window.location.href = path }

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('mobile-nav-open')
    } else {
      document.body.classList.remove('mobile-nav-open')
    }
    return () => document.body.classList.remove('mobile-nav-open')
  }, [mobileMenuOpen])

  return (
    <nav className="navbar-v4">
      <a href="/" className="logo-v4" style={{ textDecoration: 'none' }}>
        <Logo variant="header" theme="light" />
      </a>

      {/* Right side: language selector + hamburger (mobile) */}
      <div className="navbar-v4-mobile-right">
        <LanguageSelector variant="compact" />
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
      </div>

      <div className={`navbar-v4-links${mobileMenuOpen ? ' open' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <a
          href="/connect-agent"
          className="nav-link-v4"
          onClick={() => setMobileMenuOpen(false)}
          style={activePage === 'connect-agent' ? { color: 'var(--accent-orange)' } : undefined}
        >
          {t('nav.forAgents')}
        </a>
        <a
          href="/browse/tasks"
          className="nav-link-v4"
          onClick={() => setMobileMenuOpen(false)}
          style={activePage === 'browse' ? { color: 'var(--accent-orange)' } : undefined}
        >
          {t('nav.browseTasks')}
        </a>
        {/* Language selector shown inline on desktop, hidden on mobile (shown in header bar instead) */}
        <span className="navbar-v4-lang-desktop">
          <LanguageSelector variant="compact" />
        </span>
        {user ? (
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => { setMobileMenuOpen(false); navigate('/dashboard') }}>{t('nav.dashboard')}</button>
        ) : (
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => { setMobileMenuOpen(false); navigate('/auth') }}>{t('nav.joinNow')}</button>
        )}
      </div>
    </nav>
  )
}
