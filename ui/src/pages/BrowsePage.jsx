import React, { useState, useEffect } from 'react'
import { MapPin, Clock, DollarSign, Star, Briefcase, Users, Filter, X, Check, Copy, Bot, User, ChevronRight } from 'lucide-react'
import { supabase } from '../App'
import { useToast } from '../context/ToastContext'
import CustomDropdown from '../components/CustomDropdown'
import HumanProfileCard from '../components/HumanProfileCard'
import HumanProfileModal from '../components/HumanProfileModal'

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
  const toast = useToast()
  const [viewMode, setViewMode] = useState('tasks') // 'tasks' or 'humans'
  const [tasks, setTasks] = useState([])
  const [humans, setHumans] = useState([])
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

  // Hire human modal state
  const [showHireModal, setShowHireModal] = useState(null) // human object or null
  const [hireMode, setHireMode] = useState(null) // 'agent' or 'human' or null
  const [hireTitle, setHireTitle] = useState('')
  const [hireDescription, setHireDescription] = useState('')
  const [hireBudget, setHireBudget] = useState('')
  const [hireCategory, setHireCategory] = useState('')
  const [hireLoading, setHireLoading] = useState(false)
  const [hireSuccess, setHireSuccess] = useState(false)
  const [hireError, setHireError] = useState('')

  // Expanded profile modal
  const [expandedHumanId, setExpandedHumanId] = useState(null)

  useEffect(() => {
    fetchData()

    // Real-time subscriptions (only if supabase is configured)
    let tasksChannel = null
    let humansChannel = null

    if (supabase) {
      tasksChannel = supabase
        .channel('browse-tasks')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload) => {
            if (viewMode !== 'tasks') return

            if (payload.eventType === 'INSERT' && payload.new.status === 'open') {
              setTasks(prev => [payload.new, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              if (payload.new.status !== 'open') {
                setTasks(prev => prev.filter(t => t.id !== payload.new.id))
              } else {
                setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t))
              }
            } else if (payload.eventType === 'DELETE') {
              setTasks(prev => prev.filter(t => t.id !== payload.old.id))
            }
          }
        )
        .subscribe()

      humansChannel = supabase
        .channel('browse-humans')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users' },
          (payload) => {
            if (viewMode !== 'humans') return
            if (payload.new?.type !== 'human') return

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setHumans(prev => {
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
    }

    return () => {
      if (tasksChannel) supabase.removeChannel(tasksChannel)
      if (humansChannel) supabase.removeChannel(humansChannel)
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
          const data = await res.json()
          // API returns { tasks: [...], total, hasMore }
          let taskList = Array.isArray(data) ? data : (data.tasks || [])
          // Sort
          if (sortBy === 'newest') {
            taskList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          } else if (sortBy === 'highest') {
            taskList.sort((a, b) => (b.budget || b.budget_cents/100) - (a.budget || a.budget_cents/100))
          }
          setTasks(taskList)
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
          setHumans(data)
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

  function resetHireForm() {
    setShowHireModal(null)
    setHireMode(null)
    setHireTitle('')
    setHireDescription('')
    setHireBudget('')
    setHireCategory('')
    setHireError('')
    setHireSuccess(false)
  }

  async function handleHire() {
    if (!user || !showHireModal) return
    if (!hireTitle.trim()) {
      setHireError('Please enter a task title.')
      return
    }
    if (!hireBudget || Number(hireBudget) <= 0) {
      setHireError('Please enter a valid budget.')
      return
    }

    setHireLoading(true)
    setHireError('')

    try {
      // Step 1: Create the task
      const createRes = await fetch(`${API_URL}/tasks/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({
          title: hireTitle.trim(),
          description: hireDescription.trim(),
          budget: Number(hireBudget),
          category: hireCategory || 'general'
        })
      })

      if (!createRes.ok) {
        const err = await createRes.json()
        throw new Error(err.error || 'Failed to create task')
      }

      const taskData = await createRes.json()
      const taskId = taskData.id || taskData.task?.id

      // Step 2: Assign the human to the task
      const assignRes = await fetch(`${API_URL}/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({ worker_id: showHireModal.id })
      })

      if (!assignRes.ok) {
        const err = await assignRes.json()
        throw new Error(err.error || 'Task created but failed to assign human')
      }

      setHireSuccess(true)
      toast.success(`${showHireModal.name} has been hired!`)
      setTimeout(() => {
        resetHireForm()
      }, 2500)
    } catch (e) {
      setHireError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setHireLoading(false)
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
            {viewMode === 'tasks' ? 'Available Tasks' : 'Browse Humans'}
          </h1>
          <p style={{
            fontSize: 18,
            color: 'var(--text-secondary)',
            maxWidth: 600,
            margin: '0 auto'
          }}>
            {viewMode === 'tasks'
              ? 'Find tasks in your area and start earning. No applications needed for most tasks.'
              : 'Discover skilled humans ready to help with your tasks.'}
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
            onClick={() => setViewMode('humans')}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: viewMode === 'humans' ? 'white' : 'transparent',
              color: viewMode === 'humans' ? 'var(--teal-700)' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: viewMode === 'humans' ? 'var(--shadow-md)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Users size={18} />
            Humans
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
                  onClick={() => navigate(`/tasks/${task.id}`)}
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

        {/* Humans Grid */}
        {!loading && viewMode === 'humans' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 24
          }}>
            {humans.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: 48,
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(26,26,26,0.06)'
              }}>
                <Users size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
                <p style={{ color: 'var(--text-secondary)' }}>No humans found.</p>
                <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Try adjusting your filters.</p>
              </div>
            ) : (
              humans.map(human => (
                <HumanProfileCard
                  key={human.id}
                  human={human}
                  variant="browse"
                  onExpand={(h) => window.location.href = `/humans/${h.id}`}
                  onHire={(h) => setShowHireModal(h)}
                />
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

      {/* Hire Human Modal */}
      {showHireModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 24
          }}
          onClick={resetHireForm}
        >
          <div
            style={{
              background: '#1a1a1a',
              borderRadius: 16,
              padding: 0,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success State */}
            {hireSuccess ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  background: 'rgba(16, 185, 129, 0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Check size={32} style={{ color: '#10B981' }} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: 'white', marginBottom: 8 }}>
                  Task Created & Assigned!
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                  {showHireModal.name} has been assigned to your task.
                </p>
              </div>
            ) : (
            <>
            {/* Header */}
            <div style={{
              padding: '24px 24px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white', marginBottom: 4 }}>
                    rent {showHireModal.name}
                  </h2>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                    how are you hiring this human?
                  </p>
                </div>
                <button
                  onClick={resetHireForm}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: 'rgba(255,255,255,0.5)'
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Options */}
            <div style={{ padding: 16 }}>
              {/* For AI Agent Option */}
              <button
                onClick={() => setHireMode(hireMode === 'agent' ? null : 'agent')}
                style={{
                  width: '100%',
                  padding: 16,
                  background: hireMode === 'agent' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                  border: hireMode === 'agent' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 8,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Bot size={20} style={{ color: 'white' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>for my AI agent</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>get a snippet to paste into your agent's chat</div>
                </div>
                <ChevronRight size={20} style={{
                  color: 'rgba(255,255,255,0.3)',
                  transform: hireMode === 'agent' ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} />
              </button>

              {/* Agent Mode Expanded Content */}
              {hireMode === 'agent' && (
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  marginTop: 8
                }}>
                  {/* Copyable Snippet */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 12
                  }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                      copy this and paste it into your AI agent's chat:
                    </span>
                    <button
                      onClick={() => {
                        const snippet = `I want to hire a human from irlwork.ai for a task.

Name: ${showHireModal.name}
Profile: https://www.irlwork.ai/humans/${showHireModal.id}
Skills: ${(showHireModal.skills || []).join(', ') || 'General'}
Rate: $${showHireModal.hourly_rate || 25}/hr

To contact this human, use the irlwork.ai MCP server. Add this to your MCP config:

{
  "mcpServers": {
    "irlwork": {
      "command": "npx",
      "args": ["irlwork-mcp"],
      "env": {
        "IRLWORK_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}

Then use the start_conversation tool with humanId "${showHireModal.id}" to message them.

Get your API key at: https://www.irlwork.ai/dashboard (API Keys tab)`
                        navigator.clipboard.writeText(snippet)
                        toast.success('Copied to clipboard!')
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 13
                      }}
                    >
                      <Copy size={14} /> copy
                    </button>
                  </div>

                  <div style={{
                    background: '#0d0d0d',
                    borderRadius: 8,
                    padding: 16,
                    fontFamily: 'monospace',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
{`I want to hire a human from irlwork.ai for a task.

Name: ${showHireModal.name}
Profile: https://www.irlwork.ai/humans/${showHireModal.id}
Skills: ${(showHireModal.skills || []).join(', ') || 'General'}
Rate: $${showHireModal.hourly_rate || 25}/hr

To contact this human, use the irlwork.ai MCP server. Add this to your MCP config:

{
  "mcpServers": {
    "irlwork": {
      "command": "npx",
      "args": ["irlwork-mcp"],
      "env": {
        "IRLWORK_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}

Then use the start_conversation tool with humanId "${showHireModal.id}" to message them.

Get your API key at: https://www.irlwork.ai/dashboard (API Keys tab)`}
                  </div>

                  {/* How to use */}
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: 14, color: '#10B981', fontWeight: 500, marginBottom: 12 }}>
                      how to use this
                    </div>
                    <ol style={{
                      margin: 0,
                      paddingLeft: 20,
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.7)',
                      lineHeight: 1.8
                    }}>
                      <li>Copy the snippet above</li>
                      <li>Paste it into your AI agent's chat (Claude, ChatGPT, etc.)</li>
                      <li>Your agent will set up the MCP server and contact this human</li>
                      <li>You'll need an <a href="/dashboard?tab=api-keys" style={{ color: '#10B981', textDecoration: 'underline' }}>API key</a> — get one from your dashboard</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* I'm a Human Option */}
              <button
                onClick={() => {
                  if (!user) {
                    navigate('/auth')
                    return
                  }
                  setHireMode(hireMode === 'human' ? null : 'human')
                }}
                style={{
                  width: '100%',
                  padding: 16,
                  background: hireMode === 'human' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                  border: hireMode === 'human' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={20} style={{ color: 'white' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>I'm a human</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>create a task and hire {showHireModal.name} directly</div>
                </div>
                <ChevronRight size={20} style={{
                  color: 'rgba(255,255,255,0.3)',
                  transform: hireMode === 'human' ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} />
              </button>

              {/* Human Hire Form */}
              {hireMode === 'human' && (
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 12,
                  padding: 20,
                  marginTop: 8
                }}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 500,
                      marginBottom: 6,
                      color: 'rgba(255,255,255,0.7)'
                    }}>
                      Task Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pick up my dry cleaning"
                      value={hireTitle}
                      onChange={(e) => setHireTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 500,
                      marginBottom: 6,
                      color: 'rgba(255,255,255,0.7)'
                    }}>
                      Description
                    </label>
                    <textarea
                      placeholder="Describe what you need done..."
                      value={hireDescription}
                      onChange={(e) => setHireDescription(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: 80,
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 6,
                        color: 'rgba(255,255,255,0.7)'
                      }}>
                        Budget ($) *
                      </label>
                      <input
                        type="number"
                        placeholder="50"
                        min="1"
                        value={hireBudget}
                        onChange={(e) => setHireBudget(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(255,255,255,0.05)',
                          color: 'white',
                          fontSize: 14,
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 6,
                        color: 'rgba(255,255,255,0.7)'
                      }}>
                        Category
                      </label>
                      <select
                        value={hireCategory}
                        onChange={(e) => setHireCategory(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(255,255,255,0.08)',
                          color: 'white',
                          fontSize: 14,
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="" style={{ background: '#1a1a1a' }}>Select...</option>
                        {categories.slice(1).map(cat => (
                          <option key={cat.value} value={cat.value} style={{ background: '#1a1a1a' }}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {hireError && (
                    <div style={{
                      padding: 12,
                      background: 'rgba(220, 38, 38, 0.15)',
                      borderRadius: 8,
                      color: '#FCA5A5',
                      fontSize: 13,
                      marginBottom: 16,
                      border: '1px solid rgba(220, 38, 38, 0.3)'
                    }}>
                      {hireError}
                    </div>
                  )}

                  <button
                    onClick={handleHire}
                    disabled={hireLoading}
                    style={{
                      width: '100%',
                      padding: 14,
                      borderRadius: 8,
                      border: 'none',
                      background: hireLoading ? 'rgba(255,255,255,0.1)' : 'var(--coral-500)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: hireLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { if (!hireLoading) e.currentTarget.style.background = 'var(--coral-600)' }}
                    onMouseOut={(e) => { if (!hireLoading) e.currentTarget.style.background = 'var(--coral-500)' }}
                  >
                    {hireLoading ? 'Creating task...' : `Hire ${showHireModal.name}`}
                  </button>
                </div>
              )}
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* Expanded Profile Modal */}
      {expandedHumanId && (
        <HumanProfileModal
          humanId={expandedHumanId}
          onClose={() => setExpandedHumanId(null)}
          onHire={(human) => {
            setExpandedHumanId(null)
            setShowHireModal(human)
          }}
          user={user}
        />
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
