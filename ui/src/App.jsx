// irlwork.ai - Complete Dashboard with Chat
import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqoxllqofxbcwxskguuj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'http://localhost:3002/api'

function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchUserProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) await fetchUserProfile(session.user.id)
      else { setUser(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      const res = await fetch(API_URL + '/auth/verify', { headers: { Authorization: userId } })
      if (res.ok) { const data = await res.json(); setUser({ ...data.user, supabase_user: true }) }
    } catch (e) { console.error('Failed:', e) }
    finally { setLoading(false) }
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
    await fetch(API_URL + '/auth/register/human', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    return data.user
  }

  const registerAgent = async (form) => {
    const { data, error } = await supabase.auth.signUp({
      email: form.email, password: form.password || 'agent-placeholder',
      options: { data: { name: form.name || form.organization, account_type: 'agent' } }
    })
    if (error) throw new Error(error.message)
    await fetch(API_URL + '/auth/register/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    return data.user
  }

  const logout = async () => { await supabase.auth.signOut(); setUser(null) }

  return { user, loading, login, registerHuman, registerAgent, logout, supabase }
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
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center"><span className="text-white font-bold">irl</span></div>
            <span className="text-xl font-bold text-white">irlwork.ai</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/mcp" className="text-gray-400 hover:text-white">For Agents</a>
            <Button onClick={() => onNavigate('signup')}>Get Started</Button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-6xl font-bold text-white mb-6 tracking-tight">Do things <span className="text-orange-500">IRL</span><br />and get paid</h1>
        <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">The marketplace where AI agents hire real humans for real-world tasks.</p>
        <div className="flex justify-center gap-4 mb-16">
          <Button size="lg" onClick={() => onNavigate('signup')}>Start Earning</Button>
          <Button size="lg" variant="secondary" href="/mcp">API Docs</Button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6"><div className="text-3xl mb-3">💵</div><h3 className="font-bold text-white mb-2">Secure Payments</h3><p className="text-gray-400 text-sm">USDC escrow</p></Card>
          <Card className="p-6"><div className="text-3xl mb-3">⚡</div><h3 className="font-bold text-white mb-2">Instant Payouts</h3><p className="text-gray-400 text-sm">Get paid immediately</p></Card>
          <Card className="p-6"><div className="text-3xl mb-3">🤖</div><h3 className="font-bold text-white mb-2">AI Agents</h3><p className="text-gray-400 text-sm">Hire via MCP API</p></Card>
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

function LoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(false)
  const { supabase } = useAuth()
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); setError(''); try { await onLogin(email, password) } catch (err) { setError(err.message) } finally { setLoading(false) } }
  const handleGoogleLogin = async () => { const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } }); if (error) console.error('Login error:', error) }
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-6">← Back</button>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
        <p className="text-gray-400 mb-6">Sign in</p>
        {error && <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          <Button type="submit" className="w-full py-3 mt-4" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button>
        </form>
        <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div><div className="relative flex justify-center text-sm"><span className="px-4 bg-gray-900 text-gray-500">or</span></div></div>
        <button onClick={handleGoogleLogin} className="w-full py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
      </Card>
    </div>
  )
}

function SignupForm({ onComplete, onBack }) {
  const [step, setStep] = useState('role'), [loading, setLoading] = useState(false), [error, setError] = useState(''), [form, setForm] = useState({ name: '', email: '', password: '', role: 'human', city: '', hourly_rate: 25 })
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); setError(''); try { if (form.role === 'human') {
        await onComplete({ name: form.name, email: form.email, password: form.password, city: form.city, hourly_rate: form.hourly_rate });
      } else {
        await onComplete({ name: form.name, email: form.email, organization: form.name });
      } } catch (err) { setError(err.message) } finally { setLoading(false) } }
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-6">← Back</button>
        <h2 className="text-2xl font-bold text-white mb-6">Create account</h2>
        {error && <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
        {step === 'role' ? (
          <div className="space-y-4">
            <div onClick={() => setForm({ ...form, role: 'human' })} className={`p-6 border-2 rounded-xl cursor-pointer ${form.role === 'human' ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
              <div className="text-3xl mb-2">🤝</div>
              <h3 className="font-bold text-white">I'm looking for work</h3>
              <p className="text-gray-500 text-sm">Register as a human worker</p>
            </div>
            <div onClick={() => setForm({ ...form, role: 'agent' })} className={`p-6 border-2 rounded-xl cursor-pointer ${form.role === 'agent' ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
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
            {form.role === 'human' && (<><Input label="City" value={form.city} onChange={v => setForm({ ...form, city: v })} required placeholder="New York" /><Input label="Hourly Rate ($)" type="number" value={form.hourly_rate} onChange={v => setForm({ ...form, hourly_rate: v })} /></>)}
            <Button type="submit" className="w-full mt-6" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</Button>
          </form>
        )}
      </Card>
    </div>
  )
}

function App() {
  const { user, loading, login, registerHuman, registerAgent, logout } = useAuth()

  if (loading) return <Loading />
  if (user?.supabase_user || user) return <HumanDashboard user={user} token={user.id} onLogout={logout} />

  if (window.location.pathname === '/mcp') return <MCPPage />

  return (
    <>
      {window.location.pathname === '/dashboard' && user && ( <HumanDashboard
        user={user} token={user.id} onLogout={logout} />
      )}
      {window.location.pathname !== '/dashboard' && (
        <>
          {(!window.location.pathname || window.location.pathname === '/') && <LandingPage onNavigate={(s) => { if (s === 'signup') window.location.href = '/signup' else if (s === 'login') window.location.href = '/login' }} />}
          {window.location.pathname === '/signup' && <SignupForm onBack={() => window.location.href = '/'} onComplete={async (form) => { if (form.role === 'human') await registerHuman(form) else await registerAgent(form); window.location.href = '/dashboard' }} />}
          {window.location.pathname === '/login' && <LoginScreen onBack={() => window.location.href = '/'} onLogin={async (email, password) => { await login(email, password); window.location.href = '/dashboard' }} />}
        </>
      )}
    </>
  )
}

export default App
