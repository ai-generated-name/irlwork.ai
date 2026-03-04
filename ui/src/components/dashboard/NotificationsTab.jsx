// Extracted from Dashboard.jsx — notifications list with type icons and navigation
import React from 'react'
import { Bell } from 'lucide-react'

export default function NotificationsTab({
  notifications,
  NOTIFICATION_ICONS,
  navigateToNotification,
  markAllNotificationsRead,
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="dashboard-v4-page-title">Notifications</h1>
        {notifications.length > 0 && (
          <button onClick={markAllNotificationsRead} className="dashboard-v4-notification-mark-read" style={{ fontSize: 14 }}>
            Clear all
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="dashboard-v4-empty">
          <div className="dashboard-v4-empty-icon"><Bell size={24} /></div>
          <p className="dashboard-v4-empty-title">No notifications yet</p>
          <p className="dashboard-v4-empty-text">You'll see updates about your tasks here</p>
        </div>
      ) : (
        <div>
          {notifications.map(n => (
            <div
              key={n.id}
              className={`dashboard-v4-notification ${!n.is_read ? 'unread' : ''}`}
              onClick={() => navigateToNotification(n)}
              style={{ cursor: 'pointer' }}
            >
              <div className="dashboard-v4-notification-icon">{NOTIFICATION_ICONS[n.type] || <Bell size={18} />}</div>
              <div className="dashboard-v4-notification-content">
                <p className="dashboard-v4-notification-title">{n.title}</p>
                <p className="dashboard-v4-notification-text">{n.message}</p>
                <p className="dashboard-v4-notification-time">
                  {new Date(n.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
