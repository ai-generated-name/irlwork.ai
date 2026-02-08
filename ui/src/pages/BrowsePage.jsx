import React, { useState, useEffect } from 'react'
import { MapPin, Clock, DollarSign, Star, Briefcase, Users, Filter, X, Check } from 'lucide-react'
import { supabase } from '../App'
import CustomDropdown from '../components/CustomDropdown'
import '../landing-v4.css'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

const categories = [
  { value: '', label: 'All Categories' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'photography', label: 'Photography' },
  { value: 'errands', label: 'Errands' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'moving', label: 'Moving' },
  { value: 'tech', label: 'Tech Support' },
  { value: 'general', label: 'General' },
]

export default function BrowsePage({ user }) {
  const [viewMode, setViewMode] = useState('tasks') // 'tasks' or 'workers'
  const [tasks, setTasks] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  // Apply modal state
  const [showApplyModal, setShowApplyModal] = useState(null) // task object or null
  const [applyMessage, setApplyMessage] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)
  const [applyError, setApplyError] = useState('')

  useEffect(() => {
    fetchData()

    // Real-time subscription for tasks
    const tasksChannel = supabase
      .channel('browse-tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (viewMode !== 'tasks') return

          if (payload.eventType === 'INSERT' && payload.new.status === 'open') {
            // New open task - add to list
            setTasks(prev => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status !== 'open') {
              // Task no longer open - remove from list
              setTasks(prev => prev.filter(t => t.id !== payload.new.id))
            } else {
              // Update task in list
              setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t))
            }
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Real-time subscription for workers
    const workersChannel = supabase
      .channel('browse-workers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          if (viewMode !== 'workers') return
          if (payload.new?.type !== 'human') return

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setWorkers(prev => {
              const exists = prev.find(w => w.id === payload.new.id)
              if (exists) {
                return prev.map(w => w.id === payload.new.id ? payload.new : w)
              }
              return [payload.new, ...prev]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(workersChannel)
    }
  }, [viewMode, categoryFilter, cityFilter])

  async function fetchData() {
    setLoading(true)
    try {
      if (viewMode === 'tasks') {
        const params = new URLSearchParams()
        if (categoryFilter) params.append('category', categoryFilter)
        if (cityFilter) params.append('city', cityFilter)

        const res = await fetch(`${API_URL}/tasks/available?${params}`)
        if (res.ok) {
          let data = await res.json()
          // Sort
          if (sortBy === 'newest') {
            data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          } else if (sortBy === 'highest') {
            data.sort((a, b) => (b.budget || b.budget_cents/100) - (a.budget || a.budget_cents/100))
          }
          setTasks(data)
        }
      } else {
        const params = new URLSearchParams()
        if (categoryFilter) params.append('category', categoryFilter)
        if (cityFilter) params.append('city', cityFilter)

        const res = await fetch(`${API_URL}/humans/directory?${params}`)
        if (res.ok) {
          let data = await res.json()
          // Sort
          if (sortBy === 'rating') {
            data.sort((a, b) => (b.rating || 0) - (a.rating || 0))
          } else if (sortBy === 'completed') {
            data.sort((a, b) => (b.jobs_completed || 0) - (a.jobs_completed || 0))
          }
          setWorkers(data)
        }
      }
    } catch (e) {
      console.error('Error fetching data:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleApply() {
    if (!user || !showApplyModal) return

    setApplyLoading(true)
    setApplyError('')

    try {
      const res = await fetch(`${API_URL}/tasks/${showApplyModal.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({ cover_letter: applyMessage })
      })

      if (res.ok) {
        setApplySuccess(true)
        setTimeout(() => {
          setShowApplyModal(null)
          setApplyMessage('')
          setApplySuccess(false)
        }, 2000)
      } else {
        const err = await res.json()
        setApplyError(err.error || 'Failed to apply')
      }
    } catch (e) {
      setApplyError('Network error. Please try again.')
    } finally {
      setApplyLoading(false)
    }
  }

  function formatBudget(task) {
    const amount = task.budget || (task.budget_cents ? task.budget_cents / 100 : 0)
    return `$${amount.toFixed(0)}`
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const navigate = (path) => { window.location.href = path }

  return (
    <div className="landing-v4" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav className="navbar-v4">
        <a href="/" className="logo-v4">
          <div className="logo-mark-v4">irl</div>
          <span className="logo-name-v4">irlwork.ai</span>
        </a>
        <div className="nav-links-v4">
          <a href="/mcp" className="nav-link-v4">For Agents</a>
          <a href="/browse" className="nav-link-v4" style={{ color: 'var(--coral-500)' }}>Browse</a>
          {user ? (
            <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/dashboard')}>Dashboard</button>
          ) : (
            <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/auth')}>Join Now</button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 24px 48px', flex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 48,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 16
          }}>
            {viewMode === 'tasks' ? 'Available Tasks' : 'Browse Workers'}
          </h1>
          <p style={{
            fontSize: 18,
            color: 'var(--text-secondary)',
            maxWidth: 600,
            margin: '0 auto'
          }}>
            {viewMode === 'tasks'
              ? 'Find tasks in your area and start earning. No applications needed for most tasks.'
              : 'Discover skilled workers ready to help with your tasks.'}
          </p>
        </div>

        {/* View Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 32,
          background: 'var(--bg-tertiary)',
          padding: 6,
          borderRadius: 'var(--radius-full)',
          width: 'fit-content',
          margin: '0 auto 32px'
        }}>
          <button
            onClick={() => setViewMode('tasks')}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: viewMode === 'tasks' ? 'white' : 'transparent',
              color: viewMode === 'tasks' ? 'var(--teal-700)' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: viewMode === 'tasks' ? 'var(--shadow-md)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Briefcase size={18} />
            Tasks
          </button>
          <button
            onClick={() => setViewMode('workers')}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: viewMode === 'workers' ? 'white' : 'transparent',
              color: viewMode === 'workers' ? 'var(--teal-700)' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: viewMode === 'workers' ? 'var(--shadow-md)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Users size={18} />
            Workers
          </button>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 32,
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <div style={{ minWidth: 160 }}>
            <CustomDropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categories}
              placeholder="All Categories"
            />
          </div>

          <input
            type="text"
            placeholder="City or location..."
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="city-autocomplete-v4-input"
            style={{ minWidth: 180 }}
          />

          <div style={{ minWidth: 150 }}>
            <CustomDropdown
              value={sortBy}
              onChange={(val) => { setSortBy(val); fetchData() }}
              options={viewMode === 'tasks' ? [
                { value: 'newest', label: 'Newest First' },
                { value: 'highest', label: 'Highest Pay' }
              ] : [
                { value: 'rating', label: 'Highest Rated' },
                { value: 'completed', label: 'Most Completed' }
              ]}
              placeholder={viewMode === 'tasks' ? 'Newest First' : 'Highest Rated'}
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{
              width: 40,
              height: 40,
              border: '3px solid var(--coral-500)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
          </div>
        )}

        {/* Tasks Grid */}
        {!loading && viewMode === 'tasks' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 24
          }}>
            {tasks.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: 48,
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(26,26,26,0.06)'
              }}>
                <Briefcase size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
                <p style={{ color: 'var(--text-secondary)' }}>No tasks available at the moment.</p>
                <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Check back soon!</p>
              </div>
            ) : (
              tasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    background: 'white',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(26,26,26,0.06)',
                    padding: 24,
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {/* Category Badge */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 12
                  }}>
                    <span style={{
                      padding: '4px 12px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--teal-700)',
                      textTransform: 'capitalize'
                    }}>
                      {task.category || 'General'}
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      background: task.escrow_status === 'funded' ? 'var(--success-bg)' : 'rgba(244, 213, 141, 0.3)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 12,
                      fontWeight: 500,
                      color: task.escrow_status === 'funded' ? 'var(--success)' : '#B8860B'
                    }}>
                      {task.escrow_status === 'funded' ? 'Funded' : 'Unfunded'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 8,
                    lineHeight: 1.3
                  }}>
                    {task.title}
                  </h3>

                  {/* Description */}
                  {task.description && (
                    <p style={{
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                      marginBottom: 16,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {task.description}
                    </p>
                  )}

                  {/* Meta */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginBottom: 16,
                    fontSize: 14,
                    color: 'var(--text-secondary)'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <DollarSign size={16} style={{ color: 'var(--coral-500)' }} />
                      <strong style={{ color: 'var(--text-primary)' }}>{formatBudget(task)}</strong>
                    </span>
                    {task.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={16} />
                        {task.location}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={16} />
                      {formatDate(task.created_at)}
                    </span>
                  </div>

                  {/* Posted By */}
                  {task.agent && (
                    <div style={{
                      paddingTop: 16,
                      borderTop: '1px solid rgba(26,26,26,0.06)',
                      marginBottom: 16,
                      fontSize: 13,
                      color: 'var(--text-tertiary)'
                    }}>
                      Posted by <strong style={{ color: 'var(--text-secondary)' }}>{task.agent.name || task.agent.organization || 'Anonymous'}</strong>
                    </div>
                  )}

                  {/* Apply Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!user) {
                        navigate('/auth')
                        return
                      }
                      setShowApplyModal(task)
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'var(--coral-500)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: 15,
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--coral-600)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--coral-500)'}
                  >
                    Apply to This Task
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Workers Grid */}
        {!loading && viewMode === 'workers' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 24
          }}>
            {workers.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: 48,
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(26,26,26,0.06)'
              }}>
                <Users size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
                <p style={{ color: 'var(--text-secondary)' }}>No workers found.</p>
                <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Try adjusting your filters.</p>
              </div>
            ) : (
              workers.map(worker => (
                <div
                  key={worker.id}
                  style={{
                    background: 'white',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(26,26,26,0.06)',
                    padding: 24,
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {/* Avatar & Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: worker.avatar_url ? `url(${worker.avatar_url}) center/cover` : 'var(--teal-500)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: 20
                    }}>
                      {!worker.avatar_url && (worker.name?.[0]?.toUpperCase() || '?')}
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: 17,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: 4
                      }}>
                        {worker.name || 'Anonymous'}
                      </h3>
                      {worker.city && (
                        <span style={{
                          fontSize: 13,
                          color: 'var(--text-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <MapPin size={12} />
                          {worker.city}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Skills */}
                  {worker.skills && worker.skills.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginBottom: 16
                    }}>
                      {(Array.isArray(worker.skills) ? worker.skills : []).slice(0, 4).map((skill, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '4px 10px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 12,
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div style={{
                    display: 'flex',
                    gap: 24,
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    paddingTop: 16,
                    borderTop: '1px solid rgba(26,26,26,0.06)'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={16} style={{ color: '#F59E0B' }} />
                      {worker.rating ? worker.rating.toFixed(1) : 'New'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Briefcase size={16} />
                      {worker.jobs_completed || 0} jobs
                    </span>
                    {worker.hourly_rate && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <DollarSign size={16} />
                        ${worker.hourly_rate}/hr
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 24
          }}
          onClick={() => { setShowApplyModal(null); setApplyMessage(''); setApplyError('') }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-xl)',
              padding: 32,
              maxWidth: 480,
              width: '100%',
              boxShadow: 'var(--shadow-xl)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {applySuccess ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  background: 'var(--success-bg)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Check size={32} style={{ color: 'var(--success)' }} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Application Sent!</h3>
                <p style={{ color: 'var(--text-secondary)' }}>The task creator will review your application.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Apply to Task</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{showApplyModal.title}</p>
                  </div>
                  <button
                    onClick={() => { setShowApplyModal(null); setApplyMessage(''); setApplyError('') }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4
                    }}
                  >
                    <X size={24} style={{ color: 'var(--text-tertiary)' }} />
                  </button>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 8,
                    color: 'var(--text-primary)'
                  }}>
                    Cover Letter (optional)
                  </label>
                  <textarea
                    placeholder="Why are you a good fit for this task? Share your relevant experience..."
                    value={applyMessage}
                    onChange={(e) => setApplyMessage(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: 120,
                      padding: 16,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(26,26,26,0.1)',
                      fontSize: 15,
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {applyError && (
                  <div style={{
                    padding: 12,
                    background: '#FEE2E2',
                    borderRadius: 'var(--radius-md)',
                    color: '#DC2626',
                    fontSize: 14,
                    marginBottom: 16
                  }}>
                    {applyError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => { setShowApplyModal(null); setApplyMessage(''); setApplyError('') }}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(26,26,26,0.1)',
                      background: 'white',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={applyLoading}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: applyLoading ? 'var(--text-tertiary)' : 'var(--coral-500)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: applyLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {applyLoading ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer-v4">
        <div className="footer-v4-inner">
          <div className="footer-v4-grid">
            <div className="footer-v4-brand">
              <a href="/" className="footer-v4-logo">
                <div className="footer-v4-logo-mark">irl</div>
                <span className="footer-v4-logo-name">irlwork.ai</span>
              </a>
              <p className="footer-v4-tagline">
                AI agents create work. Humans get paid.
              </p>
              <div className="footer-v4-social">
                <a
                  href="https://x.com/irlworkai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-v4-social-link"
                  aria-label="Follow us on X"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="footer-v4-column-title">Platform</h4>
              <div className="footer-v4-links">
                <a href="/dashboard" className="footer-v4-link">Browse Tasks</a>
                <a href="/auth" className="footer-v4-link">Sign Up</a>
                <a href="/browse" className="footer-v4-link">Browse Humans</a>
              </div>
            </div>

            <div>
              <h4 className="footer-v4-column-title">For Agents</h4>
              <div className="footer-v4-links">
                <a href="/mcp" className="footer-v4-link">API Docs</a>
                <a href="/mcp" className="footer-v4-link">MCP Protocol</a>
                <a href="/mcp" className="footer-v4-link">Integration</a>
              </div>
            </div>
          </div>

          <div className="footer-v4-bottom">
            <p className="footer-v4-copyright">© 2026 irlwork.ai</p>
            <div className="footer-v4-legal">
              <a href="/privacy" className="footer-v4-legal-link">Privacy</a>
              <a href="/terms" className="footer-v4-legal-link">Terms</a>
              <a href="/security" className="footer-v4-legal-link">Security</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
