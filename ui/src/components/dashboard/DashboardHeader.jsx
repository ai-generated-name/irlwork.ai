// Extracted from Dashboard.jsx — top header bar with mode switch, notifications, user dropdown
import React from 'react'
import { Bell } from 'lucide-react'
import { Logo } from '../Logo'
import { Icons } from '../../utils/dashboardConstants'

export default function DashboardHeader({
  hiringMode,
  setHiringMode,
  setActiveTab,
  setActiveTabState,
  updateTabUrl,
  isAdmin,
  sidebarOpen,
  setSidebarOpen,
  notifications,
  unreadNotifications,
  notificationDropdownOpen,
  setNotificationDropdownOpen,
  markAllNotificationsRead,
  navigateToNotification,
  NOTIFICATION_ICONS,
  userDropdownOpen,
  setUserDropdownOpen,
  user,
  onLogout,
  feedbackOpen,
  setFeedbackOpen,
}) {
  return (
    <div className="dashboard-v4-topbar">
      {/* Left: Mobile menu + Logo + Mode indicator */}
      <div className="dashboard-v4-topbar-left">
        <button className="dashboard-v4-menu-btn" onClick={() => setSidebarOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <a href={hiringMode ? '/dashboard/hiring' : '/dashboard/working'} className="dashboard-v4-topbar-logo" style={{ textDecoration: 'none' }}>
          <Logo variant="header" theme="light" />
        </a>
        <button
          className="dashboard-v4-mode-indicator"
          onClick={() => {
            const newMode = !hiringMode;
            setHiringMode(newMode);
            setActiveTabState('dashboard');
            updateTabUrl('dashboard', newMode);
          }}
          title={hiringMode ? 'Switch to Working mode' : 'Switch to Hiring mode'}
        >
          {hiringMode ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span className="dashboard-v4-mode-indicator-label">Hiring</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
              </svg>
              <span className="dashboard-v4-mode-indicator-label">Working</span>
            </>
          )}
        </button>
      </div>

      {/* Right: Mode switch + Notifications + User */}
      <div className="dashboard-v4-topbar-right">
        {!hiringMode ? (
          <>
            <button
              className="dashboard-v4-topbar-link dashboard-v4-topbar-cta"
              onClick={() => { setHiringMode(true); setActiveTabState('dashboard'); updateTabUrl('dashboard', true) }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              Hire Humans
            </button>
            <a href="/connect-agent" className="dashboard-v4-topbar-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              For Agents
            </a>
          </>
        ) : (
          <>
            <button
              className="dashboard-v4-topbar-link dashboard-v4-topbar-cta dashboard-v4-topbar-cta-teal"
              onClick={() => { setHiringMode(false); setActiveTabState('dashboard'); updateTabUrl('dashboard', false) }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
              </svg>
              Work on Tasks
            </button>
            <button
              className="dashboard-v4-topbar-link"
              onClick={() => setActiveTab('browse')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Browse Humans
            </button>
          </>
        )}
        {/* Admin Panel Link — only visible to admins */}
        {isAdmin && (
          <button
            className="dashboard-v4-topbar-link"
            onClick={() => setActiveTab('admin')}
            title="Admin Panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Admin
          </button>
        )}

        {/* Notifications Bell */}
        <div className="dashboard-v4-notifications-wrapper">
          <button
            className="dashboard-v4-notification-bell"
            onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadNotifications > 0 && (
              <span className="dashboard-v4-notification-badge">{unreadNotifications}</span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationDropdownOpen && (
            <div className="dashboard-v4-notification-dropdown">
              <div className="dashboard-v4-notification-dropdown-header">
                <span>Notifications</span>
                {unreadNotifications > 0 && (
                  <button onClick={markAllNotificationsRead} className="dashboard-v4-notification-mark-read">
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="dashboard-v4-notification-dropdown-list">
                {notifications.length === 0 ? (
                  <div className="dashboard-v4-notification-dropdown-empty">
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 5).map(n => (
                    <div
                      key={n.id}
                      className={`dashboard-v4-notification-dropdown-item ${!n.is_read ? 'unread' : ''}`}
                      onClick={() => navigateToNotification(n)}
                    >
                      <div className="dashboard-v4-notification-dropdown-icon">
                        {NOTIFICATION_ICONS[n.type] || <Bell size={18} />}
                      </div>
                      <div className="dashboard-v4-notification-dropdown-content">
                        <p className="dashboard-v4-notification-dropdown-title">{n.title}</p>
                        <p className="dashboard-v4-notification-dropdown-time">
                          {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.is_read && <div className="dashboard-v4-notification-dropdown-dot" />}
                    </div>
                  ))
                )}
              </div>
              <div className="dashboard-v4-notification-dropdown-footer">
                <button onClick={() => { setActiveTab('notifications'); setNotificationDropdownOpen(false); }}>
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="dashboard-v4-user-wrapper">
          <button
            className="dashboard-v4-user-trigger"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          >
            <div className="dashboard-v4-user-avatar">
              {user?.avatar_url ? (
                <img key={user.avatar_url} src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
              ) : null}
              <span style={{ display: user?.avatar_url ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                {user?.name?.charAt(0) || '?'}
              </span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={userDropdownOpen ? 'rotated' : ''}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {userDropdownOpen && (
            <div className="dashboard-v4-user-dropdown">
              <div className="dashboard-v4-user-dropdown-header">
                <div className="dashboard-v4-user-dropdown-avatar">
                  {user?.avatar_url ? (
                    <img key={user.avatar_url} src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
                  ) : null}
                  <span style={{ display: user?.avatar_url ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    {user?.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="dashboard-v4-user-dropdown-info">
                  <p className="dashboard-v4-user-dropdown-name">{user?.name || 'User'}</p>
                  <p className="dashboard-v4-user-dropdown-email">{user?.email || ''}</p>
                </div>
              </div>
              <div className="dashboard-v4-user-dropdown-divider" />
              <button className="dashboard-v4-user-dropdown-item" onClick={() => { setActiveTab('profile'); setUserDropdownOpen(false); }}>
                <span>{Icons.profile}</span> Profile
              </button>
              <button className="dashboard-v4-user-dropdown-item" onClick={() => { setActiveTab('settings'); setUserDropdownOpen(false); }}>
                <span>{Icons.settings}</span> Settings
              </button>
              <a href="/contact" className="dashboard-v4-user-dropdown-item" style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setUserDropdownOpen(false)}>
                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg></span> Contact Us
              </a>
              <button className="dashboard-v4-user-dropdown-item" onClick={() => { setFeedbackOpen(!feedbackOpen); setUserDropdownOpen(false); }}>
                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></span> Feedback
              </button>
              <div className="dashboard-v4-user-dropdown-divider" />
              <button className="dashboard-v4-user-dropdown-item danger" onClick={onLogout}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
