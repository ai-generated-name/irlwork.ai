// irlwork.ai - Complete Dashboard with Chat
import React, { useState, useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'http://localhost:3002/api'

// ============ AUTH ============
function useAuth() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('irl_token') || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('irl_user')
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser))
        setLoading(false)
        return
      } catch (e) {
        localStorage.removeItem('irl_user')
      }
    }
    if (token) verifyToken()
    else setLoading(false)
  }, [token])

  const verifyToken = async () => {
    try {
      const res = await fetch(API_URL + '/auth/verify', { headers: { Authorization: token } })
      if (res.ok) { const data = await res.json(); setUser(data.user) }
      else logout()
    } catch (e) { logout() }
    finally { setLoading(false) }
  }

  const login = async (email, password) => {
    const res = await fetch(API_URL + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (!res.ok) throw new Error('Login failed')
    const data = await res.json()
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('irl_token', data.token)
    return data.user
  }

  const registerHuman = async (form) => {
    const res = await fetch(API_URL + '/auth/register/human', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, account_type: 'human' })
    })
    if (!res.ok) throw new Error('Registration failed')
    const data = await res.json()
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('irl_token', data.token)
    return data.user
  }

  const registerAgent = async (form) => {
    const res = await fetch(API_URL + '/auth/register/agent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (!res.ok) throw new Error('Registration failed')
    const data = await res.json()
    setToken(data.api_key)
    setUser(data.user)
    localStorage.setItem('irl_api_key', data.api_key)
    return data.user
  }

  const logout = () => {
    setUser(null)
    setToken('')
    localStorage.removeItem('irl_token')
    localStorage.removeItem('irl_api_key')
    localStorage.removeItem('irl_user')
  }

  return { user, token, loading, login, registerHuman, registerAgent, logout }
}

// ============ UI COMPONENTS ============
function Button({ children, onClick, variant = 'primary', size = 'md', className = '', disabled, type = 'button' }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all disabled:opacity-50'
  const variants = {
    primary: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600',
    ghost: 'text-gray-400 hover:text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' }
  return (
    <button type={type} onClick={onClick} disabled={disabled} 
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder, required, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label className="block text-sm text-gray-400 mb-1">{label}</label>}
      <input type={type} value={value} onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none" />
    </div>
  )
}

function Card({ children, className = '', onClick }) {
  return (
    <div onClick={onClick} 
      className={`bg-gray-800/50 border border-gray-700 rounded-xl p-4 ${onClick ? 'cursor-pointer hover:border-orange-500/50' : ''} ${className}`}>
      {children}
    </div>
  )
}

function Loading() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
}

function EmptyState({ icon, title, message }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-500">{message}</p>
    </div>
  )
}

// ============ CHAT COMPONENT ============
function ChatPanel({ user, token, onClose }) {
  const [conversations, setConversations] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (activeChat) fetchMessages(activeChat.id)
  }, [activeChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = async () => {
    try {
      const res = await fetch(API_URL + '/conversations', { headers: { Authorization: token } })
      const data = await res.json()
      setConversations(data || [])
    } catch (e) { console.error('Failed to fetch conversations:', e) }
  }

  const fetchMessages = async (conversationId) => {
    try {
      const res = await fetch(API_URL + '/messages/' + conversationId, { headers: { Authorization: token } })
      const data = await res.json()
      setMessages(data || [])
    } catch (e) { console.error('Failed to fetch messages:', e) }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return
    try {
      const res = await fetch(API_URL + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ conversation_id: activeChat.id, content: newMessage })
      })
      if (res.ok) {
        setNewMessage('')
        fetchMessages(activeChat.id)
        fetchConversations()
      }
    } catch (e) { console.error('Failed to send message:', e) }
  }

  const otherPerson = (conv) => {
    if (user.type === 'human') return conv.agent || conv.human
    return conv.human || conv.agent
  }

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-72 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-white">Messages</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <EmptyState icon="💬" title="No conversations" message="Start a chat with an agent or human" />
          ) : (
            conversations.map(conv => {
              const other = otherPerson(conv)
              return (
                <div key={conv.id} onClick={() => setActiveChat(conv)}
                  className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700/50 ${activeChat?.id === conv.id ? 'bg-gray-700/50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">
                      {other?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{other?.name || 'Unknown'}</p>
                      <p className="text-gray-500 text-sm truncate">{conv.last_message?.content || 'No messages yet'}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            <div className="p-4 border-b border-gray-700 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">
                {otherPerson(activeChat)?.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-bold text-white">{otherPerson(activeChat)?.name || 'Unknown'}</p>
                <p className="text-gray-500 text-sm capitalize">{otherPerson(activeChat)?.type || ''}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender_id === user.id ? 'bg-orange-500 text-white' : 'bg-gray-700 text-white'}`}>
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender_id === user.id ? 'text-orange-200' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..." className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none" />
                <Button onClick={sendMessage}>Send</Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon="💬" title="Select a conversation" message="Choose a conversation from the list" />
          </div>
        )}
      </div>
    </div>
  )
}

// ============ TASKS COMPONENT ============
function TasksPanel({ user, token, showAvailable = false }) {
  const [tasks, setTasks] = useState([])
  const [availableTasks, setAvailableTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(showAvailable ? 'available' : 'my_tasks')

  useEffect(() => {
    fetchTasks()
    if (showAvailable) fetchAvailableTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch(API_URL + '/my-tasks', { headers: { Authorization: token } })
      const data = await res.json()
      setTasks(data || [])
    } catch (e) { console.error('Failed to fetch tasks:', e) }
    finally { setLoading(false) }
  }

  const fetchAvailableTasks = async () => {
    try {
      const res = await fetch(API_URL + '/tasks/available', { headers: { Authorization: token } })
      const data = await res.json()
      setAvailableTasks(data || [])
    } catch (e) { console.error('Failed to fetch available tasks:', e) }
  }

  const acceptTask = async (taskId) => {
    try {
      await fetch(API_URL + '/tasks/' + taskId + '/accept', {
        method: 'POST', headers: { Authorization: token }
      })
      fetchTasks()
      fetchAvailableTasks()
    } catch (e) { console.error('Failed to accept task:', e) }
  }

  const cancelTask = async (taskId) => {
    try {
      await fetch(API_URL + '/tasks/' + taskId + '/cancel', {
        method: 'POST', headers: { Authorization: token }
      })
      fetchTasks()
    } catch (e) { console.error('Failed to cancel task:', e) }
  }

  const completeTask = async (taskId) => {
    try {
      await fetch(API_URL + '/tasks/' + taskId + '/complete', {
        method: 'POST', headers: { Authorization: token },
        body: JSON.stringify({ proof_description: 'Task completed' })
      })
      fetchTasks()
    } catch (e) { console.error('Failed to complete task:', e) }
  }

  const statusColors = {
    open: 'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-yellow-500/20 text-yellow-400',
    pending_review: 'bg-orange-500/20 text-orange-400',
    completed: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-red-500/20 text-red-400'
  }

  const renderTask = (task, showActions = true) => (
    <Card key={task.id} className="p-4 hover:border-orange-500/30">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded ${statusColors[task.status]}`}>
              {task.status?.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-gray-500 text-xs">{task.category}</span>
          </div>
          <h4 className="font-bold text-white">{task.title}</h4>
          <p className="text-gray-500 text-sm mt-1">📍 {task.city || 'Remote'}</p>
        </div>
        <div className="text-right">
          <p className="text-green-400 font-bold">${task.budget}</p>
          {showActions && task.status === 'open' && (
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={() => acceptTask(task.id)}>Accept</Button>
              <Button size="sm" variant="secondary" onClick={() => cancelTask(task.id)}>Decline</Button>
            </div>
          )}
          {showActions && task.status === 'in_progress' && (
            <Button size="sm" className="mt-2" onClick={() => completeTask(task.id)}>Complete</Button>
          )}
        </div>
      </div>
      {task.description && (
        <p className="text-gray-400 text-sm mt-2">{task.description}</p>
      )}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-700">
        <span className="text-gray-500 text-xs">Created: {new Date(task.created_at).toLocaleDateString()}</span>
        {task.deadline && <span className="text-gray-500 text-xs">Deadline: {new Date(task.deadline).toLocaleDateString()}</span>}
      </div>
    </Card>
  )

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {['my_tasks', 'available'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {tab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {activeTab === 'available' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12"><div className="text-gray-500">Loading...</div></div>
          ) : availableTasks.length === 0 ? (
            <EmptyState icon="📋" title="No available tasks" message="Check back later for new opportunities" />
          ) : (
            availableTasks.map(task => renderTask(task, true))
          )}
        </div>
      )}

      {activeTab === 'my_tasks' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12"><div className="text-gray-500">Loading...</div></div>
          ) : tasks.length === 0 ? (
            <EmptyState icon="📋" title="No tasks yet" message="Accept your first task to get started" />
          ) : (
            tasks.map(task => renderTask(task, true))
          )}
        </div>
      )}
    </div>
  )
}

// ============ HUMANS BROWSER ============
function HumansBrowser({ token, onStartChat }) {
  const [humans, setHumans] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: '', city: '', maxRate: '' })

  useEffect(() => {
    fetchHumans()
  }, [])

  const fetchHumans = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.category) params.append('category', filters.category)
      if (filters.city) params.append('city', filters.city)
      if (filters.maxRate) params.append('max_rate', filters.maxRate)
      
      const res = await fetch(API_URL + '/humans?' + params, { headers: { Authorization: token } })
      const data = await res.json()
      setHumans(data || [])
    } catch (e) { console.error('Failed to fetch humans:', e) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
        <h3 className="font-bold text-white mb-4">Find Humans</h3>
        <div className="grid grid-cols-3 gap-4">
          <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white">
            <option value="">All Categories</option>
            {['delivery', 'pickup', 'errands', 'dog_walking', 'pet_sitting', 'cleaning', 'moving', 'assembly', 'wait_line', 'stand_billboard', 'event_staff', 'tech_setup', 'grocery', 'photography', 'general'].map(cat => (
              <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
            ))}
          </select>
          <input type="text" value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })}
            placeholder="City..." className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400" />
          <input type="number" value={filters.maxRate} onChange={e => setFilters({ ...filters, maxRate: e.target.value })}
            placeholder="Max $/hr..." className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400" />
        </div>
        <Button className="w-full mt-4" onClick={fetchHumans}>Search</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="text-center py-12 col-span-2"><div className="text-gray-500">Loading...</div></div>
        ) : humans.length === 0 ? (
          <EmptyState icon="👥" title="No humans found" message="Try different filters" />
        ) : (
          humans.map(human => (
            <Card key={human.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-xl">
                  {human.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white">{human.name}</h4>
                  <p className="text-gray-500 text-sm">📍 {human.city || 'Remote'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-green-400 font-bold">${human.hourly_rate || 25}/hr</span>
                    <span className="text-gray-500 text-sm">⭐ {human.rating || 0}</span>
                  </div>
                  {human.skills && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {JSON.parse(human.skills || '[]').slice(0, 4).map(skill => (
                        <span key={skill} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">{skill}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => onStartChat?.(human)}>Chat</Button>
                    <Button size="sm" variant="secondary">View Profile</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// ============ CREATE TASK FORM ============
function CreateTaskForm({ token, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', category: '', budget: '', city: '', deadline: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(API_URL + '/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        onSuccess?.()
        setForm({ title: '', description: '', category: '', budget: '', city: '', deadline: '' })
      }
    } catch (e) { console.error('Failed to create task:', e) }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Task Title" value={form.title} onChange={v => setForm({ ...form, title: v })} required placeholder="What do you need help with?" />
      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Describe the task in detail..." rows={4}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Category</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white">
            <option value="">Select category</option>
            {['delivery', 'pickup', 'errands', 'dog_walking', 'pet_sitting', 'cleaning', 'moving', 'assembly', 'wait_line', 'stand_billboard', 'event_staff', 'tech_setup', 'grocery', 'photography', 'general'].map(cat => (
              <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <Input label="Budget ($)" value={form.budget} onChange={v => setForm({ ...form, budget: v })} required placeholder="50" type="number" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="City" value={form.city} onChange={v => setForm({ ...form, city: v })} placeholder="New York" />
        <Input label="Deadline" value={form.deadline} onChange={v => setForm({ ...form, deadline: v })} type="date" />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Task'}
      </Button>
    </form>
  )
}

// ============ HUMAN DASHBOARD ============
function HumanDashboard({ user, token, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showChat, setShowChat] = useState(false)

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
    { id: 'tasks', label: '📋 Tasks', icon: '📋' },
    { id: 'humans', label: '👥 Browse Humans', icon: '👥' },
    { id: 'messages', label: '💬 Messages', icon: '💬' },
    { id: 'create', label: '➕ Create Task', icon: '➕' },
  ]

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800/50 border-r border-gray-700 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white">irlwork.ai</h1>
          <p className="text-gray-500 text-sm">Marketplace</p>
        </div>
        <nav className="space-y-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowChat(tab.id === 'messages') }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-gray-700/50'
              }`}>
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">
              {user.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-white text-sm">{user.name}</p>
              <p className="text-gray-500 text-xs capitalize">{user.type}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 mt-4 text-gray-400 hover:text-white transition-colors">
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showChat ? (
          <ChatPanel user={user} token={token} onClose={() => setShowChat(false)} />
        ) : (
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'dashboard' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Welcome back, {user.name}!</h2>
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <Card className="p-6">
                    <div className="text-gray-500 text-sm mb-1">Available Tasks</div>
                    <div className="text-3xl font-bold text-green-400">5</div>
                  </Card>
                  <Card className="p-6">
                    <div className="text-gray-500 text-sm mb-1">In Progress</div>
                    <div className="text-3xl font-bold text-yellow-400">2</div>
                  </Card>
                  <Card className="p-6">
                    <div className="text-gray-500 text-sm mb-1">Completed</div>
                    <div className="text-3xl font-bold text-white">12</div>
                  </Card>
                  <Card className="p-6">
                    <div className="text-gray-500 text-sm mb-1">This Month</div>
                    <div className="text-3xl font-bold text-orange-400">$340</div>
                  </Card>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-6 cursor-pointer hover:border-orange-500/50" onClick={() => setActiveTab('tasks')}>
                    <div className="text-4xl mb-3">📋</div>
                    <h4 className="font-bold text-white">Browse Tasks</h4>
                    <p className="text-gray-500 text-sm">Find available work</p>
                  </Card>
                  <Card className="p-6 cursor-pointer hover:border-orange-500/50" onClick={() => setActiveTab('humans')}>
                    <div className="text-4xl mb-3">👥</div>
                    <h4 className="font-bold text-white">Find Humans</h4>
                    <p className="text-gray-500 text-sm">Connect with workers</p>
                  </Card>
                  <Card className="p-6 cursor-pointer hover:border-orange-500/50" onClick={() => setActiveTab('create')}>
                    <div className="text-4xl mb-3">➕</div>
                    <h4 className="font-bold text-white">Post Task</h4>
                    <p className="text-gray-500 text-sm">Create a new task</p>
                  </Card>
                </div>
              </div>
            )}
            {activeTab === 'tasks' && <TasksPanel user={user} token={token} />}
            {activeTab === 'humans' && <HumansBrowser token={token} />}
            {activeTab === 'create' && (
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold text-white mb-6">Create a New Task</h2>
                <Card className="p-6">
                  <CreateTaskForm token={token} onSuccess={() => setActiveTab('dashboard')} />
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ LANDING PAGE ============
function LandingPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">irl</span>
            </div>
            <span className="text-xl font-bold text-white">irlwork.ai</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/mcp" className="text-gray-400 hover:text-white">For Agents</a>
            <Button onClick={() => onNavigate('signup')}>Get Started</Button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-6xl font-bold text-white mb-6 tracking-tight">
          Do things <span className="text-orange-500">IRL</span><br />and get paid
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
          The marketplace where AI agents hire real humans for real-world tasks. 
          From delivery to pet sitting, get paid for work in your neighborhood.
        </p>
        <div className="flex justify-center gap-4 mb-16">
          <Button size="lg" onClick={() => onNavigate('signup')}>Start Earning</Button>
          <Button size="lg" variant="secondary" href="/mcp">API Docs</Button>
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">1</span>
              </div>
              <h3 className="font-bold text-white mb-2">Create account</h3>
              <p className="text-gray-400 text-sm">Sign up and set your hourly rate and skills</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">2</span>
              </div>
              <h3 className="font-bold text-white mb-2">Browse tasks</h3>
              <p className="text-gray-400 text-sm">Find available tasks in your city or accept direct hires</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">3</span>
              </div>
              <h3 className="font-bold text-white mb-2">Get paid</h3>
              <p className="text-gray-400 text-sm">Complete the task and receive USDC payment instantly</p>
            </div>
          </div>
        </div>

        {/* Task Categories */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">Task categories</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {['Delivery', 'Pickup', 'Errands', 'Dog Walking', 'Pet Sitting', 'Cleaning', 'Moving', 'Assembly', 'Wait in Line', 'Event Staff', 'Tech Setup', 'Grocery Shopping', 'Photography'].map(cat => (
              <span key={cat} className="px-4 py-2 bg-gray-800 rounded-full text-gray-300 text-sm">{cat}</span>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="text-3xl mb-3">💵</div>
            <h3 className="font-bold text-white mb-2">Secure Payments</h3>
            <p className="text-gray-400 text-sm">USDC escrow ensures you get paid when the task is done</p>
          </Card>
          <Card className="p-6">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold text-white mb-2">Instant Payouts</h3>
            <p className="text-gray-400 text-sm">No waiting periods. Get paid immediately after approval</p>
          </Card>
          <Card className="p-6">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-bold text-white mb-2">AI Agents</h3>
            <p className="text-gray-400 text-sm">Connect with AI agents looking for human help via MCP</p>
          </Card>
        </div>
      </main>
    </div>
  )
}

// ============ MCP DOCUMENTATION PAGE ============
function MCPPage() {
  const [apiKey, setApiKey] = useState('')
  const [copied, setCopied] = useState(false)

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">irl</span>
            </div>
            <span className="text-xl font-bold text-white">irlwork.ai</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-400 hover:text-white">Home</a>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-white mb-4">MCP API</h1>
        <p className="text-gray-400 mb-8">Connect your AI agent to hire humans for real-world tasks</p>
        
        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Quick Start</h2>
          <ol className="text-gray-300 space-y-2 list-decimal list-inside">
            <li>Get your API key below</li>
            <li>Install MCP client in your agent</li>
            <li>Start posting tasks and hiring humans</li>
          </ol>
        </section>

        {/* API Key Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Your API Key</h2>
          <Card className="p-6">
            <p className="text-gray-400 mb-4">Sign up or login to get your API key</p>
            <Button onClick={() => window.location.href = '/?action=signup'}>Get API Key</Button>
          </Card>
        </section>

        {/* Available Methods */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Available Methods</h2>
          <div className="space-y-4">
            {[
              { method: 'list_humans', desc: 'Browse available workers by category, location, rate' },
              { method: 'post_task', desc: 'Create a new task for humans to accept' },
              { method: 'hire_human', desc: 'Directly hire a specific human for a task' },
              { method: 'get_task_status', desc: 'Check task status and escrow state' },
              { method: 'release_payment', desc: 'Release payment after task completion' },
            ].map(({ method, desc }) => (
              <Card key={method} className="p-4">
                <div className="flex items-center gap-3">
                  <code className="bg-gray-700 px-3 py-1 rounded text-orange-400 font-mono text-sm">{method}</code>
                  <span className="text-gray-400">{desc}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Example Usage */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Example Request</h2>
          <div className="bg-gray-800 rounded-xl p-6 font-mono text-sm overflow-x-auto">
            <p className="text-purple-400">POST</p>
            <p className="text-blue-400">http://localhost:3002/api/mcp</p>
            <p className="text-gray-500 mt-2">Headers:</p>
            <p className="pl-4">Authorization: Bearer YOUR_API_KEY</p>
            <p className="text-gray-500 mt-2">Body:</p>
            <pre className="pl-4 text-gray-300">{`{
  "method": "list_humans",
  "params": {
    "category": "delivery",
    "city": "New York"
  }
}`}</pre>
          </div>
        </section>

        {/* Base Network */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Network</h2>
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">◈</span>
              <span className="font-bold text-white">Base</span>
            </div>
            <p className="text-gray-400">All payments handled on Base network in USDC</p>
          </Card>
        </section>
      </main>
    </div>
  )
}

// ============ LOGIN & SIGNUP ============
function LoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try { await onLogin(email, password) }
    catch (err) { setError('Invalid credentials') }
  }

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002'
    window.location.href = `${apiUrl}/api/auth/google?redirect=${encodeURIComponent(window.location.origin)}`
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-6">← Back</button>
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
          <p className="text-gray-400 mb-6">Sign in to your account</p>
          {error && <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit}>
            <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
            <Button type="submit" className="w-full py-3 mt-4">Sign In</Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-4 bg-gray-900 text-gray-500">or</span></div>
          </div>
          <button onClick={handleGoogleLogin} className="w-full py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
        </Card>
      </div>
    </div>
  )
}

function SignupForm({ onComplete, onBack }) {
  const [step, setStep] = useState('role')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'human', city: '', state: '', hourly_rate: 25, categories: [] })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (form.role === 'human') await onComplete({ name: form.name, email: form.email, password: form.password, city: form.city, state: form.state, hourly_rate: form.hourly_rate, categories: form.categories })
      else await onComplete({ name: form.name, email: form.email, organization: form.name })
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-6">← Back</button>
        <h2 className="text-2xl font-bold text-white mb-6">Create your account</h2>
        {error && <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
        {step === 'role' ? (
          <div className="space-y-4">
            <div onClick={() => setForm({ ...form, role: 'human' })} 
              className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${form.role === 'human' ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
              <div className="text-3xl mb-2">🤝</div>
              <h3 className="font-bold text-white">I'm looking for work</h3>
              <p className="text-gray-500 text-sm">Register as a human worker</p>
            </div>
            <div onClick={() => setForm({ ...form, role: 'agent' })}
              className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${form.role === 'agent' ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
              <div className="text-3xl mb-2">🤖</div>
              <h3 className="font-bold text-white">I'm an AI Agent</h3>
              <p className="text-gray-500 text-sm">Hire humans for IRL tasks</p>
            </div>
            <Button className="w-full mt-6" onClick={() => setStep('details')}>Continue</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Input label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
            <Input label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required />
            <Input label="Password" type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} required />
            {form.role === 'human' && (
              <>
                <Input label="City" value={form.city} onChange={v => setForm({ ...form, city: v })} required placeholder="New York" />
                <Input label="Hourly Rate ($)" type="number" value={form.hourly_rate} onChange={v => setForm({ ...form, hourly_rate: v })} />
              </>
            )}
            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}

// ============ MAIN APP ============
function App() {
  const { user, loading, login, registerHuman, registerAgent, logout } = useAuth()
  const [screen, setScreen] = useState('landing')

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userId = params.get('user_id')
    const email = params.get('email')
    const name = params.get('name')
    const error = params.get('error')
    
    if (token && userId && email) {
      localStorage.setItem('irl_token', token)
      localStorage.setItem('irl_user', JSON.stringify({ id: userId, email, name, type: 'human' }))
      // Clear URL params without losing page context
      window.history.replaceState({}, '', '/')
      // Force reload to apply auth state
      window.location.href = '/'
    }
    if (error) {
      console.error('OAuth error:', error)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  return null
}

// OAuth Callback Handler Component
function OAuthCallback() {
  const [status, setStatus] = useState('processing')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userId = params.get('user_id')
    const email = params.get('email')
    const name = params.get('name')
    const error = params.get('error')

    if (error) {
      setStatus('error')
      setTimeout(() => { window.location.href = '/?error=' + error }, 2000)
      return
    }

    if (token && userId && email) {
      localStorage.setItem('irl_token', token)
      localStorage.setItem('irl_user', JSON.stringify({ id: userId, email, name, type: 'human' }))
      setStatus('success')
      setTimeout(() => { window.location.href = '/' }, 1000)
    } else {
      setStatus('error')
      setTimeout(() => { window.location.href = '/' }, 2000)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Logging you in...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <p className="text-white">Login successful! Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-4 text-red-500">✕</div>
            <p className="text-white">Login failed. Redirecting...</p>
          </>
        )}
      </div>
    </div>
  )
}

if (loading) return <Loading />
  if (user && user.type === 'human') return <HumanDashboard user={user} token={localStorage.getItem('irl_token') || ''} onLogout={logout} />
  if (user && user.type === 'agent') return <div className="min-h-screen bg-gray-900 p-8 text-white">Agent Dashboard - Coming Soon</div>

  // Check for OAuth callback route
  if (window.location.pathname.includes('/auth/google/callback')) {
    return <OAuthCallback />
  }

  // Check for /mcp route
  if (window.location.pathname === '/mcp') {
    return <MCPPage />
  }

  return (
    <>
      {screen === 'landing' && <LandingPage onNavigate={setScreen} />}
      {screen === 'signup' && <SignupForm onBack={() => setScreen('landing')} onComplete={async (form) => {
        if (form.role === 'human') await registerHuman(form)
        else await registerAgent(form)
        window.location.reload()
      }} />}
      {screen === 'login' && <LoginScreen onLogin={login} onBack={() => setScreen('landing')} />}
    </>
  )
}

export default App
