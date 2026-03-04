// Extracted from Dashboard.jsx — mobile bottom navigation tabs
import React from 'react'
import { BarChart3, ClipboardList, Users, MessageCircle, Settings, Search } from 'lucide-react'

export default function MobileTabBar({
  hiringMode,
  activeTab,
  setActiveTab,
  setSidebarOpen,
  unreadMessages,
}) {
  const bottomTabs = hiringMode
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={22} /> },
        { id: 'posted', label: 'Tasks', icon: <ClipboardList size={22} /> },
        { id: 'browse', label: 'Humans', icon: <Users size={22} /> },
        { id: 'messages', label: 'Messages', icon: <MessageCircle size={22} />, badge: unreadMessages },
        { id: 'settings', label: 'Settings', icon: <Settings size={22} /> },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={22} /> },
        { id: 'tasks', label: 'Tasks', icon: <ClipboardList size={22} /> },
        { id: 'browse', label: 'Browse', icon: <Search size={22} /> },
        { id: 'messages', label: 'Messages', icon: <MessageCircle size={22} />, badge: unreadMessages },
        { id: 'settings', label: 'Settings', icon: <Settings size={22} /> },
      ]

  return (
    <nav className="dashboard-v4-bottom-tabs">
      {bottomTabs.map(tab => (
        <button
          key={tab.id}
          className={`dashboard-v4-bottom-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
        >
          <span className="dashboard-v4-bottom-tab-icon">{tab.icon}</span>
          <span className="dashboard-v4-bottom-tab-label">{tab.label}</span>
          {tab.badge > 0 && <span className="dashboard-v4-bottom-tab-badge">{tab.badge > 9 ? '9+' : tab.badge}</span>}
        </button>
      ))}
    </nav>
  )
}
