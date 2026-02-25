// MarketingNavbar — single source of truth for public/marketing page navbar
// Used via shared layout in App.jsx for all public pages
// Matches the CSS-class-based navbar from the landing page (navbar-v4)

import React from 'react'
import { Logo } from './Logo'
import LanguageSelector from './LanguageSelector'
import { useLanguage } from '../context/LanguageContext'

export default function MarketingNavbar({ user, activePage }) {
  const navigate = (path) => { window.location.href = path }
  const { t } = useLanguage()

  return (
    <nav className="navbar-v4">
      <a href="/" className="logo-v4" style={{ textDecoration: 'none' }}>
        <Logo variant="header" theme="light" />
      </a>
      <div className="nav-links-v4">
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
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/dashboard')}>{t('nav.dashboard')}</button>
        ) : (
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/auth')}>{t('nav.joinNow')}</button>
        )}
      </div>
    </nav>
  )
}
