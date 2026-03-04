import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import {
  BarChart3, ClipboardList, Plus, Users, Handshake, MessageCircle,
  CreditCard, User, Settings, Check, Timer, MapPin, DollarSign,
  Star, CalendarDays, Search, ChevronDown, Upload, Bell,
  FileText, CheckCircle, XCircle, Landmark, Scale, Ban, ArrowDownLeft,
  Shield, Hourglass, Bot, FolderOpen, RefreshCw,
  Monitor, Sparkles, AlertTriangle, KeyRound, Mail, Copy
} from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { supabase, safeSupabase } from '../lib/supabase'
import API_URL from '../config/api'
import { debug, safeArr } from '../utils/appConstants'
import { fixAvatarUrl } from '../utils/avatarUrl'
import { trackPageView, trackEvent, setUserProperties } from '../utils/analytics'
import { navigate as spaNavigate } from '../utils/navigate'
import EarningsDashboard from '../components/EarningsDashboard'
import ModeToggle from '../components/ModeToggle'
import UserDropdown from '../components/UserDropdown'
import TopFilterBar from '../components/TopFilterBar'
import CustomDropdown from '../components/CustomDropdown'
import QuickStats from '../components/QuickStats'
import EmptyState from '../components/EmptyState'
import DisputePanel from '../components/DisputePanel'
import HumanProfileCard from '../components/HumanProfileCard'
import HumanProfileModal from '../components/HumanProfileModal'
import FeedbackButton from '../components/FeedbackButton'
import DashboardTour from '../components/DashboardTour'
import CityAutocomplete from '../components/CityAutocomplete'
import CountryAutocomplete from '../components/CountryAutocomplete'
import SkillAutocomplete from '../components/SkillAutocomplete'
import TimezoneDropdown from '../components/TimezoneDropdown'
import { TASK_CATEGORIES } from '../components/CategoryPills'
import { SocialIconsRow, PLATFORMS, PLATFORM_ORDER, extractHandle } from '../components/SocialIcons'
import { Logo } from '../components/Logo'
import TabErrorBoundary from '../components/TabErrorBoundary'
import Loading from '../components/Loading'
import ProofSubmitModal from '../components/ProofSubmitModal'
import ProofReviewModal from '../components/ProofReviewModal'
import ApiKeysTab from '../components/ApiKeysTab'

import { Icons } from '../utils/dashboardConstants'
import { getTaskStatus, getStatusLabel, NOTIFICATION_ICONS } from '../utils/dashboardHelpers'
import {
  DashboardSidebar,
  DashboardHeader,
  MobileTabBar,
  PostedTasksTab,
  BrowseHumansTab,
  HiringPaymentsTab,
  ProfileTab,
  SettingsTab,
  MessagesTab,
  NotificationsTab,
} from '../components/dashboard'

const BrowseTasksV2 = lazy(() => import('./BrowseTasksV2'))
const MyTasksPage = lazy(() => import('./MyTasksPage'))
const WorkingDashboard = lazy(() => import('./WorkingDashboard'))
const HiringDashboard = lazy(() => import('./HiringDashboard'))
const AdminDashboard = lazy(() => import('./AdminDashboard'))

// Onboarding skill categories (exclude "All" filter option)
const ONBOARDING_CATEGORIES = TASK_CATEGORIES.filter(c => c.value !== '')


function Dashboard({ user, onLogout, needsOnboarding, onCompleteOnboarding, initialMode, onUserUpdate }) {
  const toast = useToast()
  const [hiringMode, setHiringMode] = useState(() => {
    if (initialMode) return initialMode === 'hiring'
    const saved = localStorage.getItem('irlwork_hiringMode')
    return saved === 'true'
  })
  const [humansSubTab, setHumansSubTab] = useState('browse')
  const [tasksSubTab, setTasksSubTab] = useState(() => {
    const pathParts = window.location.pathname.split('/')
    const tabSegment = pathParts[3] || null
    const params = new URLSearchParams(window.location.search)
    if (tabSegment === 'create' || params.get('tab') === 'create-task') return 'create'
    return 'tasks'
  })
  const [hireTarget, setHireTarget] = useState(null)

  // Restore hireTarget from URL ?hire=<id> on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hireId = params.get('hire')
    if (hireId && !hireTarget) {
      fetch(`${API_URL}/humans/${hireId}`)
        .then(r => r.ok ? r.json() : null)
        .then(human => { if (human) setHireTarget(human) })
        .catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Read initial tab from URL path
  const getInitialTab = () => {
    const pathParts = window.location.pathname.split('/')
    const isHiringFromUrl = pathParts[2] === 'hiring'
    const tabSegment = pathParts[3] || null
    const params = new URLSearchParams(window.location.search)
    const tabParam = tabSegment || params.get('tab')
    const humanTabs = ['dashboard', 'tasks', 'browse', 'messages', 'payments', 'profile', 'settings', 'notifications']
    const hiringTabs = ['dashboard', 'posted', 'browse', 'messages', 'payments', 'api-keys', 'profile', 'settings', 'notifications']

    // Admin sub-route: /dashboard/hiring/admin/...
    if (tabSegment === 'admin' && isHiringFromUrl) return 'admin'

    if (tabParam) {
      const tabMap = {
        'dashboard': 'dashboard',
        'create': isHiringFromUrl ? 'posted' : null,
        'create-task': 'posted',
        'my-tasks': isHiringFromUrl ? 'posted' : 'tasks',
        'browse': 'browse',
        'messages': 'messages',
        'payments': 'payments',
        'api-keys': 'api-keys',
        'hired': 'browse',
        'profile': 'profile',
        'settings': 'settings',
        'notifications': 'notifications'
      }
      const mappedTab = tabMap[tabParam] || tabParam
      if (isHiringFromUrl && hiringTabs.includes(mappedTab)) return mappedTab
      if (!isHiringFromUrl && humanTabs.includes(mappedTab)) return mappedTab
    }
    return isHiringFromUrl ? 'posted' : 'tasks'
  }

  const [activeTab, setActiveTabState] = useState(getInitialTab)
  const [settingsTab, setSettingsTab] = useState('profile')
  const [settingsPageTab, setSettingsPageTab] = useState('general')

  // Email verification state
  const [emailVerifCode, setEmailVerifCode] = useState('')
  const [emailVerifSent, setEmailVerifSent] = useState(false)
  const [emailVerifSending, setEmailVerifSending] = useState(false)
  const [emailVerifError, setEmailVerifError] = useState('')
  const [emailVerifSuccess, setEmailVerifSuccess] = useState(!!user?.email_verified)
  const [emailVerifying, setEmailVerifying] = useState(false)

  const updateTabUrl = (tabId, mode) => {
    const urlMap = {
      'dashboard': 'dashboard', 'posted': 'my-tasks', 'tasks': 'my-tasks',
      'browse': 'browse', 'messages': 'messages', 'payments': 'payments',
      'profile': 'profile', 'settings': 'settings', 'notifications': 'notifications'
    }
    const urlTab = urlMap[tabId] || tabId
    const modeSegment = (mode !== undefined ? mode : hiringMode) ? 'hiring' : 'working'
    const newUrl = `/dashboard/${modeSegment}/${urlTab}`
    window.history.pushState({}, '', newUrl)
    trackPageView(newUrl)
  }

  const setActiveTab = (tabId) => {
    if (tabId === 'create') {
      setActiveTabState('posted')
      setTasksSubTab('create')
      const modeSegment = hiringMode ? 'hiring' : 'working'
      window.history.pushState({}, '', `/dashboard/${modeSegment}/create`)
      return
    }
    // Admin tab — AdminDashboard manages its own sub-tab URL
    if (tabId === 'admin') {
      setActiveTabState('admin')
      window.history.pushState({}, '', '/dashboard/hiring/admin')
      return
    }
    setActiveTabState(tabId)
    updateTabUrl(tabId)
  }

  const [tasks, setTasks] = useState([])
  const [availableTasks, setAvailableTasks] = useState([])
  const [humans, setHumans] = useState([])
  const [humansError, setHumansError] = useState(null)
  const [bookmarkedHumans, setBookmarkedHumans] = useState(() => {
    try { return JSON.parse(localStorage.getItem('irlwork_bookmarked_humans') || '[]') } catch { return [] }
  })
  const toggleBookmark = (human) => {
    setBookmarkedHumans(prev => {
      const next = prev.includes(human.id) ? prev.filter(id => id !== human.id) : [...prev, human.id]
      localStorage.setItem('irlwork_bookmarked_humans', JSON.stringify(next))
      return next
    })
  }
  const [loading, setLoading] = useState(true)
  const [postedTasks, setPostedTasks] = useState([])
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] })
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [conversationsError, setConversationsError] = useState(null)
  const [messagesError, setMessagesError] = useState(null)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [browseCityFilter, setBrowseCityFilter] = useState('')
  const [browseCountryFilter, setBrowseCountryFilter] = useState('')
  const [browseCountryCodeFilter, setBrowseCountryCodeFilter] = useState('')
  const [browseMaxRate, setBrowseMaxRate] = useState('')
  const [browseSort, setBrowseSort] = useState('rating')
  const [locationFilter, setLocationFilter] = useState('')
  const [filterCoords, setFilterCoords] = useState({ lat: null, lng: null })
  const [radiusFilter, setRadiusFilter] = useState('50')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [agentConnected, setAgentConnected] = useState(() => localStorage.getItem('irlwork_agentConnected') === 'true')
  const [showProofSubmit, setShowProofSubmit] = useState(null)
  const [showProofReview, setShowProofReview] = useState(null)
  const [taskApplications, setTaskApplications] = useState({})

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [sidebarOpen]);

  const [showTour, setShowTour] = useState(() => {
    return localStorage.getItem('irlwork_tour_completed') !== 'true'
  })

  const [profileLocation, setProfileLocation] = useState(null)
  const [profileTimezone, setProfileTimezone] = useState(user?.timezone || '')
  const [profileGender, setProfileGender] = useState(user?.gender || '')
  const [skillsList, setSkillsList] = useState(user?.skills || [])
  const [newSkillInput, setNewSkillInput] = useState('')
  const [languagesList, setLanguagesList] = useState(user?.languages || [])
  const [newLanguageInput, setNewLanguageInput] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [profileLinkCopied, setProfileLinkCopied] = useState(false)
  const avatarInputRef = useRef(null)
  const [expandedTask, setExpandedTask] = useState(null)
  const [assigningHuman, setAssigningHuman] = useState(null)
  const [expandedHumanId, setExpandedHumanId] = useState(null)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [cancelConfirmId, setCancelConfirmId] = useState(null)
  const [cancellingTaskId, setCancellingTaskId] = useState(null)
  const [decliningAppId, setDecliningAppId] = useState(null)
  const [negotiateAppId, setNegotiateAppId] = useState(null)
  const [negotiateMsg, setNegotiateMsg] = useState('')
  const [assignNotes, setAssignNotes] = useState({})

  const [taskForm, setTaskForm] = useState({
    title: '', description: '', category: '', budget: '',
    city: '', latitude: null, longitude: null, country: '', country_code: '',
    is_remote: false, duration_hours: '', deadline: '', requirements: '',
    required_skills: [], skillInput: '', task_type: 'open', quantity: 1, is_anonymous: false
  })
  const [creatingTask, setCreatingTask] = useState(false)
  const [createTaskError, setCreateTaskError] = useState('')
  const [taskFormTouched, setTaskFormTouched] = useState({})

  useEffect(() => {
    localStorage.setItem('irlwork_hiringMode', hiringMode)
  }, [hiringMode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stripeOnboard = params.get('stripe_onboard')
    if (stripeOnboard === 'complete') {
      toast.success('Bank account setup complete! You can now receive payments.')
      setActiveTab('payments')
      params.delete('stripe_onboard')
      const cleanUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
      window.history.replaceState({}, '', cleanUrl)
    } else if (stripeOnboard === 'refresh') {
      toast.info('Bank setup session expired. Please try again.')
      setActiveTab('payments')
      params.delete('stripe_onboard')
      const cleanUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [])

  useEffect(() => {
    if (user?.city && !locationFilter) {
      setLocationFilter(user.city)
      if (user.latitude && user.longitude) {
        setFilterCoords({ lat: user.latitude, lng: user.longitude })
      }
    }
  }, [user])

  const handleLocationSelect = (locationData) => {
    setLocationFilter(locationData.city)
    setFilterCoords({ lat: locationData.latitude, lng: locationData.longitude })
  }

  const [unreadMessages, setUnreadMessages] = useState(0)
  const unreadNotifications = notifications.filter(n => !n.is_read).length

  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)

  const isAdmin = user && user.is_admin === true

  const humanNav = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
    { id: 'tasks', label: 'My Tasks', icon: Icons.task },
    { id: 'browse', label: 'Browse Tasks', icon: Icons.search },
    { id: 'messages', label: 'Messages', icon: Icons.messages, badge: unreadMessages },
    { id: 'payments', label: 'Payments', icon: Icons.wallet },
  ]

  const hiringNav = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
    { id: 'posted', label: 'My Tasks', icon: Icons.task },
    { id: 'browse', label: 'Humans', icon: Icons.humans },
    { id: 'messages', label: 'Messages', icon: Icons.messages, badge: unreadMessages },
    { id: 'payments', label: 'Payments', icon: Icons.wallet },
    { id: 'api-keys', label: 'API Keys', icon: Icons.key },
  ]

  const baseNav = hiringMode ? hiringNav : humanNav
  const navItems = isAdmin ? [...baseNav, { id: 'admin', label: 'Admin', icon: Icons.admin }] : baseNav

  const markAllNotificationsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      setNotifications(prev => prev.filter(n => n.is_read))
      for (const id of unreadIds) {
        fetch(`${API_URL}/notifications/${id}/read`, { method: 'POST', headers: { Authorization: user.token || '' } }).catch(() => {})
      }
    } catch (e) {
      console.error('Error marking all notifications read:', e)
    }
  }

  const toggleHiringMode = () => {
    const newHiringMode = !hiringMode
    setHiringMode(newHiringMode)
    setUserProperties({ user_mode: newHiringMode ? 'hiring' : 'working' })
    trackEvent('mode_switch', { mode: newHiringMode ? 'hiring' : 'working' })
    const newTab = 'dashboard'
    setActiveTabState(newTab)
    updateTabUrl(newTab, newHiringMode)
  }

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const pathParts = window.location.pathname.split('/')
      const mode = pathParts[2]
      const tabSegment = pathParts[3] || null
      const isHiring = mode === 'hiring'

      if (isHiring && !hiringMode) {
        setHiringMode(true)
        setActiveTabState('dashboard')
      } else if (!isHiring && hiringMode) {
        setHiringMode(false)
        setActiveTabState('dashboard')
      }

      const tabParam = tabSegment || new URLSearchParams(window.location.search).get('tab')
      // Handle /admin URL → admin tab (AdminDashboard handles sub-tab)
      if (tabParam === 'admin' && mode === 'hiring') {
        setActiveTabState('admin')
        return
      }
      if (tabParam) {
        const isHiring = mode === 'hiring'
        if (tabParam === 'create' && isHiring) {
          setActiveTabState('posted')
          setTasksSubTab('create')
          return
        }
        const tabMap = {
          'dashboard': 'dashboard', 'create-task': 'posted',
          'my-tasks': isHiring ? 'posted' : 'tasks',
          'browse': 'browse', 'messages': 'messages', 'payments': 'payments',
          'api-keys': 'api-keys', 'hired': 'browse', 'profile': 'profile',
          'settings': 'settings', 'notifications': 'notifications'
        }
        const mappedTab = tabMap[tabParam] || tabParam
        setActiveTabState(mappedTab)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [hiringMode])

  useEffect(() => {
    if (!user?.token) return
    if (hiringMode) {
      fetchPostedTasks()
      fetchHumans()
    } else {
      fetchTasks()
      fetchAvailableTasks()
      fetchWallet()
    }
    fetchConversations()
    fetchNotifications()
    fetchUnreadMessages()
  }, [hiringMode, user?.token])

  useEffect(() => {
    if (!hiringMode) {
      fetchAvailableTasks()
    }
  }, [filterCoords.lat, filterCoords.lng, radiusFilter, filterCategory])

  // Real-time subscriptions for agents
  useEffect(() => {
    if (!hiringMode || !user) return
    const tasksChannel = safeSupabase
      .channel(`agent-tasks-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.new?.agent_id === user.id || payload.old?.agent_id === user.id) {
          fetchPostedTasks()
        }
      })
      .subscribe()

    const applicationsChannel = safeSupabase
      .channel(`task-applications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_applications' }, (payload) => {
        if (expandedTask && payload.new?.task_id === expandedTask) {
          fetchApplicationsForTask(expandedTask)
        }
      })
      .subscribe()

    let workerChannel = null
    if (user.type === 'human') {
      workerChannel = safeSupabase
        .channel(`worker-tasks-${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `human_id=eq.${user.id}` }, () => { fetchTasks() })
        .subscribe()
    }

    return () => {
      safeSupabase.removeChannel(tasksChannel)
      safeSupabase.removeChannel(applicationsChannel)
      if (workerChannel) safeSupabase.removeChannel(workerChannel)
    }
  }, [hiringMode, user, expandedTask])

  useEffect(() => {
    if (activeTab !== 'messages' || !selectedConversation) return
    const interval = setInterval(() => {
      fetchMessages(selectedConversation, true)
    }, 5000)
    return () => clearInterval(interval)
  }, [activeTab, selectedConversation])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => { fetchUnreadMessages() }, 30000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    if (!user) return
    const messagesChannel = safeSupabase
      .channel(`user-messages-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (selectedConversation && payload.new?.conversation_id === selectedConversation) {
          fetchMessages(selectedConversation, true)
        }
        fetchUnreadMessages()
        fetchConversations()
      })
      .subscribe()
    return () => { safeSupabase.removeChannel(messagesChannel) }
  }, [user, selectedConversation])

  // === Data fetching functions ===

  const fetchTasks = async () => {
    if (!user?.token) return
    try {
      const res = await fetch(`${API_URL}/my-tasks`, { headers: { Authorization: user.token } })
      if (res.ok) { setTasks(await res.json() || []) }
    } catch (e) { debug('Could not fetch tasks') }
    finally { setLoading(false) }
  }

  const fetchAvailableTasks = async () => {
    try {
      const params = new URLSearchParams()
      if (filterCoords.lat && filterCoords.lng) {
        params.set('user_lat', filterCoords.lat)
        params.set('user_lng', filterCoords.lng)
        params.set('radius_km', radiusFilter)
        if (locationFilter) params.set('city', locationFilter)
      } else if (locationFilter) {
        params.set('city', locationFilter)
      }
      if (filterCategory) params.set('category', filterCategory)
      const url = params.toString() ? `${API_URL}/tasks/available?${params}` : `${API_URL}/tasks/available`
      const res = await fetch(url)
      if (res.ok) { setAvailableTasks(await res.json() || []) }
    } catch (e) { debug('Could not fetch available tasks') }
  }

  const fetchHumans = async () => {
    if (!user?.token) return
    setHumansError(null)
    try {
      const res = await fetch(`${API_URL}/humans`, { headers: { Authorization: user.token } })
      if (res.ok) { setHumans(fixAvatarUrl(await res.json() || [])) }
      else { setHumansError(`Server error (${res.status})`) }
    } catch (e) { setHumansError('Could not connect to server') }
  }

  const fetchPostedTasks = async () => {
    if (!user?.token) return
    try {
      const res = await fetch(`${API_URL}/agent/tasks`, { headers: { Authorization: user.token } })
      if (res.ok) { setPostedTasks(await res.json() || []) }
    } catch (e) { debug('Could not fetch posted tasks') }
    finally { setLoading(false) }
  }

  const fetchApplicationsForTask = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/applications`, { headers: { Authorization: user.token || '' } })
      if (res.ok) { const data = await res.json(); setTaskApplications(prev => ({ ...prev, [taskId]: data })) }
    } catch (e) { debug('Could not fetch applications') }
  }

  const handleAssignHuman = async (taskId, humanId, preferredPaymentMethod) => {
    setAssigningHuman(humanId)
    try {
      const body = { human_id: humanId }
      if (preferredPaymentMethod) body.preferred_payment_method = preferredPaymentMethod
      const noteText = assignNotes[humanId]
      if (noteText && noteText.trim()) body.note = noteText.trim()
      const res = await fetch(`${API_URL}/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        const data = await res.json()
        fetchPostedTasks()
        setExpandedTask(null)
        setTaskApplications(prev => ({ ...prev, [taskId]: [] }))
        setAssignNotes(prev => { const next = { ...prev }; delete next[humanId]; return next })
        if (data.payment_method === 'usdc') {
          toast.success(`Worker assigned! Send ${data.deposit_instructions?.amount_usdc} USDC to complete escrow.`)
        } else if (data.amount_charged) {
          toast.success(`Worker assigned! $${data.amount_charged?.toFixed(2)} charged to your card.`)
        } else {
          toast.success('Worker assigned! Payment charged to your card.')
        }
      } else {
        const err = await res.json()
        if (err.code === 'payment_failed') {
          toast.error(`Payment failed: ${err.details || err.error}`)
        } else {
          toast.error(err.error || 'Failed to assign human')
        }
      }
    } catch (e) { toast.error('Network error. Please try again.') }
    finally { setAssigningHuman(null) }
  }

  const handleCancelTask = async (taskId) => {
    setCancellingTaskId(taskId)
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/cancel`, { method: 'POST', headers: { Authorization: user.token || '' } })
      if (res.ok) { toast.success('Task cancelled'); fetchPostedTasks(); setCancelConfirmId(null) }
      else { const err = await res.json(); toast.error(err.error || 'Failed to cancel task') }
    } catch (e) { toast.error('Network error') }
    finally { setCancellingTaskId(null) }
  }

  const handleEditTask = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
        body: JSON.stringify(editForm)
      })
      if (res.ok) { toast.success('Task updated'); setEditingTaskId(null); setEditForm({}); fetchPostedTasks() }
      else { const err = await res.json(); toast.error(err.error || 'Failed to update task') }
    } catch (e) { toast.error('Network error') }
  }

  const handleDeclineApplication = async (taskId, appId) => {
    setDecliningAppId(appId)
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/applications/${appId}/decline`, { method: 'POST', headers: { Authorization: user.token || '' } })
      if (res.ok) { toast.success('Application declined'); fetchApplicationsForTask(taskId) }
      else { const err = await res.json(); toast.error(err.error || 'Failed to decline') }
    } catch (e) { toast.error('Network error') }
    finally { setDecliningAppId(null) }
  }

  const handleNegotiate = async (taskId, humanId) => {
    if (!negotiateMsg.trim()) return
    try {
      // First create or get the conversation between agent and human for this task
      const convRes = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
        body: JSON.stringify({ human_id: humanId, task_id: taskId })
      })
      if (!convRes.ok) { toast.error('Failed to start conversation'); return }
      const conversation = await convRes.json()

      // Then send the message in that conversation
      const msgRes = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
        body: JSON.stringify({ conversation_id: conversation.id, content: negotiateMsg.trim() })
      })
      if (msgRes.ok) { toast.success('Message sent'); setNegotiateAppId(null); setNegotiateMsg('') }
      else { toast.error('Failed to send message') }
    } catch (e) { toast.error('Network error') }
  }

  const fetchWallet = async () => {
    if (!user?.token) return
    try {
      const res = await fetch(`${API_URL}/wallet/status`, { headers: { Authorization: user.token } })
      if (res.ok) { setWallet(await res.json() || { balance: 0, transactions: [] }) }
    } catch (e) { debug('Could not fetch wallet') }
  }

  const fetchNotifications = async () => {
    if (!user?.token) return
    try {
      const res = await fetch(`${API_URL}/notifications`, { headers: { Authorization: user.token } })
      if (res.ok) { setNotifications((await res.json() || []).filter(n => !n.is_read)) }
    } catch (e) { debug('Could not fetch notifications') }
  }

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'POST', headers: { Authorization: user.token || '' } })
      fetchNotifications()
    } catch (e) {}
  }

  const navigateToNotification = (notification) => {
    setNotifications(prev => prev.filter(n => n.id !== notification.id))
    fetch(`${API_URL}/notifications/${notification.id}/read`, { method: 'POST', headers: { Authorization: user.token || '' } }).catch(() => {})
    setNotificationDropdownOpen(false)
    const link = notification.link
    if (!link) return
    if (link.startsWith('http')) {
      try {
        const url = new URL(link)
        const trustedDomains = ['irlwork.ai', 'www.irlwork.ai', 'basescan.org', 'etherscan.io']
        if (trustedDomains.some(d => url.hostname === d || url.hostname.endsWith('.' + d))) {
          window.open(link, '_blank', 'noopener,noreferrer')
        }
      } catch {}
      return
    }
    if (link.startsWith('/tasks/')) { spaNavigate(link); return }
    if (link.startsWith('/dashboard')) {
      const params = new URLSearchParams(link.split('?')[1] || '')
      const taskId = params.get('task')
      if (taskId) { spaNavigate(`/tasks/${taskId}`); return }
      const linkParts = link.split('?')[0].split('/')
      const tabFromPath = linkParts[3] || null
      const tab = tabFromPath || params.get('tab')
      if (tab) { setActiveTab(tab) }
      return
    }
    if (link.startsWith('/browse')) { spaNavigate(link); return }
    if (link.startsWith('/disputes')) { setActiveTab('disputes'); return }
    spaNavigate(link)
  }

  const fetchConversations = async () => {
    if (!user?.token) return
    setConversationsLoading(prev => prev || conversations.length === 0)
    try {
      const res = await fetch(`${API_URL}/conversations`, { headers: { Authorization: user.token } })
      if (res.ok) { setConversations(await res.json() || []); setConversationsError(null) }
      else { setConversationsError('Failed to load conversations') }
    } catch (e) { setConversationsError('Network error. Check your connection.') }
    finally { setConversationsLoading(false) }
  }

  const fetchUnreadMessages = async () => {
    if (!user?.token) return
    try {
      const res = await fetch(`${API_URL}/messages/unread/count`, { headers: { Authorization: user.token } })
      if (res.ok) { const data = await res.json(); setUnreadMessages(data.count || 0) }
    } catch (e) { debug('Could not fetch unread count') }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    setCreateTaskError('')
    if (!taskForm.title.trim()) { setCreateTaskError('Title is required'); return }
    if (!taskForm.category) { setCreateTaskError('Category is required'); return }
    if (!taskForm.budget || parseFloat(taskForm.budget) < 5) { setCreateTaskError('Budget must be at least $5'); return }
    if (!taskForm.is_remote && !taskForm.city.trim()) { setCreateTaskError('City is required for in-person tasks'); return }
    if (!taskForm.duration_hours || parseFloat(taskForm.duration_hours) <= 0) { setCreateTaskError('Duration is required (estimated hours to complete)'); return }

    setCreatingTask(true)
    try {
      const isDirectHire = !!hireTarget
      const endpoint = isDirectHire ? `${API_URL}/tasks/create` : `${API_URL}/tasks`
      const payload = {
        title: taskForm.title, description: taskForm.description, category: taskForm.category,
        budget: parseFloat(taskForm.budget), location: taskForm.city,
        latitude: taskForm.latitude, longitude: taskForm.longitude,
        country: taskForm.country, country_code: taskForm.country_code,
        is_remote: taskForm.is_remote,
        duration_hours: taskForm.duration_hours ? parseFloat(taskForm.duration_hours) : null,
        deadline: taskForm.deadline ? new Date(taskForm.deadline).toISOString() : null,
        requirements: taskForm.requirements.trim() || null,
        required_skills: taskForm.required_skills.length > 0 ? taskForm.required_skills : [],
        task_type: isDirectHire ? 'direct' : 'open', quantity: 1, is_anonymous: taskForm.is_anonymous
      }
      if (isDirectHire) payload.assign_to = hireTarget.id

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const newTask = await res.json()
        trackEvent('task_created', { category: taskForm.category, budget: parseFloat(taskForm.budget), is_remote: taskForm.is_remote, task_type: isDirectHire ? 'direct' : 'open', direct_hire: isDirectHire })
        setPostedTasks(prev => [newTask, ...prev])
        setTaskForm({ title: '', description: '', category: '', budget: '', city: '', latitude: null, longitude: null, country: '', country_code: '', is_remote: false, duration_hours: '', deadline: '', requirements: '', required_skills: [], skillInput: '', task_type: 'open', quantity: 1, is_anonymous: false })
        setTaskFormTouched({})
        setHireTarget(null)
        setTasksSubTab('tasks')
        setActiveTab('posted')
      } else {
        const err = await res.json()
        if (err.code === 'payment_required' || err.code === 'card_required' || res.status === 402) {
          setCreateTaskError('You need to add a payment method before creating a task.')
          setTimeout(() => setActiveTab('payments'), 1500)
        } else {
          setCreateTaskError(err.error || 'Failed to create task')
        }
      }
    } catch (e) { setCreateTaskError('Network error. Please try again.') }
    finally { setCreatingTask(false) }
  }

  const fetchMessages = async (conversationId, skipMarkRead = false) => {
    if (!skipMarkRead) setMessagesLoading(true)
    try {
      const res = await fetch(`${API_URL}/messages/${conversationId}`, { headers: { Authorization: user.token || '' } })
      if (res.ok) {
        const sorted = (await res.json() || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        setMessages(sorted)
        setMessagesError(null)
        if (!skipMarkRead) {
          fetch(`${API_URL}/conversations/${conversationId}/read-all`, {
            method: 'PUT', headers: { Authorization: user.token || '' }
          }).then(() => { fetchUnreadMessages(); fetchConversations() }).catch(() => {})
        }
      } else { setMessagesError('Failed to load messages') }
    } catch (e) { setMessagesError('Network error. Check your connection.') }
    finally { setMessagesLoading(false) }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return
    const msgContent = newMessage
    setNewMessage('')
    setSendingMessage(true)
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
        body: JSON.stringify({ conversation_id: selectedConversation, content: msgContent })
      })
      if (!res.ok) throw new Error('Failed to send')
      fetchMessages(selectedConversation, true)
      fetchConversations()
    } catch (e) { setNewMessage(msgContent); toast.error('Message failed to send. Please try again.') }
    finally { setSendingMessage(false) }
  }

  const acceptTask = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/accept`, { method: 'POST', headers: { Authorization: user.token || '' } })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.code === 'payment_error') { debug('Payment failed — the agent\'s card could not be charged. Contact the agent.'); return }
      }
      fetchTasks()
    } catch (e) { debug('Could not accept task') }
  }

  const declineTask = async (taskId, reason = '') => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/decline`, {
        method: 'POST', headers: { Authorization: user.token || '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })
      fetchTasks()
    } catch (e) { debug('Could not decline task') }
  }

  const startWork = async (taskId) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/start`, { method: 'POST', headers: { Authorization: user.token || '' } })
      fetchTasks()
    } catch (e) { debug('Could not start work') }
  }

  const approveTask = async (taskId) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/approve`, { method: 'POST', headers: { Authorization: user.token || '' } })
      fetchPostedTasks()
    } catch (e) { debug('Could not approve task') }
  }

  const releasePayment = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/release`, { method: 'POST', headers: { Authorization: user.token || '' } })
      if (res.ok) { toast.success('Payment released successfully'); fetchPostedTasks() }
      else { const err = await res.json(); toast.error(err.error || 'Unknown error') }
    } catch (e) { toast.error('Could not release payment') }
  }

  const submitProof = async ({ proofText, proofUrls }) => {
    try {
      await fetch(`${API_URL}/tasks/${showProofSubmit}/submit-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
        body: JSON.stringify({ proof_text: proofText, proof_urls: proofUrls })
      })
      setShowProofSubmit(null)
      fetchTasks()
    } catch (e) { debug('Could not submit proof') }
  }

  const rejectTask = async ({ feedback, extendHours }) => {
    try {
      await fetch(`${API_URL}/tasks/${showProofReview}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
        body: JSON.stringify({ feedback, extend_deadline_hours: extendHours })
      })
      setShowProofReview(null)
      fetchPostedTasks()
    } catch (e) { debug('Could not reject task') }
  }

  // === Render ===

  return (
    <div className="dashboard-v4">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="dashboard-v4-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <DashboardSidebar
        navItems={navItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        hiringMode={hiringMode}
        setHiringMode={setHiringMode}
        setActiveTabState={setActiveTabState}
        updateTabUrl={updateTabUrl}
        agentConnected={agentConnected}
        user={user}
      />

      <FeedbackButton user={user} variant="sidebar" isOpen={feedbackOpen} onToggle={(v) => setFeedbackOpen(typeof v === 'boolean' ? v : !feedbackOpen)} />

      <DashboardTour isOpen={showTour} onComplete={() => setShowTour(false)} hiringMode={hiringMode} />

      <main className="dashboard-v4-main">
        <DashboardHeader
          hiringMode={hiringMode}
          setHiringMode={setHiringMode}
          setActiveTab={setActiveTab}
          setActiveTabState={setActiveTabState}
          updateTabUrl={updateTabUrl}
          isAdmin={isAdmin}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          notifications={notifications}
          unreadNotifications={unreadNotifications}
          notificationDropdownOpen={notificationDropdownOpen}
          setNotificationDropdownOpen={setNotificationDropdownOpen}
          markAllNotificationsRead={markAllNotificationsRead}
          navigateToNotification={navigateToNotification}
          NOTIFICATION_ICONS={NOTIFICATION_ICONS}
          userDropdownOpen={userDropdownOpen}
          setUserDropdownOpen={setUserDropdownOpen}
          user={user}
          onLogout={onLogout}
          feedbackOpen={feedbackOpen}
          setFeedbackOpen={setFeedbackOpen}
        />

        <div className="dashboard-v4-content">
          {/* Working Mode: Dashboard */}
          {!hiringMode && activeTab === 'dashboard' && (
            <TabErrorBoundary>
              <Suspense fallback={<Loading />}>
                <WorkingDashboard user={user} tasks={tasks} notifications={notifications} onNavigate={(tab) => setActiveTab(tab)} onUserUpdate={onUserUpdate} />
              </Suspense>
            </TabErrorBoundary>
          )}

          {/* Hiring Mode: Dashboard */}
          {hiringMode && activeTab === 'dashboard' && (
            <TabErrorBoundary>
              <Suspense fallback={<Loading />}>
                <HiringDashboard user={user} postedTasks={postedTasks} onNavigate={(tab) => setActiveTab(tab)} />
              </Suspense>
            </TabErrorBoundary>
          )}

          {/* Hiring Mode: My Tasks */}
          {hiringMode && activeTab === 'posted' && (
            <PostedTasksTab
              user={user}
              postedTasks={postedTasks}
              loading={loading}
              tasksSubTab={tasksSubTab} setTasksSubTab={setTasksSubTab}
              taskForm={taskForm} setTaskForm={setTaskForm}
              taskFormTouched={taskFormTouched} setTaskFormTouched={setTaskFormTouched}
              creatingTask={creatingTask}
              createTaskError={createTaskError} setCreateTaskError={setCreateTaskError}
              hireTarget={hireTarget} setHireTarget={setHireTarget}
              expandedTask={expandedTask} setExpandedTask={setExpandedTask}
              taskApplications={taskApplications}
              editingTaskId={editingTaskId} setEditingTaskId={setEditingTaskId}
              editForm={editForm} setEditForm={setEditForm}
              cancelConfirmId={cancelConfirmId} setCancelConfirmId={setCancelConfirmId}
              cancellingTaskId={cancellingTaskId}
              decliningAppId={decliningAppId}
              negotiateAppId={negotiateAppId} setNegotiateAppId={setNegotiateAppId}
              negotiateMsg={negotiateMsg} setNegotiateMsg={setNegotiateMsg}
              assignNotes={assignNotes} setAssignNotes={setAssignNotes}
              assigningHuman={assigningHuman}
              handleCreateTask={handleCreateTask}
              handleAssignHuman={handleAssignHuman}
              handleCancelTask={handleCancelTask}
              handleEditTask={handleEditTask}
              handleDeclineApplication={handleDeclineApplication}
              handleNegotiate={handleNegotiate}
              fetchApplicationsForTask={fetchApplicationsForTask}
              showProofReview={showProofReview} setShowProofReview={setShowProofReview}
              getStatusLabel={getStatusLabel}
              setActiveTab={setActiveTab}
              setActiveTabState={setActiveTabState}
            />
          )}

          {/* Working Mode: My Tasks */}
          {!hiringMode && activeTab === 'tasks' && (
            <TabErrorBoundary>
              <Suspense fallback={<Loading />}>
                <MyTasksPage user={user} tasks={tasks} loading={loading} acceptTask={acceptTask} declineTask={declineTask} onStartWork={startWork} setShowProofSubmit={setShowProofSubmit} notifications={notifications} onNavigate={(tab) => setActiveTab(tab)} />
              </Suspense>
            </TabErrorBoundary>
          )}

          {/* Working Mode: Browse Tasks */}
          {!hiringMode && activeTab === 'browse' && (
            <TabErrorBoundary>
              <Suspense fallback={<Loading />}>
                <BrowseTasksV2
                  user={user}
                  initialLocation={{ lat: filterCoords?.lat || user?.latitude, lng: filterCoords?.lng || user?.longitude, city: locationFilter || user?.city }}
                  initialRadius={radiusFilter || '25'}
                />
              </Suspense>
            </TabErrorBoundary>
          )}

          {/* Hiring Mode: Browse Humans */}
          {hiringMode && activeTab === 'browse' && (
            <BrowseHumansTab
              humans={humans}
              humansError={humansError}
              humansSubTab={humansSubTab} setHumansSubTab={setHumansSubTab}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              filterCategory={filterCategory} setFilterCategory={setFilterCategory}
              browseCityFilter={browseCityFilter} setBrowseCityFilter={setBrowseCityFilter}
              browseCountryFilter={browseCountryFilter} setBrowseCountryFilter={setBrowseCountryFilter}
              browseCountryCodeFilter={browseCountryCodeFilter} setBrowseCountryCodeFilter={setBrowseCountryCodeFilter}
              browseMaxRate={browseMaxRate} setBrowseMaxRate={setBrowseMaxRate}
              browseSort={browseSort} setBrowseSort={setBrowseSort}
              bookmarkedHumans={bookmarkedHumans}
              toggleBookmark={toggleBookmark}
              fetchHumans={fetchHumans}
              setHireTarget={setHireTarget}
              setTasksSubTab={setTasksSubTab}
              setActiveTab={setActiveTab}
              setActiveTabState={setActiveTabState}
            />
          )}

          {/* Hiring Mode: Payments */}
          {hiringMode && activeTab === 'payments' && (
            <HiringPaymentsTab user={user} postedTasks={postedTasks} />
          )}

          {/* Working Mode: Payments */}
          {!hiringMode && activeTab === 'payments' && (
            <TabErrorBoundary>
              <EarningsDashboard user={user} />
            </TabErrorBoundary>
          )}

          {/* Profile (shared) */}
          {activeTab === 'profile' && (
            <ProfileTab
              user={user}
              onUserUpdate={onUserUpdate}
              settingsTab={settingsTab} setSettingsTab={setSettingsTab}
              profileLocation={profileLocation} setProfileLocation={setProfileLocation}
              profileTimezone={profileTimezone} setProfileTimezone={setProfileTimezone}
              profileGender={profileGender} setProfileGender={setProfileGender}
              skillsList={skillsList} setSkillsList={setSkillsList}
              newSkillInput={newSkillInput} setNewSkillInput={setNewSkillInput}
              languagesList={languagesList} setLanguagesList={setLanguagesList}
              newLanguageInput={newLanguageInput} setNewLanguageInput={setNewLanguageInput}
              avatarUploading={avatarUploading} setAvatarUploading={setAvatarUploading}
              profileLinkCopied={profileLinkCopied} setProfileLinkCopied={setProfileLinkCopied}
            />
          )}

          {/* Settings (shared) */}
          {activeTab === 'settings' && (
            <SettingsTab
              user={user}
              onUserUpdate={onUserUpdate}
              onLogout={onLogout}
              settingsPageTab={settingsPageTab} setSettingsPageTab={setSettingsPageTab}
              hiringMode={hiringMode} setHiringMode={setHiringMode}
              updateTabUrl={updateTabUrl}
              emailVerifCode={emailVerifCode} setEmailVerifCode={setEmailVerifCode}
              emailVerifSent={emailVerifSent} setEmailVerifSent={setEmailVerifSent}
              emailVerifSending={emailVerifSending} setEmailVerifSending={setEmailVerifSending}
              emailVerifError={emailVerifError} setEmailVerifError={setEmailVerifError}
              emailVerifSuccess={emailVerifSuccess} setEmailVerifSuccess={setEmailVerifSuccess}
              emailVerifying={emailVerifying} setEmailVerifying={setEmailVerifying}
            />
          )}

          {/* API Keys (hiring only) */}
          {hiringMode && activeTab === 'api-keys' && (
            <TabErrorBoundary>
              <ApiKeysTab user={user} />
            </TabErrorBoundary>
          )}

          {/* Admin (admin only) */}
          {isAdmin && activeTab === 'admin' && (
            <TabErrorBoundary>
              <Suspense fallback={<Loading />}>
                <AdminDashboard user={user} initialAdminTab={(() => { const p = window.location.pathname.split('/'); return p[3] === 'admin' ? p[4] : null; })()} />
              </Suspense>
            </TabErrorBoundary>
          )}

          {/* Messages (shared) */}
          {activeTab === 'messages' && (
            <MessagesTab
              user={user}
              conversations={conversations}
              selectedConversation={selectedConversation} setSelectedConversation={setSelectedConversation}
              messages={messages}
              newMessage={newMessage} setNewMessage={setNewMessage}
              messagesLoading={messagesLoading}
              conversationsLoading={conversationsLoading}
              conversationsError={conversationsError}
              messagesError={messagesError}
              sendingMessage={sendingMessage}
              fetchMessages={fetchMessages}
              sendMessage={sendMessage}
              fetchConversations={fetchConversations}
              hiringMode={hiringMode}
            />
          )}

          {/* Notifications (shared) */}
          {activeTab === 'notifications' && (
            <NotificationsTab
              notifications={notifications}
              NOTIFICATION_ICONS={NOTIFICATION_ICONS}
              navigateToNotification={navigateToNotification}
              markAllNotificationsRead={markAllNotificationsRead}
            />
          )}

          {/* Modals */}
          {showProofSubmit && (
            <ProofSubmitModal
              task={tasks.find(t => t.id === showProofSubmit)}
              onClose={() => setShowProofSubmit(null)}
              onSubmit={submitProof}
            />
          )}
          {showProofReview && (
            <ProofReviewModal
              task={(hiringMode ? postedTasks : tasks).find(t => t.id === showProofReview)}
              onClose={() => setShowProofReview(null)}
              onApprove={() => approveTask(showProofReview)}
              onReject={rejectTask}
            />
          )}
        </div>

        {/* Expanded Human Profile Modal */}
        {expandedHumanId && (
          <HumanProfileModal
            humanId={expandedHumanId}
            onClose={() => setExpandedHumanId(null)}
            onHire={(human) => {
              setExpandedHumanId(null)
              setHireTarget(human)
              setTasksSubTab('create')
              setActiveTabState('posted')
              window.history.pushState({}, '', `/dashboard/hiring/create?hire=${human.id}`)
              trackPageView('/dashboard/hiring/create')
            }}
            user={user}
          />
        )}
      </main>

      <MobileTabBar
        hiringMode={hiringMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSidebarOpen={setSidebarOpen}
        unreadMessages={unreadMessages}
      />
    </div>
  )
}
export default Dashboard
