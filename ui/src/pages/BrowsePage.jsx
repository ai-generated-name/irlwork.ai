import React, { useState, useEffect, useCallback, useRef } from 'react'
import { MapPin, Clock, DollarSign, Star, Briefcase, Users, X, Check, Copy, Bot, User, ChevronRight, ChevronLeft, Search, Globe, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import { supabase } from '../App'
import { useToast } from '../context/ToastContext'
import CustomDropdown from '../components/CustomDropdown'
import CityAutocomplete from '../components/CityAutocomplete'
import SkillAutocomplete from '../components/SkillAutocomplete'
import CountryAutocomplete from '../components/CountryAutocomplete'
import HumanProfileCard from '../components/HumanProfileCard'
import HumanProfileModal from '../components/HumanProfileModal'
import MarketingFooter from '../components/Footer'
import { fixAvatarUrl } from '../utils/avatarUrl'

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

const ITEMS_PER_PAGE = 16

const categories = [
  { value: '', label: 'All Skills' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'photography', label: 'Photography' },
  { value: 'data_collection', label: 'Data Collection' },
  { value: 'errands', label: 'Errands' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'moving', label: 'Moving' },
  { value: 'manual_labor', label: 'Manual Labor' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'tech', label: 'Tech' },
  { value: 'translation', label: 'Translation' },
  { value: 'verification', label: 'Verification' },
  { value: 'general', label: 'General' },
]

const sortOptions = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'most_reviewed', label: 'Most Reviewed' },
  { value: 'most_completed', label: 'Most Jobs Done' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
]

const taskSortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'highest', label: 'Highest Pay' },
]

function SkeletonCard() {
  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid rgba(26,26,26,0.06)',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      animation: 'browseShimmer 1.8s ease-in-out infinite',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--bg-tertiary)', opacity: 0.5 }} />
      {/* Header */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-tertiary)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 16, width: '70%', background: 'var(--bg-tertiary)', borderRadius: 6, marginBottom: 6 }} />
          <div style={{ height: 13, width: '50%', background: 'var(--bg-tertiary)', borderRadius: 6, marginBottom: 4 }} />
          <div style={{ height: 13, width: '40%', background: 'var(--bg-tertiary)', borderRadius: 6 }} />
        </div>
      </div>
      {/* Rating */}
      <div style={{ height: 20, width: 80, background: 'var(--bg-tertiary)', borderRadius: 999, marginBottom: 10 }} />
      {/* Social icons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--bg-tertiary)' }} />)}
      </div>
      {/* Bio */}
      <div style={{ height: 14, width: '100%', background: 'var(--bg-tertiary)', borderRadius: 6, marginBottom: 6 }} />
      <div style={{ height: 14, width: '80%', background: 'var(--bg-tertiary)', borderRadius: 6, marginBottom: 16 }} />
      {/* Skills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <div style={{ height: 28, width: 72, background: 'var(--bg-tertiary)', borderRadius: 999 }} />
        <div style={{ height: 28, width: 56, background: 'var(--bg-tertiary)', borderRadius: 999 }} />
        <div style={{ height: 28, width: 64, background: 'var(--bg-tertiary)', borderRadius: 999 }} />
      </div>
      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid rgba(26,26,26,0.06)', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ height: 24, width: 60, background: 'var(--bg-tertiary)', borderRadius: 6 }} />
        <div style={{ height: 38, width: 72, background: 'var(--bg-tertiary)', borderRadius: 10 }} />
      </div>
    </div>
  )
}

export default function BrowsePage({ user, navigate: navigateProp }) {
  const toast = useToast()
  // Parse mode from URL path: /browse/tasks or /browse/humans (default: tasks)
  // Also support legacy ?mode= query param for backwards compat
  const getInitialMode = () => {
    const path = window.location.pathname
    if (path === '/browse/humans') return 'humans'
    if (path === '/browse/tasks') return 'tasks'
    // Legacy query param support
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('mode') === 'humans') return 'humans'
    return 'tasks'
  }
  const [viewMode, setViewMode] = useState(getInitialMode)
  const gridRef = useRef(null)

  // Humans state
  const [humans, setHumans] = useState([])
  const [humansTotal, setHumansTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [humansLoading, setHumansLoading] = useState(true)

  // Humans filters
  const [skillFilter, setSkillFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [countryInput, setCountryInput] = useState('')
  const [maxRate, setMaxRate] = useState('')
  const [humanSort, setHumanSort] = useState('rating')

  // Debounced values
  const [debouncedCountry, setDebouncedCountry] = useState('')
  const [debouncedMaxRate, setDebouncedMaxRate] = useState('')

  // Tasks state
  const [tasks, setTasks] = useState([])
  const [tasksTotal, setTasksTotal] = useState(0)
  const [taskCurrentPage, setTaskCurrentPage] = useState(1)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('')
  const [taskCityFilter, setTaskCityFilter] = useState('')
  const [taskSearchQuery, setTaskSearchQuery] = useState('')
  const [debouncedTaskSearch, setDebouncedTaskSearch] = useState('')
  const [taskSortBy, setTaskSortBy] = useState('newest')
  const [userLocation, setUserLocation] = useState(null) // { lat, lng }
  const [locationLoading, setLocationLoading] = useState(false)
  const [nearMeActive, setNearMeActive] = useState(false)
  const [nearMeRadius, setNearMeRadius] = useState(25) // km

  // Apply modal state
  const [showApplyModal, setShowApplyModal] = useState(null) // task object or null
  const [applyWhyFit, setApplyWhyFit] = useState('')
  const [applyAvailability, setApplyAvailability] = useState('')
  const [applyQuestions, setApplyQuestions] = useState('')
  const [applyCounterOffer, setApplyCounterOffer] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)
  const [applyError, setApplyError] = useState('')

  // Hire human modal state
  const [showHireModal, setShowHireModal] = useState(null)
  const [hireMode, setHireMode] = useState(null)
  const [hireTitle, setHireTitle] = useState('')
  const [hireDescription, setHireDescription] = useState('')
  const [hireBudget, setHireBudget] = useState('')
  const [hireCategory, setHireCategory] = useState('')
  const [hireLoading, setHireLoading] = useState(false)
  const [hireSuccess, setHireSuccess] = useState(false)
  const [hireError, setHireError] = useState('')

  // Expanded profile modal
  const [expandedHumanId, setExpandedHumanId] = useState(null)

  // Debounce country input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCountry(countryInput.trim()), 400)
    return () => clearTimeout(t)
  }, [countryInput])

  // Debounce max rate input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedMaxRate(maxRate), 400)
    return () => clearTimeout(t)
  }, [maxRate])

  // Debounce task search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTaskSearch(taskSearchQuery.trim()), 400)
    return () => clearTimeout(t)
  }, [taskSearchQuery])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [skillFilter, cityFilter, debouncedCountry, debouncedMaxRate, humanSort])

  // Fetch humans
  useEffect(() => {
    if (viewMode !== 'humans') return
    fetchHumans()
  }, [viewMode, currentPage, skillFilter, cityFilter, debouncedCountry, debouncedMaxRate, humanSort])

  // Handle "Near Me" toggle
  const handleNearMe = () => {
    if (nearMeActive) {
      setNearMeActive(false)
      setUserLocation(null)
      return
    }
    if (!navigator.geolocation) return
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setNearMeActive(true)
        setLocationLoading(false)
      },
      () => { setLocationLoading(false) },
      { timeout: 10000 }
    )
  }

  // Reset task page when task filters change
  useEffect(() => {
    setTaskCurrentPage(1)
  }, [taskCategoryFilter, taskCityFilter, debouncedTaskSearch, taskSortBy, nearMeActive, nearMeRadius])

  // Fetch tasks
  useEffect(() => {
    if (viewMode !== 'tasks') return
    fetchTasks()
  }, [viewMode, taskCategoryFilter, taskCityFilter, debouncedTaskSearch, taskSortBy, nearMeActive, nearMeRadius, taskCurrentPage])

  // Real-time subscriptions
  useEffect(() => {
    let tasksChannel = null
    let humansChannel = null

    if (supabase) {
      tasksChannel = supabase
        .channel('browse-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
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
        })
        .subscribe()

      humansChannel = supabase
        .channel('browse-humans')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
          if (viewMode !== 'humans') return
          if (payload.new?.type !== 'human') return
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setHumans(prev => {
              const exists = prev.find(w => w.id === payload.new.id)
              if (exists) return prev.map(w => w.id === payload.new.id ? payload.new : w)
              return [payload.new, ...prev]
            })
          }
        })
        .subscribe()
    }

    return () => {
      if (tasksChannel) supabase.removeChannel(tasksChannel)
      if (humansChannel) supabase.removeChannel(humansChannel)
    }
  }, [viewMode])

  async function fetchHumans() {
    setHumansLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(ITEMS_PER_PAGE))
      params.set('offset', String((currentPage - 1) * ITEMS_PER_PAGE))
      params.set('sort', humanSort)
      if (skillFilter) params.set('skill', skillFilter)
      if (cityFilter) params.set('city', cityFilter)
      if (debouncedCountry) params.set('country', debouncedCountry)
      if (debouncedMaxRate) params.set('max_rate', debouncedMaxRate)

      const headers = {}
      if (user?.id) headers['Authorization'] = user.id

      const res = await fetch(`${API_URL}/humans/directory?${params}`, { headers })
      if (res.ok) {
        const data = await res.json()
        // Handle both old array format and new object format
        if (Array.isArray(data)) {
          setHumans(fixAvatarUrl(data))
          setHumansTotal(data.length)
        } else {
          setHumans(fixAvatarUrl(data.humans || []))
          setHumansTotal(data.total || 0)
        }
      }
    } catch (e) {
      console.error('Error fetching humans:', e)
    } finally {
      setHumansLoading(false)
    }
  }

  async function fetchTasks() {
    setTasksLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(ITEMS_PER_PAGE))
      params.set('offset', String((taskCurrentPage - 1) * ITEMS_PER_PAGE))
      if (taskCategoryFilter) params.append('category', taskCategoryFilter)
      if (taskCityFilter) params.append('city', taskCityFilter)
      if (debouncedTaskSearch) params.append('search', debouncedTaskSearch)
      if (taskSortBy === 'newest') params.append('sort', 'newest')
      else if (taskSortBy === 'highest') params.append('sort', 'pay_high')
      if (nearMeActive && userLocation) {
        params.append('user_lat', userLocation.lat)
        params.append('user_lng', userLocation.lng)
        params.append('radius_km', nearMeRadius)
        params.set('sort', 'distance')
      }

      const res = await fetch(`${API_URL}/tasks/available?${params}`)
      if (res.ok) {
        const data = await res.json()
        const taskList = Array.isArray(data) ? data : (data.tasks || [])
        setTasks(taskList)
        setTasksTotal(data.total || taskList.length)
      }
    } catch (e) {
      console.error('Error fetching tasks:', e)
    } finally {
      setTasksLoading(false)
    }
  }

  async function handleApply() {
    if (!user || !showApplyModal) return
    if (!applyWhyFit.trim() || !applyAvailability.trim()) return

    setApplyLoading(true)
    setApplyError('')
    try {
      const res = await fetch(`${API_URL}/tasks/${showApplyModal.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.id
        },
        body: JSON.stringify({
          cover_letter: applyWhyFit.trim(),
          availability: applyAvailability.trim(),
          questions: applyQuestions.trim() || null,
          proposed_rate: applyCounterOffer ? parseFloat(applyCounterOffer) : null,
        })
      })
      if (res.ok) {
        setApplySuccess(true)
        setTimeout(() => {
          setShowApplyModal(null)
          setApplyWhyFit('')
          setApplyAvailability('')
          setApplyQuestions('')
          setApplyCounterOffer('')
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
    if (!hireTitle.trim()) { setHireError('Please enter a task title.'); return }
    if (!hireBudget || Number(hireBudget) <= 0) { setHireError('Please enter a valid budget.'); return }
    setHireLoading(true)
    setHireError('')
    try {
      const createRes = await fetch(`${API_URL}/tasks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || user.id },
        body: JSON.stringify({ title: hireTitle.trim(), description: hireDescription.trim(), budget: Number(hireBudget), category: hireCategory || 'general' })
      })
      if (!createRes.ok) { const err = await createRes.json(); throw new Error(err.error || 'Failed to create task') }
      const taskData = await createRes.json()
      const taskId = taskData.id || taskData.task?.id
      const assignRes = await fetch(`${API_URL}/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || user.id },
        body: JSON.stringify({ worker_id: showHireModal.id })
      })
      if (!assignRes.ok) { const err = await assignRes.json(); throw new Error(err.error || 'Task created but failed to assign human') }
      setHireSuccess(true)
      toast.success(`${showHireModal.name} has been hired!`)
      setTimeout(() => { resetHireForm() }, 2500)
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

  const navigate = navigateProp || ((path) => { window.location.href = path })

  // Pagination
  const totalPages = Math.max(1, Math.ceil(humansTotal / ITEMS_PER_PAGE))
  const startItem = humansTotal === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, humansTotal)

  function goToPage(page) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function getPageNumbers() {
    const pages = []
    const maxVisible = 7
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  // Task pagination
  const taskTotalPages = Math.max(1, Math.ceil(tasksTotal / ITEMS_PER_PAGE))
  const taskStartItem = tasksTotal === 0 ? 0 : (taskCurrentPage - 1) * ITEMS_PER_PAGE + 1
  const taskEndItem = Math.min(taskCurrentPage * ITEMS_PER_PAGE, tasksTotal)

  function goToTaskPage(page) {
    if (page < 1 || page > taskTotalPages) return
    setTaskCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function getTaskPageNumbers() {
    const pages = []
    const maxVisible = 7
    if (taskTotalPages <= maxVisible) {
      for (let i = 1; i <= taskTotalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (taskCurrentPage > 3) pages.push('...')
      const start = Math.max(2, taskCurrentPage - 1)
      const end = Math.min(taskTotalPages - 1, taskCurrentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (taskCurrentPage < taskTotalPages - 2) pages.push('...')
      pages.push(taskTotalPages)
    }
    return pages
  }

  // Active filter pills
  const activeFilters = []
  if (skillFilter) {
    const label = categories.find(c => c.value === skillFilter)?.label || skillFilter
    activeFilters.push({ key: 'skill', label: `Skill: ${label}`, clear: () => setSkillFilter('') })
  }
  if (cityFilter) activeFilters.push({ key: 'city', label: `City: ${cityFilter}`, clear: () => setCityFilter('') })
  if (debouncedCountry) activeFilters.push({ key: 'country', label: `Country: ${debouncedCountry}`, clear: () => { setCountryInput(''); setDebouncedCountry('') } })
  if (debouncedMaxRate) activeFilters.push({ key: 'rate', label: `Max $${debouncedMaxRate}/hr`, clear: () => { setMaxRate(''); setDebouncedMaxRate('') } })

  const inputStyle = {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid rgba(26,26,26,0.1)',
    fontSize: 14,
    fontFamily: 'inherit',
    background: 'white',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div className="landing-v4" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav className="navbar-v4">
        <a href="/" className="logo-v4">
          <div className="logo-mark-v4">irl</div>
          <span className="logo-name-v4">irlwork.ai</span>
        </a>
        <div className="nav-links-v4">
          <a href="/connect-agent" className="nav-link-v4">For Agents</a>
          <a href="/browse/tasks" className="nav-link-v4" style={{ color: 'var(--coral-500)' }}>Browse</a>
          {user ? (
            <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/dashboard')}>Dashboard</button>
          ) : (
            <button className="btn-v4 btn-v4-primary btn-v4-sm" onClick={() => navigate('/auth')}>Join Now</button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '110px 24px 48px', flex: 1, width: '100%', boxSizing: 'border-box' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 44,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 12,
            lineHeight: 1.15
          }}>
            {viewMode === 'tasks' ? 'Available Tasks' : 'Browse Humans'}
          </h1>
          <p style={{
            fontSize: 17,
            color: 'var(--text-secondary)',
            maxWidth: 560,
            margin: '0 auto',
            lineHeight: 1.5
          }}>
            {viewMode === 'tasks'
              ? 'Find tasks in your area and start earning.'
              : 'Discover skilled humans ready to help with your tasks.'}
          </p>
        </div>

        {/* View Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 4,
          marginBottom: 28,
          background: 'var(--bg-tertiary)',
          padding: 4,
          borderRadius: 'var(--radius-full)',
          width: 'fit-content',
          margin: '0 auto 28px'
        }}>
          <button
            onClick={() => { setViewMode('tasks'); navigate('/browse/tasks') }}
            style={{
              padding: '10px 22px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: viewMode === 'tasks' ? 'white' : 'transparent',
              color: viewMode === 'tasks' ? 'var(--teal-700)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: viewMode === 'tasks' ? 'var(--shadow-md)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Briefcase size={16} />
            Tasks
          </button>
          <button
            onClick={() => { setViewMode('humans'); navigate('/browse/humans') }}
            style={{
              padding: '10px 22px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: viewMode === 'humans' ? 'white' : 'transparent',
              color: viewMode === 'humans' ? 'var(--teal-700)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: viewMode === 'humans' ? 'var(--shadow-md)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Users size={16} />
            Humans
          </button>
        </div>

        {/* ===== HUMANS VIEW ===== */}
        {viewMode === 'humans' && (
          <>
            {/* Filter Bar */}
            <div style={{
              background: 'white',
              borderRadius: 14,
              border: '1px solid rgba(26,26,26,0.06)',
              padding: '16px 20px',
              marginBottom: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 12,
                alignItems: 'end',
              }}
                className="browse-filter-grid"
              >
                {/* Skill / Category */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Skill
                  </label>
                  <SkillAutocomplete
                    value={skillFilter}
                    onChange={setSkillFilter}
                    placeholder="Search skills..."
                    allLabel="All Skills"
                  />
                </div>

                {/* City */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    City
                  </label>
                  <CityAutocomplete
                    value={cityFilter}
                    onChange={(cityData) => {
                      setCityFilter(cityData.city || '')
                    }}
                    placeholder="Search city..."
                  />
                </div>

                {/* Country */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Country
                  </label>
                  <CountryAutocomplete
                    value={countryInput}
                    onChange={setCountryInput}
                    placeholder="Any country..."
                  />
                </div>

                {/* Max Rate */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Max $/hr
                  </label>
                  <input
                    type="number"
                    placeholder="No limit"
                    min="1"
                    value={maxRate}
                    onChange={(e) => setMaxRate(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px rgba(15,76,92,0.08)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(26,26,26,0.1)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>

                {/* Sort */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Sort By
                  </label>
                  <CustomDropdown
                    value={humanSort}
                    onChange={setHumanSort}
                    options={sortOptions}
                    placeholder="Top Rated"
                  />
                </div>
              </div>
            </div>

            {/* Active Filter Pills + Result Count */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              minHeight: 32,
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {activeFilters.map(f => (
                  <button
                    key={f.key}
                    onClick={f.clear}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      background: 'rgba(15,76,92,0.08)',
                      border: '1px solid rgba(15,76,92,0.12)',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--teal)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(15,76,92,0.14)' }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(15,76,92,0.08)' }}
                  >
                    {f.label}
                    <X size={13} style={{ opacity: 0.6 }} />
                  </button>
                ))}
                {activeFilters.length > 1 && (
                  <button
                    onClick={() => {
                      setSkillFilter('')
                      setCityFilter('')
                      setCountryInput(''); setDebouncedCountry('')
                      setMaxRate(''); setDebouncedMaxRate('')
                    }}
                    style={{
                      padding: '5px 12px',
                      background: 'none',
                      border: 'none',
                      fontSize: 13,
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {humansLoading ? '...' : humansTotal === 0 ? 'No results' : `Showing ${startItem}\u2013${endItem} of ${humansTotal} humans`}
              </span>
            </div>

            {/* Humans Grid */}
            <div ref={gridRef}>
              {humansLoading ? (
                <div
                  className="browse-humans-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 20,
                  }}
                >
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : humans.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '64px 24px',
                  background: 'white',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(26,26,26,0.06)',
                }}>
                  <Users size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: 16, fontWeight: 500, marginBottom: 4 }}>No humans found</p>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Try adjusting your filters or search criteria.</p>
                </div>
              ) : (
                <div
                  className="browse-humans-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 20,
                  }}
                >
                  {humans.map(human => (
                    <HumanProfileCard
                      key={human.id}
                      human={human}
                      variant="browse"
                      onExpand={(h) => window.location.href = `/humans/${h.id}`}
                      onHire={(h) => setShowHireModal(h)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!humansLoading && humansTotal > ITEMS_PER_PAGE && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
                marginTop: 40,
                marginBottom: 8,
              }}>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    border: '1px solid rgba(26,26,26,0.1)',
                    background: 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.4 : 1,
                    transition: 'all 0.15s',
                    color: 'var(--text-primary)',
                  }}
                  onMouseOver={(e) => { if (currentPage !== 1) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
                >
                  <ChevronLeft size={18} />
                </button>

                {getPageNumbers().map((page, idx) =>
                  page === '...' ? (
                    <span key={`dots-${idx}`} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        border: page === currentPage ? '1px solid var(--coral-500)' : '1px solid rgba(26,26,26,0.08)',
                        background: page === currentPage ? 'var(--coral-500)' : 'white',
                        color: page === currentPage ? 'white' : 'var(--text-primary)',
                        fontWeight: page === currentPage ? 700 : 500,
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseOver={(e) => { if (page !== currentPage) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                      onMouseOut={(e) => { if (page !== currentPage) e.currentTarget.style.background = 'white' }}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    border: '1px solid rgba(26,26,26,0.1)',
                    background: 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    transition: 'all 0.15s',
                    color: 'var(--text-primary)',
                  }}
                  onMouseOver={(e) => { if (currentPage !== totalPages) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== TASKS VIEW ===== */}
        {viewMode === 'tasks' && (
          <>
            {/* Task Filters */}
            <div style={{
              display: 'flex',
              gap: 12,
              marginBottom: 32,
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <div style={{ position: 'relative', minWidth: 220 }}>
                <Search size={16} style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  pointerEvents: 'none'
                }} />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="city-autocomplete-v4-input"
                  style={{ minWidth: 220, paddingLeft: 36 }}
                />
              </div>
              <div style={{ minWidth: 160 }}>
                <SkillAutocomplete
                  value={taskCategoryFilter}
                  onChange={setTaskCategoryFilter}
                  placeholder="Search categories..."
                  allLabel="All Categories"
                />
              </div>
              <input
                type="text"
                placeholder="City or location..."
                value={taskCityFilter}
                onChange={(e) => setTaskCityFilter(e.target.value)}
                className="city-autocomplete-v4-input"
                style={{ minWidth: 180 }}
              />
              <button
                onClick={handleNearMe}
                disabled={locationLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: nearMeActive ? '2px solid var(--coral-500)' : '1px solid rgba(26,26,26,0.1)',
                  background: nearMeActive ? 'rgba(224, 122, 95, 0.08)' : 'white',
                  color: nearMeActive ? 'var(--coral-600)' : 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: nearMeActive ? 600 : 400,
                  cursor: locationLoading ? 'wait' : 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <MapPin size={15} />
                {locationLoading ? 'Locating...' : nearMeActive ? `Near Me (${nearMeRadius}km)` : 'Near Me'}
              </button>
              <div style={{ minWidth: 150 }}>
                <CustomDropdown
                  value={taskSortBy}
                  onChange={setTaskSortBy}
                  options={taskSortOptions}
                  placeholder="Newest First"
                />
              </div>
            </div>

            {/* Tasks Loading */}
            {tasksLoading && (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{
                  width: 40, height: 40,
                  border: '3px solid var(--coral-500)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }} />
                <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
              </div>
            )}

            {/* Tasks Result Count */}
            {!tasksLoading && tasks.length > 0 && (
              <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, textAlign: 'right' }}>
                {tasksTotal === 0 ? 'No results' : `Showing ${taskStartItem}\u2013${taskEndItem} of ${tasksTotal} tasks`}
              </div>
            )}

            {/* Tasks Grid */}
            {!tasksLoading && (
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <span style={{
                          padding: '4px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)',
                          fontSize: 12, fontWeight: 500, color: 'var(--teal-700)', textTransform: 'capitalize'
                        }}>
                          {task.category || 'General'}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {task.task_type === 'open' && (
                            <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 500, background: 'rgba(139, 92, 246, 0.1)', color: '#7C3AED' }}>Open</span>
                          )}
                          {task.quantity > 1 && (
                            <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 500, background: 'rgba(59, 130, 246, 0.1)', color: '#2563EB' }}>
                              {task.spots_filled || 0}/{task.quantity} spots
                            </span>
                          )}
                        </div>
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.3 }}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p style={{
                          fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                        }}>
                          {task.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
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
                        {task.deadline && (() => {
                          const diffMs = new Date(task.deadline) - new Date();
                          if (diffMs < 0) return null; // Past deadline tasks are auto-expired
                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                          let label, bg, color;
                          if (diffHours < 1) { label = 'Due in < 1 hour'; bg = '#FEF3C7'; color = '#D97706'; }
                          else if (diffHours < 24) { label = `Due in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`; bg = '#FEF3C7'; color = '#D97706'; }
                          else if (diffDays <= 3) { label = `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`; bg = '#FEF3C7'; color = '#B45309'; }
                          else { label = `Due in ${diffDays} days`; bg = '#F0F9FF'; color = '#0369A1'; }
                          return (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 10px', borderRadius: 'var(--radius-full)',
                              fontSize: 12, fontWeight: 600, background: bg, color
                            }}>
                              <Clock size={12} />
                              {label}
                            </span>
                          );
                        })()}
                      </div>
                      <div style={{ paddingTop: 16, borderTop: '1px solid rgba(26,26,26,0.06)', marginBottom: 16, fontSize: 13, color: 'var(--text-tertiary)' }}>
                        Posted by <strong style={{ color: 'var(--text-secondary)' }}>{task.is_anonymous ? 'Anon AI Agent' : (task.agent?.name || task.agent?.organization || 'Anonymous')}</strong>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!user) { navigate('/auth'); return }
                          setShowApplyModal(task)
                        }}
                        style={{
                          width: '100%', padding: '14px', background: 'var(--coral-500)', color: 'white',
                          fontWeight: 600, fontSize: 15, borderRadius: 'var(--radius-md)', border: 'none',
                          cursor: 'pointer', transition: 'all 0.2s'
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

            {/* Task Pagination */}
            {!tasksLoading && tasksTotal > ITEMS_PER_PAGE && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
                marginTop: 40,
                marginBottom: 8,
              }}>
                <button
                  onClick={() => goToTaskPage(taskCurrentPage - 1)}
                  disabled={taskCurrentPage === 1}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 38, height: 38, borderRadius: 10,
                    border: '1px solid rgba(26,26,26,0.1)', background: 'white',
                    cursor: taskCurrentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: taskCurrentPage === 1 ? 0.4 : 1,
                    transition: 'all 0.15s', color: 'var(--text-primary)',
                  }}
                  onMouseOver={(e) => { if (taskCurrentPage !== 1) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
                >
                  <ChevronLeft size={18} />
                </button>
                {getTaskPageNumbers().map((page, idx) =>
                  page === '...' ? (
                    <span key={`dots-${idx}`} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToTaskPage(page)}
                      style={{
                        width: 38, height: 38, borderRadius: 10,
                        border: page === taskCurrentPage ? '1px solid var(--coral-500)' : '1px solid rgba(26,26,26,0.08)',
                        background: page === taskCurrentPage ? 'var(--coral-500)' : 'white',
                        color: page === taskCurrentPage ? 'white' : 'var(--text-primary)',
                        fontWeight: page === taskCurrentPage ? 700 : 500,
                        fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseOver={(e) => { if (page !== taskCurrentPage) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                      onMouseOut={(e) => { if (page !== taskCurrentPage) e.currentTarget.style.background = 'white' }}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => goToTaskPage(taskCurrentPage + 1)}
                  disabled={taskCurrentPage === taskTotalPages}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 38, height: 38, borderRadius: 10,
                    border: '1px solid rgba(26,26,26,0.1)', background: 'white',
                    cursor: taskCurrentPage === taskTotalPages ? 'not-allowed' : 'pointer',
                    opacity: taskCurrentPage === taskTotalPages ? 0.4 : 1,
                    transition: 'all 0.15s', color: 'var(--text-primary)',
                  }}
                  onMouseOver={(e) => { if (taskCurrentPage !== taskTotalPages) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
          onClick={() => { setShowApplyModal(null); setApplyMessage(''); setApplyError('') }}
        >
          <div
            style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: 32, maxWidth: 480, width: '100%', boxShadow: 'var(--shadow-xl)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {applySuccess ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ width: 64, height: 64, background: 'var(--success-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
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
                    onClick={() => { setShowApplyModal(null); setApplyWhyFit(''); setApplyAvailability(''); setApplyQuestions(''); setApplyCounterOffer(''); setApplyError('') }}
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

                {/* 1. Why you're a good fit (required) */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 8,
                    color: 'var(--text-primary)'
                  }}>
                    Why you're a good fit <span style={{ color: 'var(--coral-500)' }}>*</span>
                  </label>
                  <textarea
                    placeholder="Share relevant experience, skills, or why you're the right person for this task..."
                    value={applyWhyFit}
                    onChange={(e) => setApplyWhyFit(e.target.value)}
                    maxLength={500}
                    style={{
                      width: '100%',
                      minHeight: 80,
                      padding: 12,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(26,26,26,0.1)',
                      fontSize: 14,
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* 2. Confirm availability (required) */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 8,
                    color: 'var(--text-primary)'
                  }}>
                    Confirm availability <span style={{ color: 'var(--coral-500)' }}>*</span>
                  </label>
                  <textarea
                    placeholder="When can you start? How soon can you complete this?"
                    value={applyAvailability}
                    onChange={(e) => setApplyAvailability(e.target.value)}
                    maxLength={200}
                    style={{
                      width: '100%',
                      minHeight: 56,
                      padding: 12,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(26,26,26,0.1)',
                      fontSize: 14,
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* 3. Questions about the task (optional) */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 8,
                    color: 'var(--text-secondary)'
                  }}>
                    Questions about the task
                  </label>
                  <textarea
                    placeholder="Any questions or clarifications needed?"
                    value={applyQuestions}
                    onChange={(e) => setApplyQuestions(e.target.value)}
                    maxLength={300}
                    style={{
                      width: '100%',
                      minHeight: 56,
                      padding: 12,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(26,26,26,0.1)',
                      fontSize: 14,
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* 4. Counter offer (optional) */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 8,
                    color: 'var(--text-secondary)'
                  }}>
                    Counter offer
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid rgba(26,26,26,0.1)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden'
                  }}>
                    <span style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={applyCounterOffer}
                      onChange={(e) => setApplyCounterOffer(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: 'none',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />
                    <span style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)' }}>USDC</span>
                  </div>
                  <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
                    Task budget: ${showApplyModal.budget || 0} USDC
                  </span>
                </div>

                {applyError && (
                  <div style={{ padding: 12, background: '#FEE2E2', borderRadius: 'var(--radius-md)', color: '#DC2626', fontSize: 14, marginBottom: 16 }}>{applyError}</div>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => { setShowApplyModal(null); setApplyWhyFit(''); setApplyAvailability(''); setApplyQuestions(''); setApplyCounterOffer(''); setApplyError('') }}
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
                    disabled={applyLoading || !applyWhyFit.trim() || !applyAvailability.trim()}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: (applyLoading || !applyWhyFit.trim() || !applyAvailability.trim()) ? 'var(--text-tertiary)' : 'var(--coral-500)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: (applyLoading || !applyWhyFit.trim() || !applyAvailability.trim()) ? 'not-allowed' : 'pointer'
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
          onClick={resetHireForm}
        >
          <div
            style={{ background: '#1a1a1a', borderRadius: 16, padding: 0, maxWidth: 480, width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {hireSuccess ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, background: 'rgba(16, 185, 129, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Check size={32} style={{ color: '#10B981' }} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: 'white', marginBottom: 8 }}>Task Created & Assigned!</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{showHireModal.name} has been assigned to your task.</p>
              </div>
            ) : (
            <>
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: 'white', marginBottom: 4 }}>rent {showHireModal.name}</h2>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>how are you hiring this human?</p>
                </div>
                <button onClick={resetHireForm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.5)' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {/* For AI Agent Option */}
              <button
                onClick={() => setHireMode(hireMode === 'agent' ? null : 'agent')}
                style={{
                  width: '100%', padding: 16,
                  background: hireMode === 'agent' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                  border: hireMode === 'agent' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, transition: 'all 0.2s'
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={20} style={{ color: 'white' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>for my AI agent</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>get a snippet to paste into your agent's chat</div>
                </div>
                <ChevronRight size={20} style={{ color: 'rgba(255,255,255,0.3)', transform: hireMode === 'agent' ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>

              {hireMode === 'agent' && (
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, marginBottom: 16, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>copy this and paste it into your AI agent's chat:</span>
                    <button
                      onClick={() => {
                        const snippet = `I want to hire a human from irlwork.ai for a task.\n\nName: ${showHireModal.name}\nProfile: https://www.irlwork.ai/humans/${showHireModal.id}\nSkills: ${(showHireModal.skills || []).join(', ') || 'General'}\nRate: $${showHireModal.hourly_rate || 25}/hr\n\nTo contact this human, use the irlwork.ai API.\n\nIf you don't have an API key yet, help me set one up:\n- Open https://www.irlwork.ai/dashboard/hiring/api-keys in my browser\n- If I'm not logged in, I'll be prompted to sign up first\n- I can generate an API key from that page and paste it back here\n\nOnce you have the API key, call the API like this:\n\ncurl -X POST https://api.irlwork.ai/api/mcp \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"method": "start_conversation", "params": {"human_id": "${showHireModal.id}"}}'\n\nUse the start_conversation method with human_id "${showHireModal.id}" to message them.`
                        navigator.clipboard.writeText(snippet)
                        toast.success('Copied to clipboard!')
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}
                    >
                      <Copy size={14} /> copy
                    </button>
                  </div>
                  <div style={{ background: '#0d0d0d', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{`I want to hire a human from irlwork.ai for a task.

Name: ${showHireModal.name}
Profile: https://www.irlwork.ai/humans/${showHireModal.id}
Skills: ${(showHireModal.skills || []).join(', ') || 'General'}
Rate: $${showHireModal.hourly_rate || 25}/hr

To contact this human, use the irlwork.ai API.

If you don't have an API key yet, help me set one up:
- Open https://www.irlwork.ai/dashboard/hiring/api-keys in my browser
- If I'm not logged in, I'll be prompted to sign up first
- I can generate an API key from that page and paste it back here

Once you have the API key, call the API:

POST https://api.irlwork.ai/api/mcp
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{"method": "start_conversation", "params": {"human_id": "${showHireModal.id}"}}

Use the start_conversation method with human_id "${showHireModal.id}" to message them.`}
                  </div>
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: 14, color: '#10B981', fontWeight: 500, marginBottom: 12 }}>how to use this</div>
                    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
                      <li>Copy the snippet above</li>
                      <li>Paste it into your AI agent's chat (Claude, ChatGPT, etc.)</li>
                      <li>Your agent will help you create an account and get an API key</li>
                      <li>Once set up, your agent will contact this human for you</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* I'm a Human Option */}
              <button
                onClick={() => {
                  if (!user) { navigate('/auth'); return }
                  setHireMode(hireMode === 'human' ? null : 'human')
                }}
                style={{
                  width: '100%', padding: 16,
                  background: hireMode === 'human' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                  border: hireMode === 'human' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s'
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #F59E0B, #D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} style={{ color: 'white' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: 'white', fontSize: 15 }}>I'm a human</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>create a task and hire {showHireModal.name} directly</div>
                </div>
                <ChevronRight size={20} style={{ color: 'rgba(255,255,255,0.3)', transform: hireMode === 'human' ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>

              {hireMode === 'human' && (
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 20, marginTop: 8 }}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'rgba(255,255,255,0.7)' }}>Task Title *</label>
                    <input type="text" placeholder="e.g. Pick up my dry cleaning" value={hireTitle} onChange={(e) => setHireTitle(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'rgba(255,255,255,0.7)' }}>Description</label>
                    <textarea placeholder="Describe what you need done..." value={hireDescription} onChange={(e) => setHireDescription(e.target.value)}
                      style={{ width: '100%', minHeight: 80, padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'rgba(255,255,255,0.7)' }}>Budget ($) *</label>
                      <input type="number" placeholder="50" min="1" value={hireBudget} onChange={(e) => setHireBudget(e.target.value)}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'rgba(255,255,255,0.7)' }}>Category</label>
                      <select value={hireCategory} onChange={(e) => setHireCategory(e.target.value)}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
                        <option value="" style={{ background: '#1a1a1a' }}>Select...</option>
                        {categories.slice(1).map(cat => (
                          <option key={cat.value} value={cat.value} style={{ background: '#1a1a1a' }}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {hireError && (
                    <div style={{ padding: 12, background: 'rgba(220, 38, 38, 0.15)', borderRadius: 8, color: '#FCA5A5', fontSize: 13, marginBottom: 16, border: '1px solid rgba(220, 38, 38, 0.3)' }}>{hireError}</div>
                  )}
                  <button onClick={handleHire} disabled={hireLoading}
                    style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: hireLoading ? 'rgba(255,255,255,0.1)' : 'var(--coral-500)', color: 'white', fontWeight: 600, fontSize: 15, cursor: hireLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
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
          onHire={(human) => { setExpandedHumanId(null); setShowHireModal(human) }}
          user={user}
        />
      )}

      {/* Footer */}
      <MarketingFooter />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes browseShimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .browse-humans-grid {
          grid-template-columns: repeat(4, 1fr) !important;
        }
        .browse-filter-grid {
          grid-template-columns: repeat(5, 1fr) !important;
        }
        @media (max-width: 1200px) {
          .browse-humans-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 900px) {
          .browse-humans-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .browse-filter-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .browse-humans-grid {
            grid-template-columns: 1fr !important;
          }
          .browse-filter-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
