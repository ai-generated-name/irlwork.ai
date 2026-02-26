// MarketingNavbar — single source of truth for public/marketing page navbar
// Used via MarketingLayout in App.jsx for all public pages
// Uses brand-v2 Logo component and globe-icon LanguageSelector

import React from 'react'
import { Logo } from './Logo'
import LanguageSelector from './LanguageSelector'
import { useLanguage } from '../context/LanguageContext'

export default function MarketingNavbar({ user, activePage }) {
  const { t } = useLanguage()
  const navigate = (path) => { window.location.href = path }

  return (
    <nav className="navbar-v4">
      <a href="/" className="logo-v4" style={{ textDecoration: 'none' }}>
        <Logo variant="header" theme="dark" />
      </a>
      <div className="nav-links-v4">
        <a
          href="/connect-agent"
          className="nav-link-v4"
          style={activePage === 'connect-agent' ? { color: 'var(--coral-500)' } : undefined}
        >
          {t('nav.forAgents')}
        </a>
        <a
          href="/browse/tasks"
          className="nav-link-v4"
          style={activePage === 'browse' ? { color: 'var(--coral-500)' } : undefined}
        >
          {t('nav.browseTasks')}
        </a>
        <LanguageSelector variant="compact" />
        {user ? (
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/dashboard')}>{t('nav.dashboard')}</button>
        ) : (
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/auth')}>{t('nav.joinNow')}</button>
        )}
      </div>
    </nav>
  )
}
