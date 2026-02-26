// MarketingNavbar — single source of truth for public/marketing page navbar
// Used via MarketingLayout in App.jsx for all public pages
// Matches the CSS-class-based navbar from the landing page (navbar-v4)

import React from 'react'

export default function MarketingNavbar({ user, activePage }) {
  const navigate = (path) => { window.location.href = path }

  return (
    <nav className="navbar-v4">
      <a href="/" className="logo-v4">
        <div className="logo-mark-v4">irl</div>
        <span className="logo-name-v4">irlwork.ai</span>
      </a>
      <div className="nav-links-v4">
        <a
          href="/connect-agent"
          className="nav-link-v4"
          style={activePage === 'connect-agent' ? { color: 'var(--coral-500)' } : undefined}
        >
          For Agents
        </a>
        <a
          href="/browse/tasks"
          className="nav-link-v4"
          style={activePage === 'browse' ? { color: 'var(--coral-500)' } : undefined}
        >
          Browse
        </a>
        {user ? (
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/dashboard')}>Dashboard</button>
        ) : (
          <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/auth')}>Join Now</button>
        )}
      </div>
    </nav>
  )
}
