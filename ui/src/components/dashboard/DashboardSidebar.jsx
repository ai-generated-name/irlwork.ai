// Extracted from Dashboard.jsx — sidebar navigation
import React from 'react'
import { navigate as spaNavigate } from '../../utils/navigate'
import { Logo } from '../Logo'

export default function DashboardSidebar({
  navItems,
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  hiringMode,
  setHiringMode,
  setActiveTabState,
  updateTabUrl,
  agentConnected,
  user,
}) {
  return (
    <aside
      className={`dashboard-v4-sidebar ${sidebarOpen ? 'open' : ''}`}
      role="navigation"
      aria-label="Dashboard navigation"
      onKeyDown={(e) => { if (e.key === 'Escape') setSidebarOpen(false); }}
    >
      {/* Logo */}
      <a href="/" className="dashboard-v4-sidebar-logo" style={{ textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); spaNavigate('/') }}>
        <Logo variant="header" theme="light" />
      </a>



      {/* Navigation */}
      <nav className="dashboard-v4-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id)
              setSidebarOpen(false)
            }}
            className={`dashboard-v4-nav-item ${activeTab === item.id ? 'active' : ''}`}
          >
            <div className="dashboard-v4-nav-item-content">
              <span className="dashboard-v4-nav-icon">{item.icon}</span>
              <span className="dashboard-v4-nav-label">{item.label}</span>
            </div>
            {item.badge > 0 && (
              <span className="dashboard-v4-nav-badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Sidebar bottom section */}
      <div className="dashboard-v4-sidebar-bottom">
        {/* Connect Agent - Hiring mode only, before API key is created */}
        {hiringMode && !agentConnected && (
          <a
            href="/connect-agent"
            className="dashboard-v4-sidebar-bottom-item"
            onClick={() => setSidebarOpen(false)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v6M12 18v4M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M18 12h4M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />
            </svg>
            <span>Connect Agent</span>
          </a>
        )}

        {/* Mode Switch - mobile only */}
        <div className="dashboard-v4-mode-switch-mobile">
          {hiringMode ? (
            <button
              className="dashboard-v4-sidebar-bottom-item"
              onClick={() => { setHiringMode(false); setActiveTabState('dashboard'); updateTabUrl('dashboard', false); setSidebarOpen(false) }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
              </svg>
              <span>Switch to Working</span>
            </button>
          ) : (
            <button
              className="dashboard-v4-sidebar-bottom-item"
              onClick={() => { setHiringMode(true); setActiveTabState('dashboard'); updateTabUrl('dashboard', true); setSidebarOpen(false) }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span>Hire Humans</span>
            </button>
          )}
        </div>

        {/* Upgrade to Premium - hide if already on a paid plan */}
        {(!user?.subscription_tier || user.subscription_tier === 'free') && (
          <a
            href="/premium"
            className="dashboard-v4-sidebar-bottom-item dashboard-v4-sidebar-upgrade-link"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Upgrade to Premium</span>
          </a>
        )}

        {/* X / Twitter */}
        <a
          href="https://x.com/irlworkai"
          target="_blank"
          rel="noopener noreferrer"
          className="dashboard-v4-sidebar-bottom-item"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>Follow us on X</span>
        </a>
      </div>

    </aside>
  )
}
