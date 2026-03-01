// Extracted from Dashboard.jsx — messaging interface with conversation list and message thread
import React from 'react'
import { MessageCircle } from 'lucide-react'

export default function MessagesTab({
  user,
  conversations,
  selectedConversation, setSelectedConversation,
  messages,
  newMessage, setNewMessage,
  messagesLoading,
  conversationsLoading,
  conversationsError,
  messagesError,
  sendingMessage,
  fetchMessages,
  sendMessage,
  fetchConversations,
  hiringMode,
}) {
  // Helper: resolve the "other" party in a conversation
  const getOtherParty = (c) => {
    if (!c || !user) return { name: 'Unknown', avatar_url: null }
    if (c.human_id === user.id) return c.agent || { name: 'Unknown Agent', avatar_url: null }
    return c.human || { name: 'Unknown Human', avatar_url: null }
  }
  // Helper: online status from last_active_at (#8)
  const getOnlineStatus = (party) => {
    if (!party?.last_active_at) return { status: 'offline', label: 'Offline' }
    const diff = Date.now() - new Date(party.last_active_at).getTime()
    if (diff < 5 * 60 * 1000) return { status: 'online', label: 'Online', color: '#22C55E' }
    if (diff < 30 * 60 * 1000) return { status: 'idle', label: 'Away', color: '#FEBC2E' }
    return { status: 'offline', label: 'Offline', color: '#9CA3AF' }
  }
  // Helper: relative time
  const timeAgo = (dateStr) => {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d`
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const activeConv = conversations.find(c => c.id === selectedConversation)
  const activeOther = activeConv ? getOtherParty(activeConv) : null
  const activeOnline = activeOther ? getOnlineStatus(activeOther) : null

  return (
    <div>
      <h1 className="dashboard-v4-page-title">Messages</h1>

      <div className="dashboard-v4-messages">
        {/* Conversations List */}
        <div className={`dashboard-v4-conversations ${selectedConversation ? 'msg-hide-mobile' : ''}`} style={{ overflowY: 'auto' }}>
          {conversationsLoading && conversations.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="msg-spinner" />
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 12 }}>Loading conversations...</p>
            </div>
          ) : conversationsError && conversations.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
              <p style={{ fontWeight: 500, marginBottom: 8, color: 'var(--text-secondary)' }}>{conversationsError}</p>
              <button onClick={fetchConversations} className="v4-btn v4-btn-secondary" style={{ fontSize: 13 }}>Retry</button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="mobile-empty-state" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <div className="mobile-empty-state-icon" style={{ width: 48, height: 48, background: 'var(--bg-tertiary)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <MessageCircle size={24} />
              </div>
              <p style={{ fontWeight: 600, marginBottom: 6, fontSize: 18, color: 'var(--text-primary)' }}>No conversations yet</p>
              <p style={{ fontSize: 14, maxWidth: 280, margin: '0 auto', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {hiringMode
                  ? 'Messages will appear here once you hire a human for a task.'
                  : 'Messages will appear here when you apply for or start working on a task.'}
              </p>
            </div>
          ) : (
            conversations.map(c => {
              const other = getOtherParty(c)
              const online = getOnlineStatus(other)
              return (
              <div
                key={c.id}
                className={`dashboard-v4-conversation-item ${selectedConversation === c.id ? 'active' : ''}`}
                onClick={() => { setSelectedConversation(c.id); fetchMessages(c.id) }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {other.avatar_url ? (
                    <img src={other.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 15 }}>
                      {other.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  {/* Online status dot (#8) */}
                  <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: online.color, border: '2px solid white' }} title={online.label} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <p style={{ fontWeight: c.unread > 0 ? 700 : 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 14, margin: 0 }}>{other.name}</p>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{timeAgo(c.updated_at)}</span>
                  </div>
                  {c.task && (
                    <p style={{ fontSize: 12, color: 'var(--orange-600)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '0 0 2px 0' }}>
                      {c.task.title}
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: c.unread > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)', fontWeight: c.unread > 0 ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{c.last_message || 'No messages yet'}</p>
                </div>
                {c.unread > 0 && (
                  <span style={{ background: 'var(--orange-600)', color: 'white', borderRadius: '50%', minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, padding: '0 5px' }}>
                    {c.unread}
                  </span>
                )}
              </div>
            )})
          )}
        </div>

        {/* Messages Thread */}
        <div className={`dashboard-v4-message-thread ${selectedConversation ? '' : 'msg-hide-mobile'}`}>
          {selectedConversation && activeConv ? (
            <>
              {/* Thread Header: back button + other party + task link + online status */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12, background: 'white', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
                <button onClick={() => setSelectedConversation(null)} className="msg-back-btn" style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-secondary)' }}>
                  ←
                </button>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {activeOther?.avatar_url ? (
                    <img src={activeOther.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 13 }}>
                      {activeOther?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <span style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: activeOnline?.color || '#9CA3AF', border: '2px solid white' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{activeOther?.name}</p>
                    <span style={{ fontSize: 11, color: activeOnline?.color || '#9CA3AF' }}>{activeOnline?.label}</span>
                  </div>
                  {activeConv.task && (
                    <a
                      href={`/tasks/${activeConv.task.id}`}
                      style={{ fontSize: 12, color: 'var(--orange-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={(e) => { e.stopPropagation() }}
                    >
                      {activeConv.task.title} →
                    </a>
                  )}
                </div>
                {activeConv.task && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--orange-600)', background: 'rgba(224,122,95,0.1)', padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>
                    ${activeConv.task.budget}
                  </span>
                )}
              </div>

              {/* Messages */}
              <div className="dashboard-v4-message-list" ref={el => { if (el) el.scrollTop = el.scrollHeight }}>
                {messagesLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                    <div className="msg-spinner" />
                    <p style={{ color: 'var(--text-tertiary)', fontSize: 13, margin: 0 }}>Loading messages...</p>
                  </div>
                ) : messagesError ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                    <span style={{ fontSize: 24 }}>⚠️</span>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>{messagesError}</p>
                    <button onClick={() => fetchMessages(selectedConversation)} className="v4-btn v4-btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}>Retry</button>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: 14 }}>
                    No messages yet — send one to start the conversation
                  </div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`dashboard-v4-message ${m.sender_id === user.id ? 'sent' : 'received'}`}>
                      {m.sender_id !== user.id && m.sender?.name && (
                        <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, opacity: 0.7 }}>{m.sender.name}</p>
                      )}
                      <p style={{ margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</p>
                      <p style={{ fontSize: 11, marginTop: 4, opacity: 0.6, margin: 0 }}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="dashboard-v4-message-input" style={{ alignItems: 'flex-end' }}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="dashboard-v4-form-input"
                  style={{ flex: 1, resize: 'none', minHeight: 40, maxHeight: 120, overflow: 'auto', lineHeight: '1.4' }}
                  rows={1}
                  disabled={sendingMessage}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
                  onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
                />
                <button className="v4-btn v4-btn-primary" onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()} style={{ minHeight: 40 }}>
                  {sendingMessage ? '...' : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', gap: 8 }}>
              <MessageCircle size={28} />
              <p style={{ margin: 0 }}>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
