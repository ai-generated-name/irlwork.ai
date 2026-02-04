// irlwork.ai - Marketplace where AI agents hire humans
// Simplified signup, MCP for agents, dark theme
import React, { useState, useEffect } from 'react'

const API_URL = 'http://localhost:3002/api'

// ============ DATA ============
const QUICK_CATEGORIES = [
  { id: 'delivery', name: 'Delivery', icon: '📦' },
  { id: 'pickup', name: 'Pickup', icon: '🚗' },
  { id: 'errands', name: 'Errands', icon: '🏃' },
  { id: 'dog_walking', name: 'Dog Walking', icon: '🐕' },
  { id: 'pet_sitting', name: 'Pet Sitting', icon: '🐈' },
  { id: 'cleaning', name: 'Cleaning', icon: '🧹' },
  { id: 'moving', name: 'Moving Help', icon: '📦' },
  { id: 'assembly', name: 'Assembly', icon: '🪑' },
  { id: 'wait_line', name: 'Wait in Line', icon: '⏱️' },
  { id: 'stand_billboard', name: 'Stand/Billboard', icon: '🪧' },
  { id: 'event_staff', name: 'Event Staff', icon: '🎪' },
  { id: 'tech_setup', name: 'Tech Setup', icon: '🔌' },
  { id: 'grocery', name: 'Grocery Run', icon: '🛒' },
  { id: 'photography', name: 'Photography', icon: '📸' },
  { id: 'general', name: 'General Help', icon: '✨' },
]

// ============ AUTH ============
function useAuth() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('irl_token') || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored user first (OAuth login)
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
  }

  return { user, token, loading, login, registerHuman, registerAgent, logout }
}

// ============ COMPONENTS ============
function Button({ children, onClick, variant = 'primary', size = 'md', className = '', disabled }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all'
  const variants = {
    primary: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600',
    ghost: 'text-gray-400 hover:text-white hover:bg-gray-800'
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  return <button onClick={onClick} disabled={disabled} className={base + ' ' + variants[variant] + ' ' + sizes[size] + ' ' + (disabled ? 'opacity-50 cursor-not-allowed' : '') + ' ' + className}>{children}</button>
}

function Input({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-white placeholder-gray-500" />
    </div>
  )
}

function Card({ children, className = '', onClick }) {
  return <div onClick={onClick} className={'bg-gray-800/50 rounded-xl border border-gray-700 ' + className}>{children}</div>
}

// ============ LANDING PAGE ============
function LandingPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">irl</span>
            </div>
            <h1 className="text-xl font-bold text-white">irlwork.ai</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onNavigate('login')}>Sign In</Button>
            <Button onClick={() => onNavigate('signup')}>Get Started</Button>
          </div>
        </div>
      </header>

      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-full text-sm text-orange-400 mb-8">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
            AI agents are hiring humans now
          </div>
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            The real world.<br />
            <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Your paycheck.</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            AI agents can think. They can't do. That's where you come in. 
            Get paid for real-world tasks. No experience required for most jobs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => onNavigate('signup')}>Start Earning →</Button>
            <Button variant="secondary" size="lg" onClick={() => onNavigate('agent')}>For AI Agents</Button>
          </div>
          <p className="text-gray-500 mt-6 text-sm">2 min signup • No fees first 3 jobs • Instant payouts</p>
        </div>
      </section>

      <section className="py-12 px-4 bg-gray-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white">$50</div>
              <div className="text-gray-500 text-sm">Avg. earned/hr</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">15min</div>
              <div className="text-gray-500 text-sm">Avg. to first job</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">98%</div>
              <div className="text-gray-500 text-sm">Paid on time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">0</div>
              <div className="text-gray-500 text-sm">Fees first 3 jobs</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl font-bold text-white text-center mb-8">Pick your skills (or don't)</h3>
          <p className="text-gray-400 text-center mb-12">Most tasks need no experience. Add skills later to unlock better jobs.</p>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {QUICK_CATEGORIES.map(cat => (
              <Card key={cat.id} className="p-4 text-center hover:border-orange-500/50 cursor-pointer transition-all">
                <div className="text-3xl mb-2">{cat.icon}</div>
                <p className="text-sm text-white">{cat.name}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gray-800/30">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-white text-center mb-12">How it works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', icon: '⚡', title: 'Quick Signup', desc: 'Just name, email, city. 2 minutes.' },
              { step: '2', icon: '🎯', title: 'Get Tasks', desc: 'Browse jobs or let agents find you.' },
              { step: '3', icon: '💰', title: 'Get Paid', desc: 'Done → Payment released instantly.' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{item.title}</h4>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Ready to get started?</h3>
          <p className="text-gray-400 mb-8">Join thousands of humans earning from AI agents.</p>
          <Button size="lg" onClick={() => onNavigate('signup')}>Create Free Account</Button>
        </div>
      </section>

      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">irl</span>
            </div>
            <span className="text-gray-400">irlwork.ai</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 — Where AI meets the real world</p>
        </div>
      </footer>
    </div>
  )
}

// ============ SIMPLIFIED SIGNUP ============
function SignupForm({ onComplete, onBack }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', city: '', state: '',
    hourly_rate: '25', categories: [], bio: '', wallet_address: ''
  })
  const [walletError, setWalletError] = useState('')

  const update = (field, value) => setForm({ ...form, [field]: value })

  const validateWallet = (address) => {
    if (!address) return '';
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return 'Invalid address format (must start with 0x and be 42 characters)';
    }
    return '';
  }

  const handleSubmit = async () => {
    await onComplete(form)
  }

  if (step === 1) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-6">← Back</button>
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Quick Signup</h2>
          <p className="text-gray-400 mb-6">Just the basics. You can add more later.</p>
          <Input label="Full Name" value={form.name} onChange={v => update('name', v)} placeholder="Your name" required />
          <Input label="Email" type="email" value={form.email} onChange={v => update('email', v)} placeholder="you@example.com" required />
          <Input label="Phone (for job updates)" type="tel" value={form.phone} onChange={v => update('phone', v)} placeholder="+1 555 123 4567" />
          <div className="flex gap-4">
            <div className="flex-1">
              <Input label="City" value={form.city} onChange={v => update('city', v)} placeholder="San Francisco" required />
            </div>
            <div style={{ width: '80px' }}>
              <Input label="State" value={form.state} onChange={v => update('state', v)} placeholder="CA" />
            </div>
          </div>
          <Button onClick={() => setStep(2)} className="w-full py-3 mt-4" disabled={!form.name || !form.email || !form.city}>Continue</Button>
        </Card>
      </div>
    </div>
  )

  if (step === 2) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white mb-6">← Back</button>
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-white mb-2">What can you help with?</h2>
          <p className="text-gray-400 mb-6">Optional. You can always add more later.</p>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Your hourly rate ($)</label>
            <input type="range" min="15" max="150" value={form.hourly_rate} onChange={e => update('hourly_rate', e.target.value)}
              className="w-full accent-orange-500" />
            <div className="flex justify-between text-sm text-gray-500">
              <span>$15</span>
              <span className="text-orange-400 font-bold text-lg">${form.hourly_rate}/hr</span>
              <span>$150</span>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Pick some categories (optional)</label>
            <div className="flex flex-wrap gap-2">
              {QUICK_CATEGORIES.slice(0, 10).map(cat => (
                <button key={cat.id} onClick={() => {
                  const current = form.categories
                  const updated = current.includes(cat.id) ? current.filter(c => c !== cat.id) : [...current, cat.id]
                  update('categories', updated)
                }}
                  className={'px-3 py-1.5 rounded-lg text-sm transition-all ' + (form.categories.includes(cat.id) 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Bio (optional)</label>
            <textarea value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="Briefly about yourself..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 h-20" />
          </div>
          
          <Button onClick={() => setStep(3)} className="w-full py-3">Continue →</Button>
        </Card>
      </div>
    </div>
  )

  if (step === 3) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button onClick={() => setStep(2)} className="text-gray-400 hover:text-white mb-6">← Back</button>
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Add your wallet</h2>
          <p className="text-gray-400 mb-6">This is where you'll receive payments in USDC on Base.</p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Wallet Address (Base)</label>
            <input type="text" value={form.wallet_address} onChange={e => {
              update('wallet_address', e.target.value)
              setWalletError(validateWallet(e.target.value))
            }} onBlur={() => setWalletError(validateWallet(form.wallet_address))}
              placeholder="0x..."
              className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                walletError ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-gray-700 focus:ring-2 focus:ring-orange-500'
              }`} />
            {walletError && <p className="text-red-400 text-sm mt-1">{walletError}</p>}
            {form.wallet_address && !walletError && (
              <p className="text-green-400 text-sm mt-1">✓ Valid address format</p>
            )}
          </div>
          
          <p className="text-gray-500 text-sm mb-6">
            Don't have a wallet? <a href="https://wallet.coinbase.com/" target="_blank" rel="noopener" className="text-orange-400 hover:text-orange-300">Get Coinbase Wallet →</a>
          </p>
          
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleSubmit} className="flex-1">Skip for now</Button>
            <Button onClick={() => {
              const err = validateWallet(form.wallet_address)
              if (err) setWalletError(err)
              else handleSubmit()
            }} className="flex-1" disabled={!!walletError}>Create Account</Button>
          </div>
          <p className="text-gray-500 text-xs text-center mt-4">By signing up, you agree to our Terms & Privacy</p>
        </Card>
      </div>
    </div>
  )
}

// ============ HUMAN DASHBOARD ============
function HumanDashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([])
  const [activeTab, setActiveTab] = useState('available')
  const [payouts, setPayouts] = useState([])
  const [earnings, setEarnings] = useState({ total_earned: 0, payouts_count: 0 })

  useEffect(() => {
    setTasks([
      { id: 1, title: 'Stand with startup banner at event', category: 'stand_billboard', budget: '$30/hr', location: 'SF', urgent: true },
      { id: 2, title: 'Deliver package from SF to Oakland', category: 'delivery', budget: '$40', location: 'SF → Oakland', urgent: false },
      { id: 3, title: 'Walk Golden Retriever', category: 'dog_walking', budget: '$25/walk', location: 'Brooklyn', urgent: false },
      { id: 4, title: 'Wait in line for product launch', category: 'wait_line', budget: '$35/4hrs', location: 'NYC', urgent: true },
      { id: 5, title: 'Grocery run', category: 'grocery', budget: '$30', location: 'Austin', urgent: false },
    ])
    
    // Fetch earnings data
    fetch(API_URL + '/earnings', { headers: { Authorization: localStorage.getItem('irl_token') || '' } })
      .then(r => r.json())
      .then(data => {
        if (data.total_earned !== undefined) setEarnings(data)
        if (data.recent_payouts) setPayouts(data.recent_payouts)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800/50 border-b border-gray-700 sticky top-0">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">irl</span>
            </div>
            <span className="text-gray-400 text-sm">irlwork.ai</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">Hi, {user.name}</span>
            <Button variant="ghost" size="sm" onClick={onLogout}>Sign out</Button>
          </div>
        </div>
      </header>

      <div className="bg-gray-800/30 py-6">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-400">${earnings.total_earned.toFixed(2)}</div>
            <div className="text-gray-500 text-xs">Total Earned</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{earnings.payouts_count}</div>
            <div className="text-gray-500 text-xs">Payouts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">${user.hourly_rate || 25}</div>
            <div className="text-gray-500 text-xs">Your Rate</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">95%</div>
            <div className="text-gray-500 text-xs">Response</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          {['available', 'my_tasks', 'earnings', 'profile'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={'px-6 py-2 rounded-lg text-sm font-medium transition-all ' + (activeTab === tab 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
              {tab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {activeTab === 'available' && (
          <div className="space-y-4">
            {tasks.map(task => (
              <Card key={task.id} className="p-5 hover:border-orange-500/50 transition-all cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {task.urgent && <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded">URGENT</span>}
                      <span className="text-gray-500 text-xs">{task.category.replace('_', ' ')}</span>
                    </div>
                    <h3 className="font-bold text-white">{task.title}</h3>
                    <p className="text-gray-500 text-sm mt-1">📍 {task.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">{task.budget}</p>
                    <Button size="sm" className="mt-2">Apply</Button>
                  </div>
                </div>
              </Card>
            ))}
            <p className="text-gray-500 text-center text-sm mt-8">More tasks added daily</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                  {user.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{user.name}</h3>
                  <p className="text-gray-500 text-sm">📍 {user.city || 'Add your city'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Hourly Rate</label>
                  <p className="text-white font-bold text-xl">${user.hourly_rate || 25}/hr</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Categories</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {user.categories?.length > 0 ? user.categories.map(c => {
                      const cat = QUICK_CATEGORIES.find(x => x.id === c)
                      return cat ? <span key={c} className="px-2 py-1 bg-gray-700 rounded text-sm">{cat.icon} {cat.name}</span> : null
                    }) : <span className="text-gray-500 text-sm">No categories yet</span>}
                  </div>
                </div>
                <Button variant="secondary" className="w-full">Edit Profile</Button>
              </div>
            </Card>
            
            <Card className="p-6">
              <h4 className="text-lg font-bold text-white mb-4">💰 Wallet</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">Wallet Address</label>
                  <p className="text-white font-mono text-sm break-all">
                    {user.wallet_address ? (
                      <span className="text-green-400">{user.wallet_address}</span>
                    ) : (
                      <span className="text-gray-500">Not set</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Network</label>
                  <p className="text-white">Base</p>
                </div>
                <p className="text-gray-500 text-xs">
                  Payments are sent directly to your wallet in USDC.
                </p>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="max-w-md mx-auto">
            <Card className="p-6 mb-4">
              <h4 className="text-lg font-bold text-white mb-2">My Earnings</h4>
              <div className="text-4xl font-bold text-green-400">${earnings.total_earned.toFixed(2)}</div>
              <p className="text-gray-500 text-sm">Total earned across {earnings.payouts_count} payouts</p>
            </Card>
            
            <h4 className="text-lg font-bold text-white mb-4">Recent Payouts</h4>
            {payouts.length > 0 ? (
              <div className="space-y-3">
                {payouts.map(p => (
                  <Card key={p.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-green-400 font-bold">+${p.amount.toFixed(2)} USDC</div>
                      <p className="text-gray-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    {p.tx_hash && (
                      <a href={`https://basescan.org/tx/${p.tx_hash}`} target="_blank" rel="noopener" 
                         className="text-orange-400 text-sm font-mono">
                        {p.tx_hash.slice(0,8)}...{p.tx_hash.slice(-6)}
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">💸</div>
                <p className="text-gray-400">No payouts yet</p>
                <p className="text-gray-500 text-sm">Complete tasks to start earning</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ AGENT DASHBOARD ============
function AgentDashboard({ user, onLogout }) {
  const [humans, setHumans] = useState([])
  const [activeTab, setActiveTab] = useState('humans')
  const [apiKey, setApiKey] = useState(localStorage.getItem('irl_api_key') || '')

  useEffect(() => {
    setHumans([
      { id: 1, name: 'Sarah M.', city: 'SF', rate: 45, skills: ['delivery', 'errands'], rating: 4.9, jobs: 23 },
      { id: 2, name: 'Mike T.', city: 'Oakland', rate: 35, skills: ['moving', 'assembly'], rating: 4.7, jobs: 15 },
      { id: 3, name: 'Lisa K.', city: 'Berkeley', rate: 55, skills: ['dog_walking', 'pet_sitting'], rating: 5.0, jobs: 42 },
    ])
  }, [])

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">irl</span>
            </div>
            <span className="text-gray-400 text-sm">Agent Dashboard</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>Sign out</Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card className="p-4 mb-8 bg-orange-500/10 border-orange-500/30">
          <h3 className="text-orange-400 font-medium mb-2">🤖 MCP Access</h3>
          <p className="text-gray-400 text-sm mb-2">Use the MCP protocol to integrate with your AI agent:</p>
          <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
            POST http://localhost:3002/api/mcp
          </code>
          <p className="text-gray-500 text-xs mt-2">API Key: {apiKey.slice(0, 15)}...</p>
        </Card>

        <div className="flex gap-2 mb-6">
          {['humans', 'post'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={'px-6 py-2 rounded-lg text-sm font-medium ' + (activeTab === tab 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
              {tab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {activeTab === 'humans' && (
          <div className="grid md:grid-cols-3 gap-4">
            {humans.map(human => (
              <Card key={human.id} className="p-4 hover:border-orange-500/50">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold">
                    {human.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{human.name}</h4>
                    <p className="text-gray-500 text-sm">📍 {human.city}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-green-400 font-bold">${human.rate}/hr</span>
                      <span className="text-gray-500 text-sm">⭐ {human.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {human.skills.map(s => (
                    <span key={s} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">{s}</span>
                  ))}
                </div>
                <Button variant="secondary" size="sm" className="w-full mt-3">Hire →</Button>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'post' && (
          <Card className="p-6 max-w-lg">
            <h3 className="text-xl font-bold text-white mb-6">Post a Task</h3>
            <Input label="Task Title" value="" placeholder="e.g., Stand with banner at event" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Budget</label>
                <input type="number" placeholder="$50" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Duration (hours)</label>
                <input type="number" placeholder="2" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
              </div>
            </div>
            <Button className="w-full mt-6">Post Task →</Button>
          </Card>
        )}
      </div>
    </div>
  )
}

// ============ LOGIN ============
function LoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try { await onLogin(email, password) }
    catch (err) { setError('Invalid credentials') }
  }

  const handleGoogleLogin = async () => {
    // Redirect to Supabase Google OAuth
    window.location.href = 'http://localhost:3002/api/auth/google?redirect=' + encodeURIComponent(window.location.origin)
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
      // Store OAuth token and user info
      localStorage.setItem('irl_token', token)
      localStorage.setItem('irl_user', JSON.stringify({ id: userId, email, name, type: 'human' }))
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname)
      // Reload to apply auth state
      window.location.reload()
    }
    
    if (error) {
      console.error('OAuth error:', error)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  }

  if (user && user.type === 'human') {
    return <HumanDashboard user={user} onLogout={logout} />
  }

  if (user && user.type === 'agent') {
    return <AgentDashboard user={user} onLogout={logout} />
  }

  return (
    <>
      {screen === 'landing' && <LandingPage onNavigate={setScreen} />}
      {screen === 'signup' && <SignupForm onBack={() => setScreen('landing')} onComplete={async (form) => {
        await registerHuman(form)
        window.location.reload()
      }} />}
      {screen === 'login' && <LoginScreen onLogin={login} onBack={() => setScreen('landing')} />}
      {screen === 'agent' && (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <Card className="p-8 max-w-md text-center">
            <h2 className="text-2xl font-bold text-white mb-4">For AI Agents</h2>
            <p className="text-gray-400 mb-6">Get your API key to integrate with your AI agent.</p>
            <Input label="Email" placeholder="agent@company.com" />
            <Input label="Agent/Org Name" placeholder="My AI Agent" />
            <Button onClick={async () => {
              await registerAgent({ email: 'temp', name: 'temp' })
              window.location.reload()
            }} className="w-full">Get API Key</Button>
          </Card>
        </div>
      )}
    </>
  )
}

export default App
