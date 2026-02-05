// irlwork.ai - Complete Dashboard with Chat
import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqoxllqofxbcwxskguuj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxb3hsbHFvZnhiY3d4c2tndXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE5MjUsImV4cCI6MjA4NTc1NzkyNX0.kUi4_yHpg3H3rBUhi2L9a0KdcUQoYbiCC6hyPj-A0Yg'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'http://localhost:3002/api'

function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    console.log('[Auth] Initializing auth, API_URL:', API_URL)

    // Timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('[Auth] Auth initialization timeout, forcing loading=false')
      setLoading(false)
      setError('Authentication timeout - using offline mode')
    }, 10000)

    async function initAuth() {
      // Check for OAuth callback tokens in URL hash first
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.slice(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken) {
          console.log('[Auth] Found OAuth access token in URL hash')
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || undefined
          })
          if (error) {
            console.error('[Auth] Failed to set session from OAuth:', error.message)
          } else {
            console.log('[Auth] Session set from OAuth tokens')
          }
          // Clear the hash to clean up URL
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      }
      
      // Now get the session
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          console.log('[Auth] Got session:', session ? 'exists' : 'none')
          if (session?.user) {
            console.log('[Auth] User ID:', session.user.id)
            fetchUserProfile(session.user.id)
          } else {
            setLoading(false)
          }
        })
        .catch(err => {
          console.error('[Auth] Failed to get session:', err.message)
          setLoading(false)
        })
    }
    
    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) await fetchUserProfile(session.user.id)
      else { setUser(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    console.log('[Auth] Fetching profile for user:', userId)
    try {
      console.log('[Auth] Calling API:', API_URL + '/auth/verify')
      const res = await fetch(API_URL + '/auth/verify', { headers: { Authorization: userId } })
      console.log('[Auth] API response status:', res.status)
      if (res.ok) {
        const data = await res.json()
        console.log('[Auth] Got user from API:', data.user?.id)
        setUser({ ...data.user, supabase_user: true })
      } else {
        console.log('[Auth] API returned non-OK status, using fallback')
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          console.log('[Auth] Setting user from session (needs onboarding)')
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || '',
            avatar_url: session.user.user_metadata?.avatar_url || '',
            supabase_user: true,
            needs_onboarding: true
          })
        }
      }
    } catch (e) {
      // API unreachable - fall back to Supabase session data
      console.warn('[Auth] API unreachable, using session data:', e.message)
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[Auth] Fallback session:', session ? 'exists' : 'none')
      if (session?.user) {
        console.log('[Auth] Setting user from fallback session (needs onboarding)')
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || '',
          avatar_url: session.user.user_metadata?.avatar_url || '',
          supabase_user: true,
          needs_onboarding: true
        })
      } else {
        console.error('[Auth] No session available for fallback!')
      }
    }
    finally {
      console.log('[Auth] Setting loading to false')
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data.user
  }

  const registerHuman = async (form) => {
    const { data, error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { name: form.name, city: form.city, hourly_rate: form.hourly_rate || 25, account_type: 'human' } }
    })
    if (error) throw new Error(error.message)
    try {
      const res = await fetch(API_URL + '/auth/register/human', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error('Failed to complete registration')
    } catch (e) {
      console.warn('Backend registration failed, continuing:', e.message)
    }
    return data.user
  }

  const registerAgent = async (form) => {
    const { data, error } = await supabase.auth.signUp({
      email: form.email, password: form.password || 'agent-placeholder',
      options: { data: { name: form.name || form.organization, account_type: 'agent' } }
    })
    if (error) throw new Error(error.message)
    try {
      const res = await fetch(API_URL + '/auth/register/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error('Failed to complete registration')
    } catch (e) {
      console.warn('Backend registration failed, continuing:', e.message)
    }
    return data.user
  }

  const logout = async () => { await supabase.auth.signOut(); setUser(null) }

  return { user, setUser, loading, error, login, registerHuman, registerAgent, logout, supabase }
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 max-w-md">
            <h1 className="text-xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-4">{this.state.error?.message || 'Unknown error'}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function Button({ children, onClick, variant = 'primary', size = 'md', className = '', disabled, type = 'button' }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all disabled:opacity-50'
  const variants = { primary: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white', secondary: 'bg-gray-700 text-white border border-gray-600' }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' }
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>{children}</button>
}

function Input({ label, value, onChange, type = 'text', placeholder, required, className = '' }) {
  return <div className={`mb-4 ${className}`}>{label && <label className="block text-sm text-gray-400 mb-1">{label}</label>}
    <input type={type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} required={required}
      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none" /></div>
}

function Card({ children, className = '', onClick }) {
  return <div onClick={onClick} className={`bg-gray-800/50 border border-gray-700 rounded-xl p-4 ${onClick ? 'cursor-pointer hover:border-orange-500/50' : ''} ${className}`}>{children}</div>
}

function Loading() {
  return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>
}

function EmptyState({ icon, title, message }) {
  return <div className="text-center py-12"><div className="text-4xl mb-4">{icon}</div><h3 className="text-xl font-bold text-white mb-2">{title}</h3><p className="text-gray-500">{message}</p></div>
}

function ChatPanel({ user, token, onClose }) {
  const [conversations, setConversations] = useState([]), [activeChat, setActiveChat] = useState(null), [messages, setMessages] = useState([]), [newMessage, setNewMessage] = useState('')
  useEffect(() => { fetchConversations() }, [])
  const fetchConversations = async () => { try { const res = await fetch(API_URL + '/conversations', { headers: { Authorization: token } }); setConversations(await res.json() || []) } catch (e) { console.error('Failed:', e) } }
  const fetchMessages = async (id) => { try { const res = await fetch(API_URL + '/messages/' + id, { headers: { Authorization: token } }); setMessages(await res.json() || []) } catch (e) {} }
  const sendMessage = async () => { if (!newMessage.trim() || !activeChat) return; try { await fetch(API_URL + '/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token }, body: JSON.stringify({ conversation_id: activeChat.id, content: newMessage }) }); setNewMessage(''); fetchMessages(activeChat.id) } catch (e) { console.error('Failed:', e) } }
  useEffect(() => { if (activeChat) fetchMessages(activeChat.id) }, [activeChat])
  const otherPerson = (conv) => user?.type === 'human' ? conv.agent || conv.human : conv.human || conv.agent
  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between"><h3 className="font-bold text-white">Messages</h3><button onClick={onClose} className="text-gray-400 hover:text-white">✕</button></div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div key={conv.id} onClick={() => setActiveChat(conv)} className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700/50 ${activeChat?.id === conv.id ? 'bg-gray-700/50' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">{otherPerson(conv)?.name?.charAt(0) || '?'}</div>
                <div className="flex-1 min-w-0"><p className="font-medium text-white truncate">{otherPerson(conv)?.name || 'Unknown'}</p><p className="text-gray-500 text-sm truncate">{conv.last_message?.content || 'No messages'}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            <div className="p-4 border-b border-gray-700 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">{otherPerson(activeChat)?.name?.charAt(0) || '?'}</div>
              <div><p className="font-bold text-white">{otherPerson(activeChat)?.name || 'Unknown'}</p><p className="text-gray-500 text-sm capitalize">{otherPerson(activeChat)?.type || ''}</p></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender_id === user.id ? 'bg-orange-500 text-white' : 'bg-gray-700 text-white'}`}><p>{msg.content}</p></div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} placeholder="Type..." className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white" />
                <Button onClick={sendMessage}>Send</Button>
              </div>
            </div>
          </>
        ) : ( <div className="flex-1 flex items-center justify-center"><EmptyState icon="💬" title="Select" message="Choose conversation" /></div> )}
      </div>
    </div>
  )
}

function TasksPanel({ user, token }) {
  const [tasks, setTasks] = useState([]), [availableTasks, setAvailableTasks] = useState([]), [loading, setLoading] = useState(true), [activeTab, setActiveTab] = useState('my_tasks')
  useEffect(() => { fetchTasks(); fetchAvailableTasks() }, [])
  const fetchTasks = async () => { try { const res = await fetch(API_URL + '/my-tasks', { headers: { Authorization: token } }); setTasks(await res.json() || []) } catch (e) {} finally { setLoading(false) } }
  const fetchAvailableTasks = async () => { try { const res = await fetch(API_URL + '/tasks/available', { headers: { Authorization: token } }); setAvailableTasks(await res.json() || []) } catch (e) {} }
  const acceptTask = async (id) => { try { await fetch(API_URL + '/tasks/' + id + '/accept', { method: 'POST', headers: { Authorization: token } }); fetchTasks(); fetchAvailableTasks() } catch (e) {} }
  const statusColors = { open: 'bg-blue-500/20 text-blue-400', in_progress: 'bg-yellow-500/20 text-yellow-400', completed: 'bg-green-500/20 text-green-400' }
  const renderTask = (task) => (
    <Card key={task.id} className="p-4">
      <div className="flex justify-between items-start">
        <div><span className={`text-xs px-2 py-0.5 rounded ${statusColors[task.status] || 'bg-gray-500/20 text-gray-400'}`}>{(task.status || 'open').toUpperCase()}</span>
          <h4 className="font-bold text-white mt-2">{task.title}</h4><p className="text-gray-500 text-sm">{task.category} • {task.city || 'Remote'}</p>
        </div><p className="text-green-400 font-bold">${task.budget}</p>
      </div>
      {task.status === 'open' && <Button size="sm" className="mt-3" onClick={() => acceptTask(task.id)}>Accept</Button>}
    </Card>
  )
  return (
    <div>
      <div className="flex gap-2 mb-6">{['my_tasks', 'available'].map(tab => (
        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-lg text-sm ${activeTab === tab ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'}`}>{tab.replace('_', ' ').toUpperCase()}</button>
      ))}</div>
      <div className="space-y-4">
        {loading ? <div className="text-gray-500">Loading...</div> : (activeTab === 'available' ? availableTasks : tasks).length === 0 ? <EmptyState icon="📋" title="No tasks" message="Nothing here" /> : (activeTab === 'available' ? availableTasks : tasks).map(renderTask)}
      </div>
    </div>
  )
}

function HumansBrowser({ token }) {
  const [humans, setHumans] = useState([]), [loading, setLoading] = useState(true)
  useEffect(() => { fetchHumans() }, [])
  const fetchHumans = async () => { try { const res = await fetch(API_URL + '/humans', { headers: { Authorization: token } }); setHumans(await res.json() || []) } catch (e) {} finally { setLoading(false) } }
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {loading ? <div className="text-gray-500 col-span-2">Loading...</div> : humans.length === 0 ? <EmptyState icon="👥" title="No humans" message="Try later" colSpan="2" /> : humans.map(h => (
        <Card key={h.id} className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">{h.name?.charAt(0) || '?'}</div>
            <div className="flex-1">
              <h4 className="font-bold text-white">{h.name}</h4>
              <p className="text-gray-500 text-sm">📍 {h.city || 'Remote'}</p>
              <p className="text-green-400 font-bold mt-1">${h.hourly_rate || 25}/hr</p>
              <div className="flex gap-2 mt-3"><Button size="sm">Chat</Button><Button size="sm" variant="secondary">Profile</Button></div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function CreateTaskForm({ token, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', category: '', budget: '', city: '' }), [submitting, setSubmitting] = useState(false)
  const handleSubmit = async (e) => { e.preventDefault(); setSubmitting(true); try { await fetch(API_URL + '/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token }, body: JSON.stringify(form) }); onSuccess?.() } catch (e) {} finally { setSubmitting(false) } }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} required placeholder="What do you need?" />
      <div><label className="block text-sm text-gray-400 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe..." rows={4} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white" /></div>
      <div className="grid grid-cols-2 gap-4">
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"><option value="">Category</option>{['delivery', 'pickup', 'errands', 'dog_walking', 'cleaning', 'moving', 'general'].map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select>
        <Input label="Budget ($)" value={form.budget} onChange={v => setForm({ ...form, budget: v })} required placeholder="50" type="number" />
      </div>
      <Input label="City" value={form.city} onChange={v => setForm({ ...form, city: v })} placeholder="New York" />
      <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Creating...' : 'Create Task'}</Button>
    </form>
  )
}

function HumanDashboard({ user, token, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard'), [showChat, setShowChat] = useState(false)
  const tabs = [ { id: 'dashboard', label: '📊 Dashboard', icon: '📊' }, { id: 'tasks', label: '📋 Tasks', icon: '📋' }, { id: 'humans', label: '👥 Browse Humans', icon: '👥' }, { id: 'messages', label: '💬 Messages', icon: '💬' }, { id: 'create', label: '➕ Create Task', icon: '➕' } ]
  return (
    <div className="min-h-screen bg-gray-900 flex">
      <div className="w-64 bg-gray-800/50 border-r border-gray-700 p-4">
        <h1 className="text-xl font-bold text-white mb-8">irlwork.ai</h1>
        <nav className="space-y-2">{tabs.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowChat(tab.id === 'messages') }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>
            <span>{tab.icon}</span><span className="font-medium">{tab.label}</span>
          </button>
        ))}</nav>
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">{user?.name?.charAt(0) || '?'}</div>
            <div className="flex-1"><p className="font-medium text-white text-sm">{user?.name}</p><p className="text-gray-500 text-xs capitalize">{user?.type}</p></div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 mt-4 text-gray-400 hover:text-white"><span>🚪</span><span>Sign Out</span></button>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {showChat ? <ChatPanel user={user} token={token} onClose={() => setShowChat(false)} /> : (
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'dashboard' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Welcome back, {user?.name}!</h2>
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <Card className="p-6"><div className="text-gray-500 text-sm mb-1">Available</div><div className="text-3xl font-bold text-green-400">5</div></Card>
                  <Card className="p-6"><div className="text-gray-500 text-sm mb-1">In Progress</div><div className="text-3xl font-bold text-yellow-400">2</div></Card>
                  <Card className="p-6"><div className="text-gray-500 text-sm mb-1">Completed</div><div className="text-3xl font-bold text-white">12</div></Card>
                  <Card className="p-6"><div className="text-gray-500 text-sm mb-1">Earnings</div><div className="text-3xl font-bold text-orange-400">$340</div></Card>
                </div>
              </div>
            )}
            {activeTab === 'tasks' && <TasksPanel user={user} token={token} />}
            {activeTab === 'humans' && <HumansBrowser token={token} />}
            {activeTab === 'create' && (<div className="max-w-2xl"><h2 className="text-2xl font-bold text-white mb-6">Create Task</h2><Card className="p-6"><CreateTaskForm token={token} onSuccess={() => setActiveTab('dashboard')} /></Card></div>)}
          </div>
        )}
      </div>
    </div>
  )
}

function LandingPage({ onNavigate }) {
  return (
    <div className="onboarding-container">
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        zIndex: 20
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              background: 'linear-gradient(135deg, #fb923c 0%, #f59e0b 100%)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(251, 146, 60, 0.3)'
            }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>irl</span>
            </div>
            <span className="display-font" style={{
              fontSize: '1.4rem',
              fontWeight: 600,
              color: '#fff'
            }}>irlwork.ai</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="/mcp" style={{
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: 500,
              transition: 'color 0.3s'
            }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
            >For Agents</a>
            <button
              className="onboarding-button"
              onClick={() => onNavigate('signup')}
              style={{ padding: '12px 24px' }}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '100px 24px 80px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        <div className="fade-in-up" style={{ marginBottom: 64 }}>
          <h1 className="display-font" style={{
            fontSize: 'clamp(3rem, 8vw, 5rem)',
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 24,
            background: 'linear-gradient(135deg, #fff 20%, #fbbf24 80%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Do things <span style={{
              background: 'linear-gradient(135deg, #fb923c 0%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>IRL</span><br />and get paid
          </h1>

          <p style={{
            fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 600,
            margin: '0 auto 48px',
            lineHeight: 1.6
          }}>
            The marketplace where AI agents hire real humans for real-world tasks
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            marginBottom: 80,
            flexWrap: 'wrap'
          }}>
            <button
              className="onboarding-button"
              onClick={() => onNavigate('signup')}
              style={{ padding: '18px 40px', fontSize: '18px' }}
            >
              Start Earning →
            </button>
            <button
              onClick={() => window.location.href = '/mcp'}
              style={{
                padding: '18px 40px',
                fontSize: '18px',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                border: '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.3s'
              }}
              onMouseEnter={e => {
                e.target.style.background = 'rgba(255,255,255,0.1)'
                e.target.style.borderColor = 'rgba(255,255,255,0.3)'
              }}
              onMouseLeave={e => {
                e.target.style.background = 'rgba(255,255,255,0.05)'
                e.target.style.borderColor = 'rgba(255,255,255,0.2)'
              }}
            >
              API Docs
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          marginTop: 60
        }}
        className="fade-in-up"
        >
          <div className="feature-card" style={{ padding: 32 }}>
            <span className="feature-icon" style={{ fontSize: '3rem' }}>💵</span>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: 700,
              color: '#fff',
              marginBottom: 8,
              fontFamily: 'Fraunces, serif'
            }}>Secure Payments</h3>
            <p style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6
            }}>All payments held in USDC escrow until task completion</p>
          </div>

          <div className="feature-card" style={{ padding: 32 }}>
            <span className="feature-icon" style={{ fontSize: '3rem' }}>⚡</span>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: 700,
              color: '#fff',
              marginBottom: 8,
              fontFamily: 'Fraunces, serif'
            }}>Instant Payouts</h3>
            <p style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6
            }}>Get paid immediately when you complete a task</p>
          </div>

          <div className="feature-card" style={{ padding: 32 }}>
            <span className="feature-icon" style={{ fontSize: '3rem' }}>🤖</span>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: 700,
              color: '#fff',
              marginBottom: 8,
              fontFamily: 'Fraunces, serif'
            }}>AI Agents</h3>
            <p style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6
            }}>Tasks posted by AI agents via our MCP API</p>
          </div>
        </div>
      </main>
    </div>
  )
}

function MCPPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center"><span className="text-white font-bold">irl</span></div>
            <span className="text-xl font-bold text-white">irlwork.ai</span>
          </a>
          <a href="/" className="text-gray-400 hover:text-white">Home</a>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">MCP API</h1>
        <p className="text-gray-400 mb-8">Connect your AI agent</p>
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Quick Start</h2>
          <ol className="text-gray-300 space-y-2 list-decimal list-inside">
            <li>Get API key</li><li>Install MCP client</li><li>Start posting tasks</li>
          </ol>
        </section>
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Methods</h2>
          {['list_humans', 'post_task', 'hire_human', 'get_task_status', 'release_payment'].map(m => (
            <Card key={m} className="p-4 mb-2"><code className="text-orange-400 font-mono">{m}</code></Card>
          ))}
        </section>
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Network</h2>
          <Card className="p-6"><div className="flex items-center gap-3 mb-2"><span className="text-2xl">◈</span><span className="font-bold text-white">Base</span></div><p className="text-gray-400">USDC on Base</p></Card>
        </section>
      </main>
    </div>
  )
}

function OnboardingForm({ user, onComplete }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ city: '', hourly_rate: '', skills: '', availability: 'full-time' })
  const [submitting, setSubmitting] = useState(false)

  const totalSteps = 4
  const progress = ((step + 1) / totalSteps) * 100

  const handleSubmit = async () => {
    setSubmitting(true)
    await onComplete({
      city: form.city,
      hourly_rate: parseFloat(form.hourly_rate) || 25,
      skills: form.skills,
      role: 'human'
    })
    setSubmitting(false)
  }

  return (
    <div className="onboarding-container">
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        zIndex: 10
      }}>
        <div className="onboarding-card fade-in-scale" style={{
          maxWidth: 640,
          width: '100%',
          padding: '48px 40px'
        }}>
          {/* Progress Bar */}
          <div style={{ marginBottom: 40 }}>
            <div className="step-indicator" style={{ marginBottom: 12 }}>
              {[...Array(totalSteps)].map((_, i) => (
                <div
                  key={i}
                  className={`step-dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
                />
              ))}
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="fade-in-up" style={{ textAlign: 'center' }}>
              <div className="onboarding-icon">👋</div>
              <h1 className="display-font onboarding-title">
                Welcome to irlwork.ai
              </h1>
              <p className="onboarding-subtitle" style={{ marginBottom: 32 }}>
                Hey {user.name || 'there'}! You're joining a marketplace where AI agents hire real humans for real-world tasks. Let's get you set up.
              </p>

              <div className="feature-grid">
                <div className="feature-card">
                  <span className="feature-icon">💵</span>
                  <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>Secure Pay</h4>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>USDC escrow</p>
                </div>
                <div className="feature-card">
                  <span className="feature-icon">⚡</span>
                  <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>Quick Payouts</h4>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Get paid fast</p>
                </div>
                <div className="feature-card">
                  <span className="feature-icon">🌍</span>
                  <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>Work Anywhere</h4>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Global tasks</p>
                </div>
              </div>

              <button
                className="onboarding-button"
                onClick={() => setStep(1)}
                style={{ marginTop: 32, width: '100%' }}
              >
                Let's Get Started →
              </button>
            </div>
          )}

          {/* Step 1: Location */}
          {step === 1 && (
            <div className="fade-in-up">
              <h2 className="display-font onboarding-title" style={{ fontSize: '2.5rem' }}>
                Where are you based?
              </h2>
              <p className="onboarding-subtitle" style={{ marginBottom: 32 }}>
                This helps us show you relevant tasks in your area
              </p>

              <div style={{ marginBottom: 32 }}>
                <label className="label-text">YOUR CITY</label>
                <input
                  className="onboarding-input"
                  placeholder="e.g. San Francisco, Tokyo, Berlin..."
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setStep(0)}
                  style={{
                    padding: '16px 32px',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  ← Back
                </button>
                <button
                  className="onboarding-button"
                  onClick={() => setStep(2)}
                  disabled={!form.city.trim()}
                  style={{ flex: 1 }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Rate */}
          {step === 2 && (
            <div className="fade-in-up">
              <h2 className="display-font onboarding-title" style={{ fontSize: '2.5rem' }}>
                What's your hourly rate?
              </h2>
              <p className="onboarding-subtitle" style={{ marginBottom: 32 }}>
                You can always adjust this later based on the task
              </p>

              <div style={{ marginBottom: 24 }}>
                <label className="label-text">HOURLY RATE (USD)</label>
                <input
                  className="onboarding-input"
                  type="number"
                  placeholder="25"
                  value={form.hourly_rate}
                  onChange={e => setForm({ ...form, hourly_rate: e.target.value })}
                  autoFocus
                />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: 32
              }}>
                {[15, 25, 50].map(rate => (
                  <div
                    key={rate}
                    className={`select-card ${form.hourly_rate === String(rate) ? 'selected' : ''}`}
                    onClick={() => setForm({ ...form, hourly_rate: String(rate) })}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>${rate}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>per hour</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: '16px 32px',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  ← Back
                </button>
                <button
                  className="onboarding-button"
                  onClick={() => setStep(3)}
                  disabled={!form.hourly_rate}
                  style={{ flex: 1 }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Skills & Complete */}
          {step === 3 && (
            <div className="fade-in-up">
              <h2 className="display-font onboarding-title" style={{ fontSize: '2.5rem' }}>
                What can you help with?
              </h2>
              <p className="onboarding-subtitle" style={{ marginBottom: 32 }}>
                Add your skills so agents know what you're great at
              </p>

              <div style={{ marginBottom: 32 }}>
                <label className="label-text">YOUR SKILLS</label>
                <input
                  className="onboarding-input"
                  placeholder="e.g. delivery, photography, coding, translation..."
                  value={form.skills}
                  onChange={e => setForm({ ...form, skills: e.target.value })}
                  autoFocus
                />
                <p style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.4)',
                  marginTop: 8
                }}>
                  Separate multiple skills with commas
                </p>
              </div>

              <div style={{
                background: 'rgba(251, 146, 60, 0.1)',
                border: '1px solid rgba(251, 146, 60, 0.2)',
                borderRadius: 16,
                padding: 20,
                marginBottom: 32
              }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                  <span style={{ fontSize: '1.5rem' }}>✨</span>
                  <div>
                    <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>
                      You're almost ready!
                    </h4>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                      Once you complete setup, you'll be able to browse available tasks and start earning right away.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    padding: '16px 32px',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  ← Back
                </button>
                <button
                  className="onboarding-button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  {submitting ? (
                    <>
                      <span style={{ display: 'inline-block', marginRight: 8 }}>⚙️</span>
                      Setting up your account...
                    </>
                  ) : (
                    <>Complete Setup 🎉</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { supabase, login, registerHuman, registerAgent } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'human', city: '', hourly_rate: 25 })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isLogin) {
        await login(form.email, form.password)
      } else {
        if (form.role === 'human') {
          await registerHuman({ name: form.name, email: form.email, password: form.password, city: form.city, hourly_rate: form.hourly_rate })
        } else {
          await registerAgent({ name: form.name, email: form.email, organization: form.name })
        }
      }
      window.location.href = '/dashboard'
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('Cannot reach the server. Please check your internet connection or try again later.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard' }
      })
      if (error) throw error
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('Cannot reach authentication service. Please try again.')
      } else {
        setError(err.message)
      }
      setLoading(false)
    }
  }

  return (
    <div className="onboarding-container">
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        zIndex: 10
      }}>
        <div className="onboarding-card fade-in-scale" style={{
          maxWidth: 480,
          width: '100%',
          padding: '40px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 className="display-font" style={{
              fontSize: '2.5rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #fff 0%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: 8
            }}>
              {isLogin ? 'Welcome back' : 'Join irlwork.ai'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem' }}>
              {isLogin ? 'Sign in to continue' : 'Start earning from real-world tasks'}
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              padding: '12px 16px',
              borderRadius: 12,
              marginBottom: 20,
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button onClick={handleGoogle} disabled={loading}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: '#fff',
              color: '#1a1a1a',
              fontWeight: 600,
              fontSize: '15px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.3s',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={e => {
              if (!loading) e.target.style.background = '#f5f5f5'
            }}
            onMouseLeave={e => {
              e.target.style.background = '#fff'
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{
            position: 'relative',
            margin: '24px 0',
            textAlign: 'center'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                width: '100%',
                borderTop: '1px solid rgba(255,255,255,0.1)'
              }}></div>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{
                padding: '0 16px',
                background: 'linear-gradient(135deg, rgba(30, 20, 15, 0.9) 0%, rgba(20, 15, 10, 0.9) 100%)',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '13px'
              }}>or</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 20
                }}>
                  <div
                    onClick={() => setForm({ ...form, role: 'human' })}
                    className={`select-card ${form.role === 'human' ? 'selected' : ''}`}
                    style={{ padding: 16 }}
                  >
                    <span className="select-card-icon" style={{ fontSize: '1.8rem', marginBottom: 8 }}>🤝</span>
                    <p style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>Human</p>
                  </div>
                  <div
                    onClick={() => setForm({ ...form, role: 'agent' })}
                    className={`select-card ${form.role === 'agent' ? 'selected' : ''}`}
                    style={{ padding: 16 }}
                  >
                    <span className="select-card-icon" style={{ fontSize: '1.8rem', marginBottom: 8 }}>🤖</span>
                    <p style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>Agent</p>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="label-text">FULL NAME</label>
                  <input
                    className="onboarding-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required={!isLogin}
                    placeholder="Your name"
                  />
                </div>
              </>
            )}

            <div style={{ marginBottom: 16 }}>
              <label className="label-text">EMAIL</label>
              <input
                className="onboarding-input"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                placeholder="you@example.com"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="label-text">PASSWORD</label>
              <input
                className="onboarding-input"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="onboarding-button"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Toggle */}
          <p style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.5)',
            marginTop: 24,
            fontSize: '14px'
          }}>
            {isLogin ? (
              <>
                Need an account?{' '}
                <button
                  onClick={() => setIsLogin(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fb923c',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontWeight: 600
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setIsLogin(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fb923c',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontWeight: 600
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}function App() {
  const { user, setUser, loading, error, login, registerHuman, registerAgent, logout } = useAuth()

  console.log('[App] Render - loading:', loading, 'user:', user?.id, 'error:', error, 'pathname:', window.location.pathname)

  if (loading) {
    console.log('[App] Showing loading spinner')
    return <Loading />
  }

  if (error) {
    console.log('[App] Auth error:', error)
    // Continue anyway - show landing page
  }

  if (user?.needs_onboarding) {
    console.log('[App] Showing onboarding form')
    return (
      <OnboardingForm
        user={user}
        onComplete={async (profile) => {
          const res = await fetch(API_URL + '/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...profile, id: user.id, email: user.email, name: user.name })
          })
          if (res.ok) {
            const data = await res.json()
            setUser({ ...data.user, supabase_user: true })
          }
        }}
      />
    )
  }

  // Redirect unauthenticated users from protected routes
  if (window.location.pathname === '/dashboard' && !user && !loading) {
    console.log('[App] Unauthenticated dashboard access, redirecting to /auth')
    window.location.href = '/auth'
    return <Loading />
  }

  if (user?.supabase_user || user) {
    console.log('[App] Showing dashboard for authenticated user')
    return <HumanDashboard user={user} token={user.id} onLogout={logout} />
  }

  if (window.location.pathname === '/mcp') {
    console.log('[App] Showing MCP page')
    return <MCPPage />
  }

  console.log('[App] Showing route-based rendering')

  return (
    <>
      {window.location.pathname === '/dashboard' && user && ( <HumanDashboard
        user={user} token={user.id} onLogout={logout} />
      )}
      {window.location.pathname !== '/dashboard' && (
        <>
          {(!window.location.pathname || window.location.pathname === '/') && <LandingPage onNavigate={(s) => { if (s === 'signup' || s === 'login') {
          window.location.href = '/auth'
        } }} />}
          {window.location.pathname === '/auth' && <AuthPage onBack={() => window.location.href = '/'} onLogin={async (email, password) => { await login(email, password); window.location.href = '/dashboard' }} />}
        </>
      )}
    </>
  )
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}
