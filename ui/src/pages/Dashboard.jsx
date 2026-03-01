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

const BrowseTasksV2 = lazy(() => import('./BrowseTasksV2'))
const MyTasksPage = lazy(() => import('./MyTasksPage'))
const WorkingDashboard = lazy(() => import('./WorkingDashboard'))
const HiringDashboard = lazy(() => import('./HiringDashboard'))
const AdminDashboard = lazy(() => import('./AdminDashboard'))
const StripeProvider = lazy(() => import('../components/StripeProvider'))
const PaymentMethodForm = lazy(() => import('../components/PaymentMethodForm'))
const PaymentMethodList = lazy(() => import('../components/PaymentMethodList'))
const MembershipBilling = lazy(() => import('../components/MembershipBilling'))

// === Styles ===
const styles = {
  btn: `px-5 py-2.5 rounded-[10px] font-medium transition-all duration-200 cursor-pointer border-0`,
  btnPrimary: `bg-coral text-white hover:bg-coral-dark shadow-v4-md hover:shadow-v4-lg`,
  btnSecondary: `bg-coral/10 text-coral hover:bg-coral/20`,
  btnSmall: `px-3 py-1.5 text-sm rounded-lg`,
  input: `w-full px-4 py-2.5 bg-[#F5F3F0] border border-[rgba(0,0,0,0.08)] rounded-[10px] text-[#1A1A1A] placeholder-[#AAAAAA] focus:border-coral focus:ring-2 focus:ring-coral/20 focus:outline-none transition-all`,
  card: `bg-white border border-[rgba(0,0,0,0.06)] rounded-[14px] p-4 shadow-v4-sm hover:shadow-v4-md transition-shadow`,
  container: `max-w-6xl mx-auto px-6`,
  gradient: `bg-cream`,
  // Dashboard-specific styles
  sidebar: `bg-cream`,
  sidebarNav: `text-[#888888] hover:bg-[#F5F3F0] hover:text-[#1A1A1A]`,
  sidebarNavActive: `bg-coral/[0.06] text-coral font-semibold`,
}

// === Icons ===
const ICON_SIZE = 18
const Icons = {
  dashboard: <BarChart3 size={ICON_SIZE} />,
  task: <ClipboardList size={ICON_SIZE} />,
  create: <Plus size={ICON_SIZE} />,
  humans: <Users size={ICON_SIZE} />,
  hired: <Handshake size={ICON_SIZE} />,
  messages: <MessageCircle size={ICON_SIZE} />,
  wallet: <CreditCard size={ICON_SIZE} />,
  profile: <User size={ICON_SIZE} />,
  settings: <Settings size={ICON_SIZE} />,
  check: <Check size={ICON_SIZE} />,
  clock: <Timer size={ICON_SIZE} />,
  location: <MapPin size={ICON_SIZE} />,
  dollar: <DollarSign size={ICON_SIZE} />,
  star: <Star size={ICON_SIZE} />,
  calendar: <CalendarDays size={ICON_SIZE} />,
  search: <Search size={ICON_SIZE} />,
  filter: <ChevronDown size={ICON_SIZE} />,
  upload: <Upload size={ICON_SIZE} />,
  bell: <Bell size={ICON_SIZE} />,
  admin: <Shield size={ICON_SIZE} />,
  key: <KeyRound size={ICON_SIZE} />,
}

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
  const [hireTarget, setHireTarget] = useState(null) // Human selected via "Hire" button for direct hire

  // Restore hireTarget from URL ?hire=<id> on mount (e.g. page refresh or direct link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hireId = params.get('hire')
    if (hireId && !hireTarget) {
      fetch(`${API_URL}/humans/${hireId}`)
        .then(r => r.ok ? r.json() : null)
        .then(human => { if (human) setHireTarget(human) })
        .catch(() => {}) // silently ignore — user can still create open task
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Read initial tab from URL path: /dashboard/working/browse → 'browse'
  const getInitialTab = () => {
    const pathParts = window.location.pathname.split('/')
    // pathParts: ['', 'dashboard', 'working', 'browse'] or ['', 'dashboard', 'hiring']
    const isHiringFromUrl = pathParts[2] === 'hiring'
    const tabSegment = pathParts[3] || null

    // Also support legacy ?tab= query param for backwards compat
    const params = new URLSearchParams(window.location.search)
    const tabParam = tabSegment || params.get('tab')

    // Valid tabs for each mode
    const humanTabs = ['dashboard', 'tasks', 'browse', 'messages', 'payments', 'profile', 'settings', 'notifications']
    const hiringTabs = ['dashboard', 'posted', 'browse', 'messages', 'payments', 'api-keys', 'profile', 'settings', 'notifications']

    if (tabParam) {
      // Map URL-friendly names to internal tab IDs
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

  // Email verification state (in Settings > Account)
  const [emailVerifCode, setEmailVerifCode] = useState('')
  const [emailVerifSent, setEmailVerifSent] = useState(false)
  const [emailVerifSending, setEmailVerifSending] = useState(false)
  const [emailVerifError, setEmailVerifError] = useState('')
  const [emailVerifSuccess, setEmailVerifSuccess] = useState(!!user?.email_verified)
  const [emailVerifying, setEmailVerifying] = useState(false)

  // Helper to update URL path without page reload
  const updateTabUrl = (tabId, mode) => {
    // Map internal tab IDs to URL-friendly names
    const urlMap = {
      'dashboard': 'dashboard',
      'posted': 'my-tasks',
      'tasks': 'my-tasks',
      'browse': 'browse',
      'messages': 'messages',
      'payments': 'payments',
      'profile': 'profile',
      'settings': 'settings',
      'notifications': 'notifications'
    }
    const urlTab = urlMap[tabId] || tabId
    const modeSegment = (mode !== undefined ? mode : hiringMode) ? 'hiring' : 'working'
    const newUrl = `/dashboard/${modeSegment}/${urlTab}`
    window.history.pushState({}, '', newUrl)
    trackPageView(newUrl)
  }

  // Wrapper for setActiveTab that also updates URL
  const setActiveTab = (tabId) => {
    // 'create' is a virtual tab — route to posted tab with create sub-tab
    if (tabId === 'create') {
      setActiveTabState('posted')
      setTasksSubTab('create')
      const modeSegment = hiringMode ? 'hiring' : 'working'
      window.history.pushState({}, '', `/dashboard/${modeSegment}/create`)
      return
    }
    setActiveTabState(tabId)
    updateTabUrl(tabId)
  }
  const [tasks, setTasks] = useState([])
  const [availableTasks, setAvailableTasks] = useState([]) // Tasks available for humans to browse
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
  const [taskApplications, setTaskApplications] = useState({}) // { taskId: [applications] }

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [sidebarOpen]);

  // Dashboard tour state — show for first-time users who haven't completed the tour
  const [showTour, setShowTour] = useState(() => {
    return localStorage.getItem('irlwork_tour_completed') !== 'true'
  })

  // Profile edit location state
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
  const [expandedTask, setExpandedTask] = useState(null) // taskId for viewing applicants
  const [assigningHuman, setAssigningHuman] = useState(null) // loading state
  const [expandedHumanId, setExpandedHumanId] = useState(null) // expanded profile modal
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [cancelConfirmId, setCancelConfirmId] = useState(null)
  const [cancellingTaskId, setCancellingTaskId] = useState(null)
  const [decliningAppId, setDecliningAppId] = useState(null)
  const [negotiateAppId, setNegotiateAppId] = useState(null)
  const [negotiateMsg, setNegotiateMsg] = useState('')
  const [assignNotes, setAssignNotes] = useState({}) // { [humanId]: 'note text' }

  // Task creation form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    city: '',
    latitude: null,
    longitude: null,
    country: '',
    country_code: '',
    is_remote: false,
    duration_hours: '',
    deadline: '',
    requirements: '',
    required_skills: [],
    skillInput: '',
    task_type: 'open',
    quantity: 1,
    is_anonymous: false
  })
  const [creatingTask, setCreatingTask] = useState(false)
  const [createTaskError, setCreateTaskError] = useState('')
  const [taskFormTouched, setTaskFormTouched] = useState({})

  useEffect(() => {
    localStorage.setItem('irlwork_hiringMode', hiringMode)
  }, [hiringMode])

  // Handle Stripe Connect onboarding return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stripeOnboard = params.get('stripe_onboard')
    if (stripeOnboard === 'complete') {
      toast.success('Bank account setup complete! You can now receive payments.')
      setActiveTab('payments')
      // Clean up URL param
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

  // Pre-fill location filter with user's city
  useEffect(() => {
    if (user?.city && !locationFilter) {
      setLocationFilter(user.city)
      if (user.latitude && user.longitude) {
        setFilterCoords({ lat: user.latitude, lng: user.longitude })
      }
    }
  }, [user])

  // Handle location selection from filter
  const handleLocationSelect = (locationData) => {
    setLocationFilter(locationData.city)
    setFilterCoords({
      lat: locationData.latitude,
      lng: locationData.longitude
    })
  }

  // Unread counts for badges
  const [unreadMessages, setUnreadMessages] = useState(0)
  const unreadNotifications = notifications.filter(n => !n.is_read).length

  // Notification dropdown state
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)

  // Check if current user is admin (from is_admin flag returned by /api/auth/verify)
  // The backend checks ADMIN_USER_IDS env var and sets is_admin: true/false
  // TODO: Migrate admin auth from env var to users.role database column for easier management
  const isAdmin = user && user.is_admin === true

  // Working mode: Dashboard, My Tasks, Browse Tasks, Messages, Payments
  const humanNav = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
    { id: 'tasks', label: 'My Tasks', icon: Icons.task },
    { id: 'browse', label: 'Browse Tasks', icon: Icons.search },
    { id: 'messages', label: 'Messages', icon: Icons.messages, badge: unreadMessages },
    { id: 'payments', label: 'Payments', icon: Icons.wallet },
  ]

  // Hiring mode: Dashboard, My Tasks, Humans, Messages, Payments, API Keys
  const hiringNav = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
    { id: 'posted', label: 'My Tasks', icon: Icons.task },
    { id: 'browse', label: 'Humans', icon: Icons.humans },
    { id: 'messages', label: 'Messages', icon: Icons.messages, badge: unreadMessages },
    { id: 'payments', label: 'Payments', icon: Icons.wallet },
    { id: 'api-keys', label: 'API Keys', icon: Icons.key },
  ]

  // Add admin tab if user is admin
  const baseNav = hiringMode ? hiringNav : humanNav
  const navItems = isAdmin ? [...baseNav, { id: 'admin', label: 'Admin', icon: Icons.admin }] : baseNav

  // Mark all notifications as read and remove them from the list
  const markAllNotificationsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      // Remove unread notifications from state immediately
      setNotifications(prev => prev.filter(n => n.is_read))
      // Mark each as read in backend (fire and forget)
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
      const mode = pathParts[2] // 'working' or 'hiring'
      const tabSegment = pathParts[3] || null
      const isHiring = mode === 'hiring'

      // Detect mode change from URL path
      if (isHiring && !hiringMode) {
        setHiringMode(true)
        setActiveTabState('dashboard')
      } else if (!isHiring && hiringMode) {
        setHiringMode(false)
        setActiveTabState('dashboard')
      }

      // Also support legacy ?tab= query param
      const tabParam = tabSegment || new URLSearchParams(window.location.search).get('tab')
      if (tabParam) {
        const isHiring = mode === 'hiring'
        // Handle /create URL → posted tab + create sub-tab
        if (tabParam === 'create' && isHiring) {
          setActiveTabState('posted')
          setTasksSubTab('create')
          return
        }
        const tabMap = {
          'dashboard': 'dashboard',
          'create-task': 'posted',
          'my-tasks': isHiring ? 'posted' : 'tasks',
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
        setActiveTabState(mappedTab)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [hiringMode])

  useEffect(() => {
    if (!user?.token) return // Wait for auth token before fetching
    if (hiringMode) {
      fetchPostedTasks()
      fetchHumans() // For hiring mode to browse humans
    } else {
      fetchTasks()
      fetchAvailableTasks() // For working mode to browse available tasks
      fetchWallet()
    }
    fetchConversations()
    fetchNotifications()
    fetchUnreadMessages()
  }, [hiringMode, user?.token])

  // Re-fetch tasks when location/radius filters change
  useEffect(() => {
    if (!hiringMode) {
      fetchAvailableTasks()
    }
  }, [filterCoords.lat, filterCoords.lng, radiusFilter, filterCategory])

  // Real-time subscriptions for agents
  useEffect(() => {
    if (!hiringMode || !user) return

    // Subscribe to changes on agent's tasks
    const tasksChannel = safeSupabase
      .channel(`agent-tasks-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          // Refresh tasks when any change occurs on agent's tasks
          if (payload.new?.agent_id === user.id || payload.old?.agent_id === user.id) {
            fetchPostedTasks()
          }
        }
      )
      .subscribe()

    // Subscribe to new applications
    const applicationsChannel = safeSupabase
      .channel(`task-applications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_applications' },
        (payload) => {
          // Refresh applications for the task if it's expanded
          if (expandedTask && payload.new?.task_id === expandedTask) {
            fetchApplicationsForTask(expandedTask)
          }
        }
      )
      .subscribe()

    // Subscribe to changes on worker's assigned tasks (for human users)
    let workerChannel = null
    if (user.type === 'human') {
      workerChannel = safeSupabase
        .channel(`worker-tasks-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `human_id=eq.${user.id}` },
          () => { fetchTasks() }
        )
        .subscribe()
    }

    return () => {
      safeSupabase.removeChannel(tasksChannel)
      safeSupabase.removeChannel(applicationsChannel)
      if (workerChannel) safeSupabase.removeChannel(workerChannel)
    }
  }, [hiringMode, user, expandedTask])

  // Poll for new messages when Messages tab is active and a conversation is selected
  useEffect(() => {
    if (activeTab !== 'messages' || !selectedConversation) return
    const interval = setInterval(() => {
      fetchMessages(selectedConversation, true) // skipMarkRead on polls — already marked on open
    }, 5000)
    return () => clearInterval(interval)
  }, [activeTab, selectedConversation])

  // Background refresh: keep unread badge fresh
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      fetchUnreadMessages()
    }, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return

    const messagesChannel = safeSupabase
      .channel(`user-messages-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // If we're viewing the conversation this message belongs to, refresh it
          if (selectedConversation && payload.new?.conversation_id === selectedConversation) {
            fetchMessages(selectedConversation, true)
          }
          // Always refresh unread count and conversation list
          fetchUnreadMessages()
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      safeSupabase.removeChannel(messagesChannel)
    }
  }, [user, selectedConversation])

  const fetchTasks = async () => {
    if (!user?.token) return
    try {
      const res = await fetch(`${API_URL}/my-tasks`, { headers: { Authorization: user.token } })
      if (res.ok) {
        const data = await res.json()
        setTasks(data || [])
      }
    } catch (e) {
      debug('Could not fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  // Fetch available tasks for humans to browse
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
      if (res.ok) {
        const data = await res.json()
        setAvailableTasks(data || [])
      }
    } catch (e) {
      debug('Could not fetch available tasks')
    }
  }

  const fetchHumans = async () => {
    if (!user?.token) return
    setHumansError(null)
    try {
      const res = await fetch(`${API_URL}/humans`, { headers: { Authorization: user.token } })
      if (res.ok) {
        const data = await res.json()
        setHumans(fixAvatarUrl(data || []))
      } else {
        setHumansError(`Server error (${res.status})`)
      }
    } catch (e) {
      setHumansError('Could not connect to server')
    }
  }

  const fetchPostedTasks = async () => {
    if (!user?.token) return
    try {
      const res = await fetch(`${API_URL}/agent/tasks`, { headers: { Authorization: user.token } })
      if (res.ok) {
        const data = await res.json()
        setPostedTasks(data || [])
      }
    } catch (e) {
      debug('Could not fetch posted tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchApplicationsForTask = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/applications`, {
        headers: { Authorization: user.token || '' }
      })
      if (res.ok) {
        const data = await res.json()
        setTaskApplications(prev => ({ ...prev, [taskId]: data }))
      }
    } catch (e) {
      debug('Could not fetch applications')
    }
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.token || ''
        },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        const data = await res.json()
        fetchPostedTasks()
        setExpandedTask(null)
        setTaskApplications(prev => ({ ...prev, [taskId]: [] }))
        setAssignNotes(prev => { const next = { ...prev }; delete next[humanId]; return next })

        // Show appropriate toast based on payment method
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
    } catch (e) {
      toast.error('Network error. Please try again.')
    } finally {
      setAssigningHuman(null)
    }
  }

  const handleCancelTask = async (taskId) => {
    setCancellingTaskId(taskId)
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers: { Authorization: user.token || '' }
      })
      if (res.ok) {
        toast.success('Task cancelled')
        fetchPostedTasks()
        setCancelConfirmId(null)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to cancel task')
      }
    } catch (e) {
      toast.error('Network error')
    } finally {
      setCancellingTaskId(null)
    }
  }

  const handleEditTask = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        toast.success('Task updated')
        setEditingTaskId(null)
        setEditForm({})
        fetchPostedTasks()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to update task')
      }
    } catch (e) {
      toast.error('Network error')
    }
  }

  const handleDeclineApplication = async (taskId, appId) => {
    setDecliningAppId(appId)
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/applications/${appId}/decline`, {
        method: 'POST',
        headers: { Authorization: user.token || '' }
      })
      if (res.ok) {
        toast.success('Application declined')
        fetchApplicationsForTask(taskId)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to decline')
      }
    } catch (e) {
      toast.error('Network error')
    } finally {
      setDecliningAppId(null)
    }
  }

  const handleNegotiate = async (taskId, humanId) => {
    if (!negotiateMsg.trim()) return
    try {
      const msgRes = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
        body: JSON.stringify({ recipient_id: humanId, task_id: taskId, content: negotiateMsg.trim() })
      })
      if (msgRes.ok) {
        toast.success('Message sent')
        setNegotiateAppId(null)
        setNegotiateMsg('')
      } else {
        toast.error('Failed to send message')
      }
    } catch (e) {
      toast.error('Network error')
    }
  }

  const fetchWallet = async () => {
    if (!user?.token) return
    try {
      const res = await fetch(`${API_URL}/wallet/status`, { headers: { Authorization: user.token } })
      if (res.ok) {
        const data = await res.json()
        setWallet(data || { balance: 0, transactions: [] })
      }
    } catch (e) {
      debug('Could not fetch wallet')
    }
  }

  const fetchNotifications = async () => {
    if (!user?.token) return
    try {
      const res = await fetch(`${API_URL}/notifications`, { headers: { Authorization: user.token } })
      if (res.ok) {
        const data = await res.json()
        // Only show unread notifications — clicked/read ones are removed from the list
        setNotifications((data || []).filter(n => !n.is_read))
      }
    } catch (e) {
      debug('Could not fetch notifications')
    }
  }

  const markNotificationRead = async (id) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'POST', headers: { Authorization: user.token || '' } })
      fetchNotifications()
    } catch (e) {}
  }

  // Notification icon map for all notification types
  const NOTIFICATION_ICONS = {
    task_assigned: <ClipboardList size={18} />,
    proof_submitted: <FileText size={18} />,
    proof_approved: <CheckCircle size={18} />,
    proof_rejected: <XCircle size={18} />,
    payment_released: <DollarSign size={18} />,
    payment_approved: <DollarSign size={18} />,
    payment_sent: <ArrowDownLeft size={18} />,
    deposit_confirmed: <Landmark size={18} />,
    dispute_opened: <Scale size={18} />,
    dispute_filed: <Scale size={18} />,
    dispute_created: <Scale size={18} />,
    dispute_resolved: <CheckCircle size={18} />,
    rating_received: <Star size={18} />,
    rating_visible: <Star size={18} />,
    new_message: <MessageCircle size={18} />,
    assignment_cancelled: <Ban size={18} />,
    refund_processed: <ArrowDownLeft size={18} />,
  }

  // Navigate to a notification's linked page
  const navigateToNotification = (notification) => {
    // Remove the clicked notification from state immediately so it disappears from UI
    setNotifications(prev => prev.filter(n => n.id !== notification.id))
    // Mark as read in backend (fire and forget — no refetch needed since we already removed it)
    fetch(`${API_URL}/notifications/${notification.id}/read`, { method: 'POST', headers: { Authorization: user.token || '' } }).catch(() => {})
    setNotificationDropdownOpen(false)

    const link = notification.link
    if (!link) return

    // External links — only allow trusted domains
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

    // Task detail page
    if (link.startsWith('/tasks/')) {
      spaNavigate(link)
      return
    }

    // Dashboard links (e.g. /dashboard/hiring/payments or legacy /dashboard?task=xxx)
    if (link.startsWith('/dashboard')) {
      const params = new URLSearchParams(link.split('?')[1] || '')
      const taskId = params.get('task')
      if (taskId) {
        spaNavigate(`/tasks/${taskId}`)
        return
      }
      // Parse tab from path segment: /dashboard/working/browse → 'browse'
      const linkParts = link.split('?')[0].split('/')
      const tabFromPath = linkParts[3] || null
      const tab = tabFromPath || params.get('tab')
      if (tab) {
        setActiveTab(tab)
      }
      return
    }

    // Browse page
    if (link.startsWith('/browse')) {
      spaNavigate(link)
      return
    }

    // Disputes tab
    if (link.startsWith('/disputes')) {
      setActiveTab('disputes')
      return
    }

    // Fallback
    spaNavigate(link)
  }

  const fetchConversations = async () => {
    if (!user?.token) return
    setConversationsLoading(prev => prev || conversations.length === 0) // Only show loading on first load
    try {
      const res = await fetch(`${API_URL}/conversations`, { headers: { Authorization: user.token } })
      if (res.ok) {
        const data = await res.json()
        setConversations(data || [])
        setConversationsError(null)
      } else {
        setConversationsError('Failed to load conversations')
      }
    } catch (e) {
      setConversationsError('Network error. Check your connection.')
    } finally {
      setConversationsLoading(false)
    }
  }

  const fetchUnreadMessages = async () => {
    if (!user?.token) return
    try {
      const res = await fetch(`${API_URL}/messages/unread/count`, { headers: { Authorization: user.token } })
      if (res.ok) {
        const data = await res.json()
        setUnreadMessages(data.count || 0)
      }
    } catch (e) {
      debug('Could not fetch unread count')
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    setCreateTaskError('')

    // Validation
    if (!taskForm.title.trim()) {
      setCreateTaskError('Title is required')
      return
    }
    if (!taskForm.category) {
      setCreateTaskError('Category is required')
      return
    }
    if (!taskForm.budget || parseFloat(taskForm.budget) < 5) {
      setCreateTaskError('Budget must be at least $5')
      return
    }
    if (!taskForm.is_remote && !taskForm.city.trim()) {
      setCreateTaskError('City is required for in-person tasks')
      return
    }
    if (!taskForm.duration_hours || parseFloat(taskForm.duration_hours) <= 0) {
      setCreateTaskError('Duration is required (estimated hours to complete)')
      return
    }

    setCreatingTask(true)
    try {
      // Direct hire: use /api/tasks/create with assign_to (task goes to pending_acceptance for that worker)
      // Open task: use /api/tasks (task goes to open for anyone to apply)
      const isDirectHire = !!hireTarget
      const endpoint = isDirectHire ? `${API_URL}/tasks/create` : `${API_URL}/tasks`
      const payload = {
        title: taskForm.title,
        description: taskForm.description,
        category: taskForm.category,
        budget: parseFloat(taskForm.budget),
        location: taskForm.city,
        latitude: taskForm.latitude,
        longitude: taskForm.longitude,
        country: taskForm.country,
        country_code: taskForm.country_code,
        is_remote: taskForm.is_remote,
        duration_hours: taskForm.duration_hours ? parseFloat(taskForm.duration_hours) : null,
        deadline: taskForm.deadline ? new Date(taskForm.deadline).toISOString() : null,
        requirements: taskForm.requirements.trim() || null,
        required_skills: taskForm.required_skills.length > 0 ? taskForm.required_skills : [],
        task_type: isDirectHire ? 'direct' : 'open',
        quantity: 1,
        is_anonymous: taskForm.is_anonymous
      }
      if (isDirectHire) {
        payload.assign_to = hireTarget.id
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.token || ''
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const newTask = await res.json()
        trackEvent('task_created', { category: taskForm.category, budget: parseFloat(taskForm.budget), is_remote: taskForm.is_remote, task_type: isDirectHire ? 'direct' : 'open', direct_hire: isDirectHire })
        // Optimistic update - add to list immediately
        setPostedTasks(prev => [newTask, ...prev])
        // Reset form and clear hire target
        setTaskForm({ title: '', description: '', category: '', budget: '', city: '', latitude: null, longitude: null, country: '', country_code: '', is_remote: false, duration_hours: '', deadline: '', requirements: '', required_skills: [], skillInput: '', task_type: 'open', quantity: 1, is_anonymous: false })
        setTaskFormTouched({})
        setHireTarget(null)
        // Close create form and show posted tasks list
        setTasksSubTab('tasks')
        setActiveTab('posted')
      } else {
        const err = await res.json()
        if (err.code === 'payment_required' || err.code === 'card_required' || res.status === 402) {
          setCreateTaskError('You need to add a payment method before creating a task.')
          // Switch to payments tab so user can add a card
          setTimeout(() => setActiveTab('payments'), 1500)
        } else {
          setCreateTaskError(err.error || 'Failed to create task')
        }
      }
    } catch (e) {
      setCreateTaskError('Network error. Please try again.')
    } finally {
      setCreatingTask(false)
    }
  }

  const fetchMessages = async (conversationId, skipMarkRead = false) => {
    if (!skipMarkRead) setMessagesLoading(true)
    try {
      const res = await fetch(`${API_URL}/messages/${conversationId}`, { headers: { Authorization: user.token || '' } })
      if (res.ok) {
        const data = await res.json()
        // Sort by created_at to guarantee chronological order (#3)
        const sorted = (data || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        setMessages(sorted)
        setMessagesError(null)
        // Mark messages as read when opening a conversation (matches TaskDetailPage pattern)
        if (!skipMarkRead) {
          fetch(`${API_URL}/conversations/${conversationId}/read-all`, {
            method: 'PUT',
            headers: { Authorization: user.token || '' }
          }).then(() => {
            fetchUnreadMessages()
            fetchConversations()
          }).catch(() => {})
        }
      } else {
        setMessagesError('Failed to load messages')
      }
    } catch (e) {
      setMessagesError('Network error. Check your connection.')
    } finally {
      setMessagesLoading(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return
    const msgContent = newMessage
    setNewMessage('') // Clear immediately for responsiveness
    setSendingMessage(true)
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
        body: JSON.stringify({ conversation_id: selectedConversation, content: msgContent })
      })
      if (!res.ok) {
        throw new Error('Failed to send')
      }
      fetchMessages(selectedConversation, true)
      fetchConversations()
    } catch (e) {
      setNewMessage(msgContent) // Restore on error
      toast.error('Message failed to send. Please try again.')
    } finally {
      setSendingMessage(false)
    }
  }

  const acceptTask = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/accept`, {
        method: 'POST',
        headers: { Authorization: user.token || '' }
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.code === 'payment_error') {
          debug('Payment failed — the agent\'s card could not be charged. Contact the agent.')
          return
        }
      }
      fetchTasks()
    } catch (e) {
      debug('Could not accept task')
    }
  }

  const declineTask = async (taskId, reason = '') => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/decline`, {
        method: 'POST',
        headers: {
          Authorization: user.token || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      })
      fetchTasks()
    } catch (e) {
      debug('Could not decline task')
    }
  }

  const startWork = async (taskId) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/start`, {
        method: 'POST',
        headers: { Authorization: user.token || '' }
      })
      fetchTasks()
    } catch (e) {
      debug('Could not start work')
    }
  }

  const approveTask = async (taskId) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/approve`, { 
        method: 'POST',
        headers: { Authorization: user.token || '' }
      })
      fetchPostedTasks()
    } catch (e) {
      debug('Could not approve task')
    }
  }

  const releasePayment = async (taskId) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/release`, { 
        method: 'POST',
        headers: { Authorization: user.token || '' }
      })
      if (res.ok) {
        toast.success('Payment released successfully!')
        fetchPostedTasks()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Unknown error')
      }
    } catch (e) {
      toast.error('Could not release payment')
    }
  }

  const submitProof = async ({ proofText, proofUrls }) => {
    try {
      await fetch(`${API_URL}/tasks/${showProofSubmit}/submit-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.token || ''
        },
        body: JSON.stringify({ proof_text: proofText, proof_urls: proofUrls })
      })
      setShowProofSubmit(null)
      fetchTasks()
    } catch (e) {
      debug('Could not submit proof')
    }
  }

  const rejectTask = async ({ feedback, extendHours }) => {
    try {
      await fetch(`${API_URL}/tasks/${showProofReview}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.token || ''
        },
        body: JSON.stringify({ feedback, extend_deadline_hours: extendHours })
      })
      setShowProofReview(null)
      fetchPostedTasks()
    } catch (e) {
      debug('Could not reject task')
    }
  }

  const getTaskStatus = (status) => {
    const colors = {
      open: 'bg-teal/10 text-teal',
      accepted: 'bg-purple-100 text-purple-600',
      in_progress: 'bg-amber-100 text-amber-600',
      pending_review: 'bg-coral/10 text-coral',
      completed: 'bg-green-100 text-green-600',
      paid: 'bg-gray-100 text-gray-500',
      disputed: 'bg-red-100 text-red-600',
    }
    return colors[status] || 'bg-gray-100 text-gray-500'
  }

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Open',
      pending_acceptance: 'Pending Acceptance',
      accepted: 'Accepted',
      in_progress: 'In Progress',
      pending_review: 'Pending Review',
      completed: 'Completed',
      paid: 'Paid',
      disputed: 'Disputed',
    }
    return labels[status] || status
  }

  return (
    <div className="dashboard-v4">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="dashboard-v4-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`dashboard-v4-sidebar ${sidebarOpen ? 'open' : ''}`}
        role="navigation"
        aria-label="Dashboard navigation"
        onKeyDown={(e) => { if (e.key === 'Escape') setSidebarOpen(false); }}
      >
        {/* Logo */}
        <a href="/" className="dashboard-v4-sidebar-logo" style={{ textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); spaNavigate('/') }}>
          <Logo variant="header" theme="light" />
        </a>



        {/* Navigation */}
        <nav className="dashboard-v4-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id)
                setSidebarOpen(false)
              }}
              className={`dashboard-v4-nav-item ${activeTab === item.id ? 'active' : ''}`}
            >
              <div className="dashboard-v4-nav-item-content">
                <span className="dashboard-v4-nav-icon">{item.icon}</span>
                <span className="dashboard-v4-nav-label">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="dashboard-v4-nav-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar bottom section */}
        <div className="dashboard-v4-sidebar-bottom">
          {/* Connect Agent - Hiring mode only, before API key is created */}
          {hiringMode && !agentConnected && (
            <a
              href="/connect-agent"
              className="dashboard-v4-sidebar-bottom-item"
              onClick={() => setSidebarOpen(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v6M12 18v4M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M18 12h4M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />
              </svg>
              <span>Connect Agent</span>
            </a>
          )}

          {/* Mode Switch - mobile only */}
          <div className="dashboard-v4-mode-switch-mobile">
            {hiringMode ? (
              <button
                className="dashboard-v4-sidebar-bottom-item"
                onClick={() => { setHiringMode(false); setActiveTabState('dashboard'); updateTabUrl('dashboard', false); setSidebarOpen(false) }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                </svg>
                <span>Switch to Working</span>
              </button>
            ) : (
              <button
                className="dashboard-v4-sidebar-bottom-item"
                onClick={() => { setHiringMode(true); setActiveTabState('dashboard'); updateTabUrl('dashboard', true); setSidebarOpen(false) }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
                <span>Hire Humans</span>
              </button>
            )}
          </div>

          {/* Upgrade to Premium - hide if already on a paid plan */}
          {(!user?.subscription_tier || user.subscription_tier === 'free') && (
            <a
              href="/premium"
              className="dashboard-v4-sidebar-bottom-item dashboard-v4-sidebar-upgrade-link"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Upgrade to Premium</span>
            </a>
          )}

          {/* X / Twitter */}
          <a
            href="https://x.com/irlworkai"
            target="_blank"
            rel="noopener noreferrer"
            className="dashboard-v4-sidebar-bottom-item"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Follow us on X</span>
          </a>
        </div>

      </aside>

      {/* Sidebar Feedback Panel */}
      <FeedbackButton user={user} variant="sidebar" isOpen={feedbackOpen} onToggle={(v) => setFeedbackOpen(typeof v === 'boolean' ? v : !feedbackOpen)} />

      {/* Dashboard Tour for first-time users */}
      <DashboardTour
        isOpen={showTour}
        onComplete={() => setShowTour(false)}
        hiringMode={hiringMode}
      />

      {/* Main */}
      <main className="dashboard-v4-main">
        {/* Top Header Bar */}
        <div className="dashboard-v4-topbar">
          {/* Left: Mobile menu + Logo + Mode indicator */}
          <div className="dashboard-v4-topbar-left">
            <button className="dashboard-v4-menu-btn" onClick={() => setSidebarOpen(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <a href={hiringMode ? '/dashboard/hiring' : '/dashboard/working'} className="dashboard-v4-topbar-logo" style={{ textDecoration: 'none' }}>
              <Logo variant="header" theme="light" />
            </a>
            <button
              className="dashboard-v4-mode-indicator"
              onClick={() => {
                const newMode = !hiringMode;
                setHiringMode(newMode);
                setActiveTabState('dashboard');
                updateTabUrl('dashboard', newMode);
              }}
              title={hiringMode ? 'Switch to Working mode' : 'Switch to Hiring mode'}
            >
              {hiringMode ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  <span className="dashboard-v4-mode-indicator-label">Hiring</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                  </svg>
                  <span className="dashboard-v4-mode-indicator-label">Working</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Mode switch + Notifications + User */}
          <div className="dashboard-v4-topbar-right">
            {!hiringMode ? (
              <>
                <button
                  className="dashboard-v4-topbar-link dashboard-v4-topbar-cta"
                  onClick={() => { setHiringMode(true); setActiveTabState('dashboard'); updateTabUrl('dashboard', true) }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  Hire Humans
                </button>
                <a href="/connect-agent" className="dashboard-v4-topbar-link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  For Agents
                </a>
              </>
            ) : (
              <>
                <button
                  className="dashboard-v4-topbar-link dashboard-v4-topbar-cta dashboard-v4-topbar-cta-teal"
                  onClick={() => { setHiringMode(false); setActiveTabState('dashboard'); updateTabUrl('dashboard', false) }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                  </svg>
                  Work on Tasks
                </button>
                <button
                  className="dashboard-v4-topbar-link"
                  onClick={() => setActiveTab('browse')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  Browse Humans
                </button>
              </>
            )}
            {/* Admin Panel Link — only visible to admins */}
            {isAdmin && (
              <button
                className="dashboard-v4-topbar-link"
                onClick={() => setActiveTab('admin')}
                title="Admin Panel"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Admin
              </button>
            )}

            {/* Notifications Bell */}
            <div className="dashboard-v4-notifications-wrapper">
              <button
                className="dashboard-v4-notification-bell"
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadNotifications > 0 && (
                  <span className="dashboard-v4-notification-badge">{unreadNotifications}</span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationDropdownOpen && (
                <div className="dashboard-v4-notification-dropdown">
                  <div className="dashboard-v4-notification-dropdown-header">
                    <span>Notifications</span>
                    {unreadNotifications > 0 && (
                      <button onClick={markAllNotificationsRead} className="dashboard-v4-notification-mark-read">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="dashboard-v4-notification-dropdown-list">
                    {notifications.length === 0 ? (
                      <div className="dashboard-v4-notification-dropdown-empty">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 5).map(n => (
                        <div
                          key={n.id}
                          className={`dashboard-v4-notification-dropdown-item ${!n.is_read ? 'unread' : ''}`}
                          onClick={() => navigateToNotification(n)}
                        >
                          <div className="dashboard-v4-notification-dropdown-icon">
                            {NOTIFICATION_ICONS[n.type] || <Bell size={18} />}
                          </div>
                          <div className="dashboard-v4-notification-dropdown-content">
                            <p className="dashboard-v4-notification-dropdown-title">{n.title}</p>
                            <p className="dashboard-v4-notification-dropdown-time">
                              {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!n.is_read && <div className="dashboard-v4-notification-dropdown-dot" />}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="dashboard-v4-notification-dropdown-footer">
                    <button onClick={() => { setActiveTab('notifications'); setNotificationDropdownOpen(false); }}>
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="dashboard-v4-user-wrapper">
              <button
                className="dashboard-v4-user-trigger"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                <div className="dashboard-v4-user-avatar">
                  {user?.avatar_url ? (
                    <img key={user.avatar_url} src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
                  ) : null}
                  <span style={{ display: user?.avatar_url ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    {user?.name?.charAt(0) || '?'}
                  </span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={userDropdownOpen ? 'rotated' : ''}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {userDropdownOpen && (
                <div className="dashboard-v4-user-dropdown">
                  <div className="dashboard-v4-user-dropdown-header">
                    <div className="dashboard-v4-user-dropdown-avatar">
                      {user?.avatar_url ? (
                        <img key={user.avatar_url} src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
                      ) : null}
                      <span style={{ display: user?.avatar_url ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        {user?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="dashboard-v4-user-dropdown-info">
                      <p className="dashboard-v4-user-dropdown-name">{user?.name || 'User'}</p>
                      <p className="dashboard-v4-user-dropdown-email">{user?.email || ''}</p>
                    </div>
                  </div>
                  <div className="dashboard-v4-user-dropdown-divider" />
                  <button className="dashboard-v4-user-dropdown-item" onClick={() => { setActiveTab('profile'); setUserDropdownOpen(false); }}>
                    <span>{Icons.profile}</span> Profile
                  </button>
                  <button className="dashboard-v4-user-dropdown-item" onClick={() => { setActiveTab('settings'); setUserDropdownOpen(false); }}>
                    <span>{Icons.settings}</span> Settings
                  </button>
                  <a href="/contact" className="dashboard-v4-user-dropdown-item" style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => setUserDropdownOpen(false)}>
                    <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg></span> Contact Us
                  </a>
                  <button className="dashboard-v4-user-dropdown-item" onClick={() => { setFeedbackOpen(!feedbackOpen); setUserDropdownOpen(false); }}>
                    <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></span> Feedback
                  </button>
                  <div className="dashboard-v4-user-dropdown-divider" />
                  <button className="dashboard-v4-user-dropdown-item danger" onClick={onLogout}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="dashboard-v4-content">
        {/* Working Mode: Dashboard Tab */}
        {!hiringMode && activeTab === 'dashboard' && (
          <TabErrorBoundary>
            <Suspense fallback={<Loading />}>
              <WorkingDashboard
                user={user}
                tasks={tasks}
                notifications={notifications}
                onNavigate={(tab) => setActiveTab(tab)}
                onUserUpdate={onUserUpdate}
              />
            </Suspense>
          </TabErrorBoundary>
        )}

        {/* Hiring Mode: Dashboard Tab */}
        {hiringMode && activeTab === 'dashboard' && (
          <TabErrorBoundary>
            <Suspense fallback={<Loading />}>
              <HiringDashboard
                user={user}
                postedTasks={postedTasks}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            </Suspense>
          </TabErrorBoundary>
        )}

        {/* Hiring Mode: My Tasks Tab */}
        {hiringMode && activeTab === 'posted' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
              <h1 className="dashboard-v4-page-title" style={{ marginBottom: 0 }}>My Tasks</h1>
              <button className="hiring-dash-create-btn" onClick={() => { setTasksSubTab('create'); setCreateTaskError(''); setHireTarget(null); window.history.pushState({}, '', '/dashboard/hiring/create'); trackPageView('/dashboard/hiring/create'); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create Task
              </button>
            </div>

            {/* Sub-tabs: Status filters + Disputes */}
            <div className="dashboard-v4-sub-tabs">
              <button
                className={`dashboard-v4-sub-tab ${tasksSubTab === 'tasks' ? 'active' : ''}`}
                onClick={() => { setTasksSubTab('tasks'); setCreateTaskError(''); setHireTarget(null); window.history.pushState({}, '', '/dashboard/hiring/my-tasks'); trackPageView('/dashboard/hiring/my-tasks'); }}
              >
                All
              </button>
              <button
                className={`dashboard-v4-sub-tab ${tasksSubTab === 'active' ? 'active' : ''}`}
                onClick={() => { setTasksSubTab('active'); setCreateTaskError(''); window.history.pushState({}, '', '/dashboard/hiring/my-tasks'); trackPageView('/dashboard/hiring/my-tasks'); }}
              >
                Active
              </button>
              <button
                className={`dashboard-v4-sub-tab ${tasksSubTab === 'in_review' ? 'active' : ''}`}
                onClick={() => { setTasksSubTab('in_review'); setCreateTaskError(''); window.history.pushState({}, '', '/dashboard/hiring/my-tasks'); trackPageView('/dashboard/hiring/my-tasks'); }}
              >
                In Review
              </button>
              <button
                className={`dashboard-v4-sub-tab ${tasksSubTab === 'completed' ? 'active' : ''}`}
                onClick={() => { setTasksSubTab('completed'); setCreateTaskError(''); window.history.pushState({}, '', '/dashboard/hiring/my-tasks'); trackPageView('/dashboard/hiring/my-tasks'); }}
              >
                Completed
              </button>
              <button
                className={`dashboard-v4-sub-tab ${tasksSubTab === 'disputes' ? 'active' : ''}`}
                onClick={() => { setTasksSubTab('disputes'); setCreateTaskError(''); window.history.pushState({}, '', '/dashboard/hiring/my-tasks'); trackPageView('/dashboard/hiring/my-tasks'); }}
              >
                Disputes
              </button>
            </div>

            {tasksSubTab === 'create' && (
              <div style={{ marginTop: 16 }}>
                <div className="create-task-container">
                  <div className="create-task-header">
                    <h2 className="create-task-title">{hireTarget ? `Hire ${hireTarget.name?.split(' ')[0] || 'Worker'}` : 'Create a New Task'}</h2>
                    <p className="create-task-subtitle">{hireTarget ? 'This task will be sent directly to this worker for acceptance' : 'Fill in the details below to post your task'}</p>
                  </div>

                  {/* Direct hire banner */}
                  {hireTarget && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                      background: 'rgba(232,133,61,0.06)', borderRadius: 12,
                      border: '1px solid rgba(232,133,61,0.15)', marginBottom: 20
                    }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {hireTarget.avatar_url ? (
                          <img src={hireTarget.avatar_url} alt="" style={{
                            width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                            border: '2px solid rgba(232,133,61,0.25)'
                          }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
                        ) : null}
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%', background: '#E8853D',
                          display: hireTarget.avatar_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 700, fontSize: 18,
                          border: '2px solid rgba(232,133,61,0.25)'
                        }}>
                          {hireTarget.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{hireTarget.name || 'Worker'}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 1 }}>
                          {hireTarget.headline || hireTarget.city || 'Direct hire'}
                          {hireTarget.hourly_rate ? ` · $${hireTarget.hourly_rate}/hr` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setHireTarget(null); window.history.pushState({}, '', '/dashboard/hiring/create'); }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                          color: 'var(--text-tertiary)', borderRadius: 8, flexShrink: 0
                        }}
                        title="Switch to open task"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}

                  <form onSubmit={(e) => { handleCreateTask(e); }}>
                    {/* Section 1: Basics */}
                    <div className="create-task-section">
                      <div className="create-task-section-label">Basics</div>
                      <div className="dashboard-v4-form-group">
                        <label className="dashboard-v4-form-label">
                          Task Title <span className="dashboard-v4-form-required">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="What do you need done?"
                          className="dashboard-v4-form-input"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>

                      <div className="create-task-row-3col">
                        <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                          <label className="dashboard-v4-form-label">
                            Category <span className="dashboard-v4-form-required">*</span>
                          </label>
                          <CustomDropdown
                            value={taskForm.category}
                            onChange={(val) => setTaskForm(prev => ({ ...prev, category: val }))}
                            options={[
                              { value: '', label: 'Select category' },
                              ...['delivery', 'photography', 'data_collection', 'errands', 'cleaning', 'moving', 'manual_labor', 'inspection', 'tech', 'translation', 'verification', 'general'].map(c => ({
                                value: c,
                                label: c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                              }))
                            ]}
                            placeholder="Select category"
                          />
                        </div>
                        <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                          <label className="dashboard-v4-form-label">
                            Budget (USD) <span className="dashboard-v4-form-required">*</span>
                          </label>
                          <input
                            type="number"
                            placeholder="$"
                            className="dashboard-v4-form-input"
                            style={taskFormTouched.budget && (!taskForm.budget || parseFloat(taskForm.budget) < 5) ? { borderColor: '#DC2626' } : {}}
                            value={taskForm.budget}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, budget: e.target.value }))}
                            onBlur={() => setTaskFormTouched(prev => ({ ...prev, budget: true }))}
                            min="5"
                          />
                          {taskFormTouched.budget && (!taskForm.budget || parseFloat(taskForm.budget) < 5) && (
                            <p style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>Budget must be at least $5</p>
                          )}
                        </div>
                        <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                          <label className="dashboard-v4-form-label">
                            Duration <span style={{ color: '#DC2626' }}>*</span> <span className="dashboard-v4-form-optional">(hours)</span>
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 2"
                            className="dashboard-v4-form-input"
                            value={taskForm.duration_hours}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, duration_hours: e.target.value }))}
                            min="0.5"
                            step="0.5"
                            required
                            onBlur={() => setTaskFormTouched(prev => ({ ...prev, duration_hours: true }))}
                          />
                          {taskFormTouched.duration_hours && (!taskForm.duration_hours || parseFloat(taskForm.duration_hours) <= 0) && (
                            <p style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>Duration is required</p>
                          )}
                        </div>
                      </div>

                      <div className="dashboard-v4-form-group">
                        <label className="dashboard-v4-form-label">
                          Description <span className="dashboard-v4-form-optional">(optional)</span>
                        </label>
                        <textarea
                          placeholder="Provide details about the task..."
                          className="dashboard-v4-form-input dashboard-v4-form-textarea"
                          style={{ minHeight: 80 }}
                          value={taskForm.description}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Section 2: Location & Schedule */}
                    <div className="create-task-section">
                      <div className="create-task-section-label">Location & Schedule</div>
                      <div className="create-task-toggle-row">
                        <label className={`create-task-toggle-chip ${taskForm.is_remote ? 'active-green' : ''}`}>
                          <input
                            type="checkbox"
                            checked={taskForm.is_remote}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, is_remote: e.target.checked }))}
                          />
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                          Remote task
                        </label>
                        <label className={`create-task-toggle-chip ${taskForm.is_anonymous ? 'active-purple' : ''}`}>
                          <input
                            type="checkbox"
                            checked={taskForm.is_anonymous}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                          />
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="8"/></svg>
                          Post anonymously
                        </label>
                      </div>

                      <div className="create-task-row-2col">
                        {!taskForm.is_remote && (
                          <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                            <label className="dashboard-v4-form-label">
                              City <span className="dashboard-v4-form-required">*</span>
                            </label>
                            <CityAutocomplete
                              value={taskForm.city}
                              onChange={(locationData) => setTaskForm(prev => ({
                                ...prev,
                                city: locationData.city,
                                latitude: locationData.latitude,
                                longitude: locationData.longitude,
                                country: locationData.country,
                                country_code: locationData.country_code
                              }))}
                              placeholder="Where should this be done?"
                              className="dashboard-v4-city-input"
                            />
                          </div>
                        )}
                        <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                          <label className="dashboard-v4-form-label">
                            Deadline <span className="dashboard-v4-form-optional">(optional)</span>
                          </label>
                          <input
                            type="datetime-local"
                            className="dashboard-v4-form-input"
                            value={taskForm.deadline}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Requirements (optional) */}
                    <div className="create-task-section create-task-section-last">
                      <div className="create-task-section-label">Additional Details <span className="dashboard-v4-form-optional">(optional)</span></div>
                      <div className="dashboard-v4-form-group">
                        <label className="dashboard-v4-form-label">Requirements</label>
                        <textarea
                          placeholder="Any specific requirements or qualifications needed..."
                          className="dashboard-v4-form-input dashboard-v4-form-textarea"
                          style={{ minHeight: 60 }}
                          value={taskForm.requirements}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, requirements: e.target.value }))}
                          rows={2}
                        />
                      </div>

                      <div className="dashboard-v4-form-group" style={{ position: 'relative' }}>
                        <label className="dashboard-v4-form-label">Required Skills</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: taskForm.required_skills.length > 0 ? 8 : 0 }}>
                          {taskForm.required_skills.map((skill, i) => (
                            <span key={i} className="create-task-skill-chip">
                              {skill}
                              <button type="button" onClick={() => setTaskForm(prev => ({
                                ...prev, required_skills: prev.required_skills.filter((_, idx) => idx !== i)
                              }))} className="create-task-skill-remove">×</button>
                            </span>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Type a skill and press Enter"
                          className="dashboard-v4-form-input"
                          value={taskForm.skillInput}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, skillInput: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault()
                              const skill = taskForm.skillInput.trim().toLowerCase()
                              if (skill && !taskForm.required_skills.includes(skill)) {
                                setTaskForm(prev => ({
                                  ...prev,
                                  required_skills: [...prev.required_skills, skill],
                                  skillInput: ''
                                }))
                              }
                            }
                          }}
                        />
                        {/* Skill autocomplete suggestions */}
                        {taskForm.skillInput.trim().length > 0 && (() => {
                          const allSkills = ['driving', 'photography', 'videography', 'cleaning', 'cooking', 'moving', 'handyman', 'painting', 'gardening', 'delivery', 'data entry', 'translation', 'transcription', 'research', 'writing', 'graphic design', 'web development', 'social media', 'customer service', 'teaching', 'tutoring', 'pet care', 'childcare', 'elderly care', 'personal shopping', 'event planning', 'organization', 'assembly', 'installation', 'repair']
                          const matches = allSkills.filter(s => s.includes(taskForm.skillInput.trim().toLowerCase()) && !taskForm.required_skills.includes(s)).slice(0, 5)
                          return matches.length > 0 ? (
                            <div style={{ position: 'absolute', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, marginTop: 4, overflow: 'hidden' }}>
                              {matches.map(skill => (
                                <button key={skill} type="button" onClick={() => {
                                  setTaskForm(prev => ({ ...prev, required_skills: [...prev.required_skills, skill], skillInput: '' }))
                                }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#F5F2ED'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                >{skill}</button>
                              ))}
                            </div>
                          ) : null
                        })()}
                      </div>
                    </div>

                    {createTaskError && (
                      <div className="dashboard-v4-form-error">{createTaskError}</div>
                    )}
                    <button type="submit" className="dashboard-v4-form-submit" disabled={creatingTask}>
                      {creatingTask ? 'Creating...' : 'Create Task'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {['tasks', 'active', 'in_review', 'completed'].includes(tasksSubTab) && (
              <>
                {loading ? (
                  <div className="dashboard-v4-empty">
                    <div className="dashboard-v4-empty-icon"><Hourglass size={24} /></div>
                    <p className="dashboard-v4-empty-text">Loading...</p>
                  </div>
                ) : (() => {
                  const filteredTasks = tasksSubTab === 'tasks' ? postedTasks
                    : tasksSubTab === 'active' ? postedTasks.filter(t => ['open', 'assigned', 'in_progress'].includes(t.status))
                    : tasksSubTab === 'in_review' ? postedTasks.filter(t => t.status === 'pending_review')
                    : postedTasks.filter(t => ['completed', 'paid'].includes(t.status))
                  return filteredTasks.length === 0 ? (
                  <div className="dashboard-v4-empty" style={{ padding: '40px 24px' }}>
                    <div className="dashboard-v4-empty-icon" style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      {tasksSubTab === 'tasks' ? <ClipboardList size={28} style={{ color: 'var(--text-tertiary)' }} /> : Icons.task}
                    </div>
                    <p className="dashboard-v4-empty-title" style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>{tasksSubTab === 'tasks' ? 'No tasks posted yet' : `No ${tasksSubTab.replace('_', ' ')} tasks`}</p>
                    <p className="dashboard-v4-empty-text" style={{ marginBottom: 20, color: 'var(--text-secondary)' }}>{tasksSubTab === 'tasks' ? 'Post a task and get matched with verified humans near you.' : 'Tasks matching this filter will appear here'}</p>
                    {tasksSubTab === 'tasks' && (
                      <button
                        onClick={() => { setTasksSubTab('create'); window.history.pushState({}, '', '/dashboard/hiring/my-tasks/create'); }}
                        style={{ margin: '0 auto', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                      >
                        <Plus size={16} /> Create Task
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {filteredTasks.map(task => {
                      const needsAction = task.status === 'pending_review'
                      const isOpen = task.status === 'open'
                      const isExpanded = expandedTask === task.id
                      const applications = taskApplications[task.id] || []
                      const pendingCount = isExpanded
                        ? applications.filter(a => a.status === 'pending').length
                        : (task.pending_applicant_count || 0)
                      const cancellable = ['open', 'pending_acceptance', 'assigned', 'in_progress'].includes(task.status)
                      const isEditing = editingTaskId === task.id

                      return (
                        <div key={task.id} className="dashboard-v4-task-card" style={{ cursor: 'pointer' }} onClick={() => spaNavigate(`/tasks/${task.id}`)}>
                          <div className="dashboard-v4-task-header">
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className={`dashboard-v4-task-status ${task.status === 'open' ? 'open' : task.status === 'in_progress' ? 'in-progress' : task.status === 'completed' || task.status === 'paid' ? 'completed' : 'pending'}`}>
                                  {getStatusLabel(task.status)}
                                </span>
                                {pendingCount > 0 && (
                                  <span style={{ background: 'var(--orange-600)', color: 'white', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 12 }}>
                                    {pendingCount} applicant{pendingCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <h3 className="dashboard-v4-task-title" style={{ marginTop: 8 }}>{task.title}</h3>
                            </div>
                            <span className="dashboard-v4-task-budget">${task.budget || 0}</span>
                          </div>

                          <div className="dashboard-v4-task-meta">
                            <span className="dashboard-v4-task-meta-item"><FolderOpen size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {task.category || 'General'}</span>
                            <span className="dashboard-v4-task-meta-item"><MapPin size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {task.city || 'Remote'}</span>
                            <span className="dashboard-v4-task-meta-item"><CalendarDays size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {new Date(task.created_at || Date.now()).toLocaleDateString()}</span>
                            {task.deadline && (
                              <>
                                <span className="dashboard-v4-task-meta-item" style={new Date(task.deadline) < new Date(Date.now() + 86400000) ? { color: '#dc2626', fontWeight: 500 } : {}}>
                                  <Timer size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Due {new Date(task.deadline).toLocaleDateString()}
                                </span>
                                {new Date(task.deadline) < new Date() && ['in_progress', 'assigned'].includes(task.status) && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(255, 95, 87, 0.15)', color: '#FF5F57', letterSpacing: '0.5px' }}>OVERDUE</span>
                                )}
                              </>
                            )}
                            {task.assignee && (
                              <span className="dashboard-v4-task-meta-item"><User size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {task.assignee.name}</span>
                            )}
                          </div>

                          {/* Action buttons row */}
                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }} onClick={e => e.stopPropagation()}>
                            {isOpen && (
                              <button
                                className="v4-btn v4-btn-secondary"
                                style={{ fontSize: 13, padding: '6px 12px' }}
                                onClick={() => {
                                  setEditingTaskId(isEditing ? null : task.id)
                                  if (!isEditing) setEditForm({ title: task.title, description: task.description || '', budget: task.budget, category: task.category || '', location: task.city || '', is_remote: task.is_remote || false, deadline: task.deadline || '' })
                                }}
                              >
                                <FileText size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                                {isEditing ? 'Cancel Edit' : 'Edit'}
                              </button>
                            )}
                            {cancellable && (
                              <button
                                className="v4-btn"
                                style={{ fontSize: 13, padding: '6px 12px', color: '#dc2626', border: '1px solid #fecaca', background: '#fef2f2' }}
                                onClick={() => setCancelConfirmId(cancelConfirmId === task.id ? null : task.id)}
                              >
                                <Ban size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                                Cancel Task
                              </button>
                            )}
                          </div>

                          {/* Cancel confirmation */}
                          {cancelConfirmId === task.id && (
                            <div style={{ marginTop: 12, padding: 16, background: '#fef2f2', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca' }} onClick={e => e.stopPropagation()}>
                              <p style={{ fontSize: 14, color: '#dc2626', fontWeight: 500, marginBottom: 12 }}>Are you sure you want to cancel this task?</p>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  className="v4-btn"
                                  style={{ fontSize: 13, padding: '6px 16px', color: 'white', background: '#dc2626', border: 'none' }}
                                  disabled={cancellingTaskId === task.id}
                                  onClick={() => handleCancelTask(task.id)}
                                >
                                  {cancellingTaskId === task.id ? 'Cancelling...' : 'Yes, Cancel'}
                                </button>
                                <button className="v4-btn v4-btn-secondary" style={{ fontSize: 13, padding: '6px 16px' }} onClick={() => setCancelConfirmId(null)}>No, Keep</button>
                              </div>
                            </div>
                          )}

                          {/* Inline edit form */}
                          {isEditing && (
                            <div style={{ marginTop: 12, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'grid', gap: 12 }}>
                                <div>
                                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Title</label>
                                  <input type="text" value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14 }} />
                                </div>
                                <div>
                                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Description</label>
                                  <textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14, resize: 'vertical' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                  <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Budget ($)</label>
                                    <input type="number" value={editForm.budget || ''} onChange={e => setEditForm(f => ({ ...f, budget: parseFloat(e.target.value) || '' }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14 }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Category</label>
                                    <input type="text" value={editForm.category || ''} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14 }} />
                                  </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                  <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Location</label>
                                    <input type="text" value={editForm.location || ''} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14 }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Deadline</label>
                                    <input type="datetime-local" value={editForm.deadline ? editForm.deadline.slice(0, 16) : ''} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 14 }} />
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                  <button className="v4-btn v4-btn-secondary" style={{ fontSize: 13 }} onClick={() => { setEditingTaskId(null); setEditForm({}) }}>Cancel</button>
                                  <button className="v4-btn v4-btn-primary" style={{ fontSize: 13 }} onClick={() => handleEditTask(task.id)}>Save Changes</button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* View Applicants Button for open tasks */}
                          {isOpen && (
                            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }} onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedTask(null)
                                  } else {
                                    setExpandedTask(task.id)
                                    fetchApplicationsForTask(task.id)
                                  }
                                }}
                                style={{ color: 'var(--orange-600)', fontWeight: 500, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                {isExpanded ? '▼ Hide Applicants' : `▶ View Applicants${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
                              </button>

                              {/* Applicants List */}
                              {isExpanded && (
                                <div style={{ marginTop: 16 }}>
                                  {applications.length === 0 ? (
                                    <p style={{ color: 'var(--text-tertiary)', fontSize: 14, textAlign: 'center', padding: 16 }}>No applicants yet</p>
                                  ) : (
                                    applications.map(app => (
                                      <div key={app.id} style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, flexShrink: 0 }}>
                                              {app.applicant?.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                              <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{app.applicant?.name || 'Anonymous'}</p>
                                              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                <Star size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {app.applicant?.rating?.toFixed(1) || 'New'} • {app.applicant?.jobs_completed || 0} jobs
                                                {app.applicant?.success_rate !== null && app.applicant?.success_rate !== undefined && app.applicant?.success_rate < 70 && (
                                                  <span style={{ color: '#D97706', fontSize: 12, marginLeft: 6 }} title="Below average success rate">
                                                    ⚠ {app.applicant.success_rate}% success
                                                  </span>
                                                )}
                                              </p>
                                              {app.cover_letter && (
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}><strong>Why a good fit:</strong> {app.cover_letter}</p>
                                              )}
                                              {app.availability && (
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}><strong>Availability:</strong> {app.availability}</p>
                                              )}
                                              {app.questions && (
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}><strong>Questions:</strong> {app.questions}</p>
                                              )}
                                              {app.proposed_rate != null && (
                                                <p style={{ fontSize: 13, color: 'var(--orange-600)', marginTop: 2, fontWeight: 600 }}>Counter offer: ${app.proposed_rate}</p>
                                              )}
                                            </div>
                                          </div>
                                          {app.status === 'rejected' ? (
                                            <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>Declined</span>
                                          ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                                              <button
                                                onClick={() => handleAssignHuman(task.id, app.human_id)}
                                                disabled={assigningHuman === app.human_id}
                                                className="v4-btn v4-btn-primary"
                                                style={{ fontSize: 13 }}
                                              >
                                                {assigningHuman === app.human_id ? 'Assigning...' : 'Accept (Card)'}
                                              </button>
                                              <button
                                                onClick={() => handleAssignHuman(task.id, app.human_id, 'usdc')}
                                                disabled={assigningHuman === app.human_id}
                                                className="v4-btn"
                                                style={{ fontSize: 12, padding: '6px 12px', color: '#2563eb', border: '1px solid #2563eb', background: '#eff6ff' }}
                                              >
                                                {assigningHuman === app.human_id ? 'Assigning...' : 'Accept (USDC)'}
                                              </button>
                                              <button
                                                onClick={() => handleDeclineApplication(task.id, app.id)}
                                                disabled={decliningAppId === app.id}
                                                className="v4-btn"
                                                style={{ fontSize: 12, padding: '6px 12px', color: '#dc2626', border: '1px solid #fecaca', background: '#fef2f2' }}
                                              >
                                                {decliningAppId === app.id ? 'Declining...' : 'Decline'}
                                              </button>
                                              <button
                                                onClick={() => { setNegotiateAppId(negotiateAppId === app.id ? null : app.id); setNegotiateMsg('') }}
                                                className="v4-btn"
                                                style={{ fontSize: 12, padding: '6px 12px', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                                              >
                                                <MessageCircle size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                                                Negotiate
                                              </button>
                                            </div>
                                          )}
                                        </div>

                                        {/* Note for accept */}
                                        {app.status !== 'rejected' && (
                                          <div style={{ marginTop: 10 }}>
                                            <input
                                              type="text"
                                              placeholder="Add a note for the worker (optional)..."
                                              value={assignNotes[app.human_id] || ''}
                                              onClick={e => e.stopPropagation()}
                                              onChange={e => setAssignNotes(prev => ({ ...prev, [app.human_id]: e.target.value }))}
                                              style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                            />
                                          </div>
                                        )}

                                        {/* Negotiate message input */}
                                        {negotiateAppId === app.id && (
                                          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                                            <input
                                              type="text"
                                              placeholder="Send a message to negotiate..."
                                              value={negotiateMsg}
                                              onChange={e => setNegotiateMsg(e.target.value)}
                                              onKeyDown={e => { if (e.key === 'Enter') handleNegotiate(task.id, app.human_id) }}
                                              style={{ flex: 1, padding: '6px 10px', fontSize: 13, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
                                            />
                                            <button
                                              className="v4-btn v4-btn-primary"
                                              style={{ fontSize: 13, padding: '6px 12px' }}
                                              onClick={() => handleNegotiate(task.id, app.human_id)}
                                              disabled={!negotiateMsg.trim()}
                                            >
                                              Send
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {needsAction && (
                            <div className="dashboard-v4-task-actions" onClick={e => e.stopPropagation()}>
                              <button className="v4-btn v4-btn-primary" onClick={() => setShowProofReview(task.id)}>
                                Review Proof
                              </button>
                            </div>
                          )}
                          {task.status === 'paid' && (
                            <p style={{ color: 'var(--success)', fontSize: 14, marginTop: 12 }}><ArrowDownLeft size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Payment released</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
                })()}
              </>
            )}

            {tasksSubTab === 'disputes' && (
              <DisputePanel user={user} />
            )}
          </div>
        )}


        {/* Working Mode: My Tasks Tab */}
        {!hiringMode && activeTab === 'tasks' && (
          <TabErrorBoundary>
            <Suspense fallback={<Loading />}>
              <MyTasksPage
                user={user}
                tasks={tasks}
                loading={loading}
                acceptTask={acceptTask}
                declineTask={declineTask}
                onStartWork={startWork}
                setShowProofSubmit={setShowProofSubmit}
                notifications={notifications}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            </Suspense>
          </TabErrorBoundary>
        )}

        {/* Working Mode: Browse Tasks Tab - Shows available tasks to claim */}
        {!hiringMode && activeTab === 'browse' && (
          <TabErrorBoundary>
            <Suspense fallback={<Loading />}>
              <BrowseTasksV2
                user={user}
                initialLocation={{
                  lat: filterCoords?.lat || user?.latitude,
                  lng: filterCoords?.lng || user?.longitude,
                  city: locationFilter || user?.city
                }}
                initialRadius={radiusFilter || '25'}
              />
            </Suspense>
          </TabErrorBoundary>
        )}

        {/* Hiring Mode: Humans Tab - Browse + Hired sub-tabs */}
        {hiringMode && activeTab === 'browse' && (
          <div>
            <h1 className="dashboard-v4-page-title">Humans</h1>

            {/* Sub-tabs: Browse / Hired */}
            <div className="dashboard-v4-sub-tabs">
              <button
                className={`dashboard-v4-sub-tab ${humansSubTab === 'browse' ? 'active' : ''}`}
                onClick={() => setHumansSubTab('browse')}
              >
                Browse
              </button>
              <button
                className={`dashboard-v4-sub-tab ${humansSubTab === 'hired' ? 'active' : ''}`}
                onClick={() => setHumansSubTab('hired')}
              >
                Hired
              </button>
            </div>

            {humansSubTab === 'browse' && (
              <>
                {/* Search & Filters */}
                <div className="browse-humans-filters" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>{Icons.search}</span>
                    <input
                      type="text"
                      placeholder="Search by name..."
                      className="dashboard-v4-form-input"
                      style={{ paddingLeft: 44 }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {/* Mobile: Filters toggle button */}
                  <button
                    className="browse-filters-toggle-btn"
                    onClick={() => {
                      const el = document.querySelector('.browse-extra-filters')
                      if (el) el.classList.toggle('browse-extra-filters-hidden')
                    }}
                    style={{ display: 'none', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--bg-tertiary)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    <ChevronDown size={16} /> Filters
                  </button>
                  <div className="browse-extra-filters browse-extra-filters-hidden" style={{ display: 'contents' }}>
                    <div style={{ flex: '0 1 180px' }}>
                      <SkillAutocomplete
                        value={filterCategory}
                        onChange={setFilterCategory}
                        placeholder="Search skills..."
                        allLabel="All Skills"
                      />
                    </div>
                    <div style={{ flex: '0 1 180px' }}>
                      <CityAutocomplete
                        value={browseCityFilter}
                        onChange={(cityData) => setBrowseCityFilter(cityData.city || '')}
                        placeholder="Search city..."
                      />
                    </div>
                    <div style={{ flex: '0 1 180px' }}>
                      <CountryAutocomplete
                        value={browseCountryFilter}
                        onChange={(name, code) => {
                          setBrowseCountryFilter(name)
                          setBrowseCountryCodeFilter(code || '')
                        }}
                        placeholder="Search country..."
                      />
                    </div>
                    <div style={{ flex: '0 1 120px' }}>
                      <input
                        type="number"
                        placeholder="Max $/hr"
                        min="1"
                        className="dashboard-v4-form-input"
                        value={browseMaxRate}
                        onChange={(e) => setBrowseMaxRate(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: '0 1 160px' }}>
                      <CustomDropdown
                        value={browseSort}
                        onChange={setBrowseSort}
                        options={[
                          { value: 'rating', label: 'Top Rated' },
                          { value: 'most_reviewed', label: 'Most Reviewed' },
                          { value: 'price_low', label: 'Price: Low to High' },
                          { value: 'price_high', label: 'Price: High to Low' },
                          { value: 'newest', label: 'Newest' },
                        ]}
                        placeholder="Top Rated"
                      />
                    </div>
                  </div>
                </div>

                {(() => {
                  if (humansError) {
                    return (
                      <div className="dashboard-v4-empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>&#9888;&#65039;</div>
                        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>Failed to load humans</p>
                        <p style={{ fontSize: 14, maxWidth: 300, margin: '0 auto 16px', color: 'var(--text-secondary)' }}>{humansError}</p>
                        <button
                          onClick={fetchHumans}
                          style={{ background: 'var(--coral-500, #E8853D)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Try Again
                        </button>
                      </div>
                    )
                  }
                  const filtered = humans
                    .filter(h => !searchQuery || h.name?.toLowerCase().includes(searchQuery.toLowerCase()) || h.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
                    .filter(h => !filterCategory || h.skills?.includes(filterCategory))
                    .filter(h => !browseCityFilter || h.city?.toLowerCase().includes(browseCityFilter.toLowerCase()))
                    .filter(h => !browseCountryFilter || (browseCountryCodeFilter ? h.country_code?.toLowerCase() === browseCountryCodeFilter.toLowerCase() : h.country?.toLowerCase().includes(browseCountryFilter.trim().toLowerCase())))
                    .filter(h => !browseMaxRate || (h.hourly_rate || 25) <= Number(browseMaxRate))
                    .sort((a, b) => {
                      switch (browseSort) {
                        case 'rating': return (b.rating || 0) - (a.rating || 0)
                        case 'most_reviewed': return (b.total_ratings_count || 0) - (a.total_ratings_count || 0)
                        case 'price_low': return (a.hourly_rate || 25) - (b.hourly_rate || 25)
                        case 'price_high': return (b.hourly_rate || 25) - (a.hourly_rate || 25)
                        case 'newest': return new Date(b.created_at || 0) - new Date(a.created_at || 0)
                        default: return 0
                      }
                    })
                  return filtered.length === 0 ? (
                    <div className="dashboard-v4-empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
                      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><Users size={48} style={{ color: 'var(--text-muted, #AAAAAA)' }} /></div>
                      <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>No humans match your search</p>
                      <p style={{ fontSize: 14, maxWidth: 300, margin: '0 auto 16px', color: 'var(--text-secondary)' }}>
                        Humans are joining daily. Try broadening your filters or post a task and let humans come to you.
                      </p>
                      <button
                        onClick={() => { setTasksSubTab('create'); setActiveTab('posted') }}
                        style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                      >
                        <Plus size={16} /> Post a Task
                      </button>
                    </div>
                  ) : (
                    <div className="browse-humans-grid">
                      {filtered.map(human => (
                        <HumanProfileCard
                          key={human.id}
                          human={human}
                          variant="dashboard"
                          onExpand={(h) => spaNavigate(`/humans/${h.id}`)}
                          onHire={(human) => { setHireTarget(human); setTasksSubTab('create'); setActiveTabState('posted'); window.history.pushState({}, '', `/dashboard/hiring/create?hire=${human.id}`); trackPageView('/dashboard/hiring/create'); }}
                          onBookmark={toggleBookmark}
                          isBookmarked={bookmarkedHumans.includes(human.id)}
                        />
                      ))}
                    </div>
                  )
                })()}
              </>
            )}

            {humansSubTab === 'hired' && (
              <div className="dashboard-v4-empty">
                <div className="dashboard-v4-empty-icon">{Icons.humans}</div>
                <p className="dashboard-v4-empty-title">No humans hired yet</p>
                <p className="dashboard-v4-empty-text">Hire someone for a task</p>
              </div>
            )}
          </div>
        )}

        {/* Hiring Mode: Payments Tab */}
        {hiringMode && activeTab === 'payments' && (
          <div className="space-y-4 md:space-y-6">
            <h1 className="dashboard-v4-page-title">Payments</h1>

            {/* Payment Flow Explainer */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(15,76,92,0.06), rgba(224,122,95,0.06))',
              border: '1px solid rgba(15,76,92,0.12)',
              borderRadius: 16,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'rgba(15,76,92,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F4C5C" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>How payments work</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  When you assign a worker, your payment is held in escrow. Once you approve the completed work, the payment is released to the worker.
                </p>
              </div>
            </div>

            {/* Payment Overview */}
            {(() => {
              const paidTasks = postedTasks.filter(t => t.escrow_amount && t.escrow_status)
              const totalSpent = paidTasks.reduce((sum, t) => sum + (t.escrow_amount || 0), 0)
              const inEscrow = paidTasks.filter(t => t.status === 'in_progress').reduce((sum, t) => sum + (t.escrow_amount || 0), 0)
              const released = paidTasks.filter(t => t.status === 'paid' || t.status === 'completed').reduce((sum, t) => sum + (t.escrow_amount || 0), 0)
              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4">
                      <p className="text-xs text-[#888888] font-medium uppercase tracking-wider">Total Spent</p>
                      <p className="text-2xl md:text-3xl font-bold text-[#1A1A1A] tracking-tight mt-1">${(totalSpent / 100).toFixed(2)}</p>
                    </div>
                    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4">
                      <p className="text-xs text-[#888888] font-medium uppercase tracking-wider">In Escrow</p>
                      <p className="text-2xl md:text-3xl font-bold text-[#1A1A1A] tracking-tight mt-1">${(inEscrow / 100).toFixed(2)}</p>
                    </div>
                    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4 col-span-2 md:col-span-1">
                      <p className="text-xs text-[#888888] font-medium uppercase tracking-wider">Released</p>
                      <p className="text-2xl md:text-3xl font-bold text-teal tracking-tight mt-1">${(released / 100).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Transaction History</h3>

                    {paidTasks.length > 0 ? (
                      <div className="space-y-2 md:space-y-3">
                        {paidTasks.map(task => {
                          const isReleased = task.status === 'paid'
                          const isCompleted = task.status === 'completed'
                          const isInProgress = task.status === 'in_progress'

                          return (
                            <div
                              key={task.id}
                              className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-3 md:p-4 hover:shadow-v4-md transition-shadow"
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[#1A1A1A] font-medium text-sm md:text-base truncate">
                                      {task.title}
                                    </p>
                                    <span className={`
                                      px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide flex-shrink-0
                                      ${isReleased ? 'bg-teal/8 text-teal' : ''}
                                      ${isCompleted ? 'bg-teal/8 text-teal' : ''}
                                      ${isInProgress ? 'bg-[#F5F3F0] text-[#888888]' : ''}
                                      ${!isReleased && !isCompleted && !isInProgress ? 'bg-[#F5F3F0] text-[#333333]' : ''}
                                    `}>
                                      {isReleased ? 'Released' : isCompleted ? 'Completed' : isInProgress ? 'In Escrow' : task.escrow_status === 'deposited' ? 'Deposited' : task.escrow_status}
                                    </span>
                                    {task.payment_method === 'usdc' && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 flex-shrink-0">USDC</span>
                                    )}
                                  </div>

                                  <p className="text-xs text-[#888888] mt-1">
                                    {task.escrow_deposited_at
                                      ? new Date(task.escrow_deposited_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                      : 'Pending deposit'}
                                    {task.assignee && <> &middot; {task.assignee.name}</>}
                                  </p>
                                </div>

                                <div className="text-right flex-shrink-0">
                                  <p className={`
                                    text-lg md:text-xl font-bold
                                    ${isReleased || isCompleted ? 'text-[#1A1A1A]' : ''}
                                    ${isInProgress ? 'text-[#1A1A1A]' : ''}
                                    ${!isReleased && !isCompleted && !isInProgress ? 'text-[#888888]' : ''}
                                  `}>
                                    ${(task.escrow_amount / 100).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-8 md:p-12 text-center">
                        <div className="w-12 h-12 bg-[#F5F3F0] rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                          <svg className="w-6 h-6 text-[#888888]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                          </svg>
                        </div>
                        <p className="text-[#333333] font-medium text-sm md:text-base">No transactions yet</p>
                        <p className="text-xs md:text-sm text-[#A3A3A3] mt-1.5">
                          Fund a task to see your payment history
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )
            })()}

            {/* Payment Methods */}
            <div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Payment Methods</h3>
              <Suspense fallback={<Loading />}>
                <StripeProvider>
                  <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <h4 className="text-sm font-medium text-[#333333] mb-3">Saved Cards</h4>
                      <PaymentMethodList user={user} onUpdate={(refresh) => { window.__refreshPaymentMethods = refresh; }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-[#333333] mb-3">Add New Card</h4>
                      <PaymentMethodForm user={user} onSaved={() => { if (window.__refreshPaymentMethods) window.__refreshPaymentMethods(); }} />
                    </div>
                    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4 text-xs text-[#888888]">
                      When you assign a worker to a task, your default card will be charged automatically. Please ensure you have a card saved before assigning workers.
                    </div>
                  </div>
                </StripeProvider>
              </Suspense>
            </div>

            {/* USDC Payment Option */}
            <div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">USDC Payments</h3>
              <div style={{ maxWidth: 520 }}>
                <div className="bg-white border border-[rgba(26,26,26,0.08)] rounded-xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">Pay with USDC on Base</p>
                      <p className="text-xs text-[#525252] mt-1">
                        When assigning a worker, choose USDC to send payment directly to our platform wallet. Workers will be paid in USDC.
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#F5F2ED] rounded-lg p-3 mb-3">
                    <p className="text-xs text-[#8A8A8A] mb-1">Platform Wallet (Base)</p>
                    <p className="text-sm font-mono text-[#1A1A1A] break-all select-all">
                      {import.meta.env.VITE_PLATFORM_WALLET_ADDRESS || 'Configure VITE_PLATFORM_WALLET_ADDRESS'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#8A8A8A]">
                    <span>Network: Base</span>
                    <span>Token: USDC</span>
                    <span>Decimals: 6</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Working Mode: Payments Tab */}
        {!hiringMode && activeTab === 'payments' && (
          <div>
            <h1 className="dashboard-v4-page-title">Earnings</h1>
            <EarningsDashboard user={user} />
          </div>
        )}

        {/* Profile Tab - Edit Profile with Avatar Upload */}
        {activeTab === 'profile' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0, gap: 8, flexWrap: 'wrap' }}>
              <h1 className="dashboard-v4-page-title" style={{ marginBottom: 0 }}>Profile</h1>
              <button
                onClick={() => {
                  const profileUrl = `${window.location.origin}/humans/${user?.id}`
                  navigator.clipboard.writeText(profileUrl).then(() => {
                    setProfileLinkCopied(true)
                    setTimeout(() => setProfileLinkCopied(false), 2000)
                  })
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8,
                  border: '1px solid var(--border-secondary)',
                  background: profileLinkCopied ? 'var(--orange-50, #fff7ed)' : 'var(--bg-primary)',
                  color: profileLinkCopied ? 'var(--orange-600)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {profileLinkCopied ? <Check size={14} /> : <Copy size={14} />}
                {profileLinkCopied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            {/* Profile warning banner removed — single contextual banner kept below profile card */}

            <div className="dashboard-v4-form" style={{ maxWidth: 720, marginBottom: 24 }}>
              {/* Avatar Upload */}
              <div className="profile-avatar-section" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div
                  style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {user?.avatar_url ? (
                    <img key={user.avatar_url} src={user.avatar_url} alt={user?.name || ''} style={{
                      width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                      boxShadow: '0 2px 8px rgba(232,133,61,0.25)'
                    }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
                  ) : null}
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--orange-600), var(--orange-500))',
                    display: user?.avatar_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 28,
                    boxShadow: '0 2px 8px rgba(232,133,61,0.25)'
                  }}>
                    {user?.name?.charAt(0) || '?'}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--orange-500)', border: '2px solid white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {avatarUploading ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const origFile = e.target.files?.[0]
                      if (!origFile) return
                      // Clone file data BEFORE resetting input — iOS Safari
                      // invalidates File blobs when input.value is cleared
                      const fileData = await origFile.arrayBuffer()
                      const file = new File([fileData], origFile.name, { type: origFile.type, lastModified: origFile.lastModified })
                      e.target.value = ''
                      if (file.size > 20 * 1024 * 1024) {
                        toast.error('Image must be under 20MB')
                        return
                      }
                      // Accept common image types + HEIC/HEIF from iOS + empty type (iOS sometimes omits it)
                      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
                      const ext = file.name?.split('.').pop()?.toLowerCase()
                      const isImageByExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(ext)
                      if (file.type && !allowedTypes.includes(file.type) && !isImageByExt) {
                        toast.error('Please upload a JPG, PNG, WebP, GIF, or HEIC image')
                        return
                      }
                      setAvatarUploading(true)
                      try {
                        // Compress image client-side (converts HEIC→JPEG too)
                        let fileToUpload = file
                        const isGif = file.type === 'image/gif' || ext === 'gif'
                        if (!isGif) {
                          try {
                            const imageCompression = (await import('browser-image-compression')).default
                            const compressed = await imageCompression(file, {
                              maxSizeMB: 1,
                              maxWidthOrHeight: 1200,
                              useWebWorker: typeof Worker !== 'undefined',
                              fileType: 'image/jpeg',
                              initialQuality: 0.85,
                            })
                            // Sanity check: if compression produced a tiny file, use original instead
                            if (compressed.size < 5000) {
                              console.warn(`[Avatar] Compression produced tiny file (${compressed.size} bytes), using original (${file.size} bytes)`)
                              // Still need to convert to JPEG for HEIC compatibility — try without fileType forcing
                              try {
                                const retried = await imageCompression(file, {
                                  maxSizeMB: 2,
                                  maxWidthOrHeight: 1600,
                                  useWebWorker: typeof Worker !== 'undefined',
                                  initialQuality: 0.9,
                                })
                                if (retried.size > 5000) {
                                  fileToUpload = retried
                                } else {
                                  // Both attempts failed — use original if small enough
                                  fileToUpload = file.size <= 5 * 1024 * 1024 ? file : compressed
                                }
                              } catch {
                                fileToUpload = file.size <= 5 * 1024 * 1024 ? file : compressed
                              }
                            } else {
                              fileToUpload = compressed
                            }
                          } catch (compErr) {
                            console.warn('[Avatar] Compression failed:', compErr.message || compErr)
                            if (file.size > 4 * 1024 * 1024) {
                              toast.error('Could not process this image — try a smaller photo')
                              setAvatarUploading(false)
                              return
                            }
                          }
                        }
                        const base64 = await new Promise((resolve, reject) => {
                          const reader = new FileReader()
                          reader.onload = () => resolve(reader.result)
                          reader.onerror = () => reject(new Error('Failed to read file'))
                          reader.readAsDataURL(fileToUpload)
                        })
                        console.log(`[Avatar] Original: ${file.size} bytes (${file.type}), Compressed: ${fileToUpload.size} bytes (${fileToUpload.type}), Base64 length: ${base64.length}`)
                        const controller = new AbortController()
                        const timeout = setTimeout(() => controller.abort(), 60000)
                        try {
                          // Use compressed file's name/type — HEIC files get compressed to JPEG client-side
                          // but server rejects .heic extensions, so derive the correct filename
                          const uploadExt = (fileToUpload.type === 'image/jpeg' || !fileToUpload.type) ? 'jpg'
                            : fileToUpload.type === 'image/png' ? 'png'
                            : fileToUpload.type === 'image/webp' ? 'webp'
                            : fileToUpload.type === 'image/gif' ? 'gif'
                            : 'jpg'
                          const uploadFilename = file.name.replace(/\.[^.]+$/, `.${uploadExt}`)
                          // Use the matching MIME type for the derived extension — if compression failed
                          // on HEIC, fileToUpload.type would still be 'image/heic' which the server rejects
                          const uploadMime = uploadExt === 'jpg' ? 'image/jpeg'
                            : uploadExt === 'png' ? 'image/png'
                            : uploadExt === 'webp' ? 'image/webp'
                            : uploadExt === 'gif' ? 'image/gif'
                            : 'image/jpeg'
                          const payload = JSON.stringify({ file: base64, filename: uploadFilename, mimeType: uploadMime })
                          console.log(`[Avatar] Uploading: base64 length=${base64.length}, payload size=${payload.length}, compressed size=${fileToUpload.size}`)
                          const res = await fetch(`${API_URL}/upload/avatar`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
                            body: payload,
                            signal: controller.signal,
                          })
                          clearTimeout(timeout)
                          if (res.ok) {
                            const data = await res.json()
                            console.log(`[Avatar] Upload response:`, data)
                            // Use base64 for immediate display (guaranteed to show), but store
                            // the server proxy URL in localStorage for persistence across reloads.
                            const proxyUrl = data.url
                            const updatedUser = { ...user, avatar_url: proxyUrl || base64 }
                            onUserUpdate(updatedUser)
                            // Store proxy URL in localStorage — matches what fetchUserProfile returns
                            const cacheUser = { ...updatedUser, token: undefined }
                            localStorage.setItem('user', JSON.stringify(cacheUser))
                            // Update the humans array so browse cards reflect the new avatar instantly
                            setHumans(prev => prev.map(h => h.id === user.id ? { ...h, avatar_url: proxyUrl || base64 } : h))
                            toast.success('Profile photo updated!')
                          } else {
                            const errText = await res.text().catch(() => '')
                            let errMsg = 'Failed to upload photo'
                            try { errMsg = JSON.parse(errText).error || errMsg } catch {}
                            toast.error(errMsg)
                          }
                        } catch (fetchErr) {
                          clearTimeout(timeout)
                          if (fetchErr.name === 'AbortError') {
                            toast.error('Upload timed out — try a stronger connection')
                          } else {
                            toast.error(`Upload failed: ${fetchErr.message || 'network error'}`)
                          }
                        }
                      } catch (err) {
                        console.error('[Avatar] Error:', err)
                        toast.error('Error processing image — try a different photo')
                      }
                      setAvatarUploading(false)
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name || 'Your Name'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{user?.email}</div>
                  {!user?.verified && (
                    <a href="/premium" className="profile-get-verified-btn" style={{ marginTop: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Get Verified
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Profile completion banner — smart contextual messaging */}
            {(() => {
              const hasBio = !!(user?.bio && user.bio.trim().length > 10)
              const hasSkills = Array.isArray(user?.skills) && user.skills.length > 0
              const hasHeadline = !!(user?.headline && user.headline.trim())
              const hasPhoto = !!user?.avatar_url
              let msg = null
              if (!hasBio) msg = 'Add a bio to stand out — profiles with bios get 2× more task invites'
              else if (!hasSkills) msg = 'Add your skills to get matched with higher-paying tasks'
              else if (!hasHeadline) msg = 'Add a headline so agents know what you\'re great at'
              else if (!hasPhoto) msg = 'Add a profile photo — profiles with photos are trusted more by agents'
              if (!msg) return null
              return (
                <div style={{
                  maxWidth: 600,
                  marginBottom: 16,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'var(--orange-50, #fff7ed)',
                  border: '1px solid var(--orange-200, #fed7aa)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 14,
                  color: 'var(--orange-700, #c2410c)',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>{msg}</span>
                </div>
              )
            })()}

            {/* Profile editing sub-tabs */}
            <div className="settings-tabs">
              {['Profile', 'Skills', 'Languages', 'Social'].map(tab => (
                <button
                  key={tab}
                  className={`settings-tab${settingsTab === tab.toLowerCase() ? ' settings-tab-active' : ''}`}
                  onClick={() => setSettingsTab(tab.toLowerCase())}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="dashboard-v4-form settings-panel">

              {settingsTab === 'profile' && (
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  try {
                    const locationData = profileLocation || {}
                    const payload = {
                      name: formData.get('name'),
                      headline: formData.get('headline'),
                      city: locationData.city || user?.city,
                      latitude: locationData.latitude ?? user?.latitude,
                      longitude: locationData.longitude ?? user?.longitude,
                      country: locationData.country || user?.country,
                      country_code: locationData.country_code || user?.country_code,
                      hourly_rate: parseInt(formData.get('hourly_rate')) || 25,
                      bio: formData.get('bio'),
                      travel_radius: parseInt(formData.get('travel_radius')) || 25,
                      gender: profileGender || null
                    }
                    if (profileTimezone) payload.timezone = profileTimezone
                    const res = await fetch(`${API_URL}/humans/profile`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
                      body: JSON.stringify(payload)
                    })
                    if (res.ok) {
                      const data = await res.json()
                      if (data.user) {
                        const updatedUser = { ...data.user, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
                        localStorage.setItem('user', JSON.stringify(updatedUser))
                      }
                      const hasSkills = Array.isArray(data?.user?.skills || user?.skills) && (data?.user?.skills || user?.skills).length > 0
                      const hasLangs = Array.isArray(data?.user?.languages || user?.languages) && (data?.user?.languages || user?.languages).length > 0
                      if (!hasSkills) toast.success('Profile saved! Next: add your skills')
                      else if (!hasLangs) toast.success('Profile saved! Next: add your languages')
                      else toast.success('Profile updated')
                      setProfileLocation(null)
                      setTimeout(() => window.location.reload(), 1500)
                    } else {
                      const err = await res.json()
                      toast.error(err.error || 'Unknown error')
                    }
                  } catch (err) {
                    toast.error('Error saving profile')
                  }
                }}>
                  <div className="dashboard-form-grid-2col">
                    <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                      <label className="dashboard-v4-form-label">Full Name</label>
                      <input type="text" name="name" defaultValue={user?.name} className="dashboard-v4-form-input" />
                    </div>
                    <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                      <label className="dashboard-v4-form-label">City</label>
                      <CityAutocomplete
                        value={profileLocation?.city || user?.city || ''}
                        onChange={setProfileLocation}
                        placeholder="San Francisco"
                        className="dashboard-v4-city-input"
                      />
                    </div>
                  </div>

                  <div className="dashboard-v4-form-group">
                    <label className="dashboard-v4-form-label">Gender</label>
                    <div style={{
                      display: 'flex',
                      borderRadius: 8,
                      border: '1px solid var(--border-secondary, rgba(26, 26, 26, 0.1))',
                      overflow: 'hidden',
                    }}>
                      {['Man', 'Woman', 'Other'].map((option, idx) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setProfileGender(option.toLowerCase())}
                          style={{
                            flex: 1,
                            padding: '8px 16px',
                            border: 'none',
                            borderRight: idx < 2 ? '1px solid var(--border-secondary, rgba(26, 26, 26, 0.1))' : 'none',
                            background: profileGender === option.toLowerCase()
                              ? 'var(--orange-500, #f4845f)'
                              : 'var(--bg-primary, white)',
                            color: profileGender === option.toLowerCase()
                              ? 'white'
                              : 'var(--text-secondary)',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="dashboard-v4-form-group">
                    <label className="dashboard-v4-form-label">Headline</label>
                    <input type="text" name="headline" defaultValue={user?.headline || ''} maxLength={120} className="dashboard-v4-form-input" placeholder="e.g. Professional Photographer & Drone Pilot" />
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>A short tagline that appears on your profile card</p>
                  </div>

                  <div className="dashboard-form-grid-2col">
                    <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                      <label className="dashboard-v4-form-label">Hourly Rate ($)</label>
                      <input type="number" name="hourly_rate" defaultValue={user?.hourly_rate || 25} min={5} max={500} className="dashboard-v4-form-input" />
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Your asking rate. Actual pay is set per task by the agent.</p>
                    </div>
                    <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                      <label className="dashboard-v4-form-label">Travel Radius (miles)</label>
                      <input type="number" name="travel_radius" defaultValue={user?.travel_radius || 25} min={1} max={100} className="dashboard-v4-form-input" />
                    </div>
                  </div>

                  <div className="dashboard-v4-form-group">
                    <label className="dashboard-v4-form-label">Timezone</label>
                    <TimezoneDropdown
                      value={profileTimezone}
                      onChange={setProfileTimezone}
                      className="dashboard-v4-form-input"
                    />
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Auto-set when you select a city. You can override manually.</p>
                  </div>

                  <div className="dashboard-v4-form-group" style={{ marginBottom: 0 }}>
                    <label className="dashboard-v4-form-label">Bio</label>
                    <textarea name="bio" defaultValue={user?.bio || ''} className="dashboard-v4-form-input dashboard-v4-form-textarea" style={{ minHeight: 80 }} placeholder="Describe your experience, availability, and what makes you great at tasks." />
                  </div>

                  <button type="submit" className="dashboard-v4-form-submit dashboard-v4-form-submit--secondary">Save Changes</button>
                </form>
              )}

              {settingsTab === 'skills' && (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {skillsList.map((skill, idx) => (
                      <span key={idx} style={{
                        padding: '6px 12px',
                        background: '#F3F4F6',
                        borderRadius: 999,
                        fontSize: 13,
                        color: '#374151',
                        fontWeight: 500,
                        border: '1px solid rgba(26,26,26,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        {skill.replace(/_/g, ' ')}
                        <button
                          type="button"
                          onClick={() => setSkillsList(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6B7280', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#1A1A1A'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                        >
                          <span style={{ fontSize: 16, lineHeight: 1 }}>&times;</span>
                        </button>
                      </span>
                    ))}
                    {skillsList.length === 0 && (
                      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No skills added yet</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = newSkillInput.trim()
                          if (val && !skillsList.includes(val)) {
                            setSkillsList(prev => [...prev, val])
                            setNewSkillInput('')
                          }
                        }
                      }}
                      className="dashboard-v4-form-input"
                      placeholder="Type a skill and press Enter"
                      style={{ flex: 1, marginBottom: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newSkillInput.trim()
                        if (val && !skillsList.includes(val)) {
                          setSkillsList(prev => [...prev, val])
                          setNewSkillInput('')
                        }
                      }}
                      className="v4-btn v4-btn-primary"
                      style={{ padding: '10px 20px', flexShrink: 0 }}
                    >
                      Add
                    </button>
                  </div>
                  <button
                    type="button"
                    className="dashboard-v4-form-submit dashboard-v4-form-submit--secondary"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_URL}/humans/profile`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
                          body: JSON.stringify({ skills: skillsList })
                        })
                        if (res.ok) {
                          const data = await res.json()
                          if (data.user) {
                            const updatedUser = { ...data.user, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
                            localStorage.setItem('user', JSON.stringify(updatedUser))
                          }
                          const hasLangs = Array.isArray(data?.user?.languages || user?.languages) && (data?.user?.languages || user?.languages).length > 0
                          const hasSocial = data?.user?.social_links && Object.keys(data.user.social_links).length > 0
                          if (!hasLangs) toast.success('Skills saved! Next: add your languages')
                          else if (!hasSocial) toast.success('Skills saved! Next: add your social links')
                          else toast.success('Skills updated')
                          setTimeout(() => window.location.reload(), 1500)
                        } else {
                          const err = await res.json()
                          toast.error(err.error || 'Unknown error')
                        }
                      } catch (err) {
                        toast.error('Error saving skills')
                      }
                    }}
                  >
                    Update Skills
                  </button>
                </>
              )}

              {settingsTab === 'languages' && (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {languagesList.map((lang, idx) => (
                      <span key={idx} style={{
                        padding: '6px 12px',
                        background: 'rgba(59,130,246,0.08)',
                        borderRadius: 999,
                        fontSize: 13,
                        color: '#3B82F6',
                        fontWeight: 500,
                        border: '1px solid rgba(59,130,246,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        {lang}
                        <button
                          type="button"
                          onClick={() => setLanguagesList(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#3B82F6', display: 'flex', alignItems: 'center' }}
                        >
                          <span style={{ fontSize: 16, lineHeight: 1 }}>&times;</span>
                        </button>
                      </span>
                    ))}
                    {languagesList.length === 0 && (
                      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No languages added yet</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input
                      type="text"
                      value={newLanguageInput}
                      onChange={(e) => setNewLanguageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = newLanguageInput.trim()
                          if (val && !languagesList.includes(val)) {
                            setLanguagesList(prev => [...prev, val])
                            setNewLanguageInput('')
                          }
                        }
                      }}
                      className="dashboard-v4-form-input"
                      placeholder="Type a language and press Enter"
                      style={{ flex: 1, marginBottom: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newLanguageInput.trim()
                        if (val && !languagesList.includes(val)) {
                          setLanguagesList(prev => [...prev, val])
                          setNewLanguageInput('')
                        }
                      }}
                      className="v4-btn v4-btn-primary"
                      style={{ padding: '10px 20px', flexShrink: 0 }}
                    >
                      Add
                    </button>
                  </div>
                  <button
                    type="button"
                    className="dashboard-v4-form-submit dashboard-v4-form-submit--secondary"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_URL}/humans/profile`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
                          body: JSON.stringify({ languages: languagesList })
                        })
                        if (res.ok) {
                          const data = await res.json()
                          if (data.user) {
                            const updatedUser = { ...data.user, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
                            localStorage.setItem('user', JSON.stringify(updatedUser))
                          }
                          const hasSocial = data?.user?.social_links && Object.keys(data.user.social_links).length > 0
                          if (!hasSocial) toast.success('Languages saved! Next: add your social links')
                          else toast.success('Languages updated')
                          setTimeout(() => window.location.reload(), 1500)
                        } else {
                          const err = await res.json()
                          toast.error(err.error || 'Unknown error')
                        }
                      } catch (err) {
                        toast.error('Error saving languages')
                      }
                    }}
                  >
                    Update Languages
                  </button>
                </>
              )}

              {settingsTab === 'social' && (
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const formData = new FormData(e.target)
                  const social_links = {}
                  PLATFORM_ORDER.forEach(p => {
                    const val = formData.get(p)?.trim()
                    if (val) social_links[p] = extractHandle(p, val)
                  })
                  try {
                    const res = await fetch(`${API_URL}/humans/profile`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: user.token || '' },
                      body: JSON.stringify({ social_links })
                    })
                    if (res.ok) {
                      const data = await res.json()
                      if (data.user) {
                        const updatedUser = { ...data.user, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
                        localStorage.setItem('user', JSON.stringify(updatedUser))
                      }
                      toast.success('Social links updated')
                      setTimeout(() => window.location.reload(), 1500)
                    } else {
                      const err = await res.json()
                      toast.error(err.error || 'Unknown error')
                    }
                  } catch (err) {
                    toast.error('Error saving social links')
                  }
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {PLATFORM_ORDER.map(platform => {
                      const config = PLATFORMS[platform]
                      return (
                        <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', flexShrink: 0, width: 20 }}>
                            {config.icon(18)}
                          </div>
                          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', width: 80, flexShrink: 0 }}>{config.label}</label>
                          <input
                            type="text"
                            name={platform}
                            defaultValue={user?.social_links?.[platform] || ''}
                            placeholder={config.placeholder}
                            maxLength={200}
                            className="dashboard-v4-form-input"
                            style={{ marginBottom: 0 }}
                            onBlur={(e) => {
                              const cleaned = extractHandle(platform, e.target.value)
                              if (cleaned !== e.target.value) e.target.value = cleaned
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12 }}>Enter your username or paste a profile URL — it will be auto-formatted</p>
                  <button type="submit" className="dashboard-v4-form-submit dashboard-v4-form-submit--secondary">Update Social Links</button>
                </form>
              )}

            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h1 className="dashboard-v4-page-title">Settings</h1>

            {/* Settings Page Tabs */}
            <div className="settings-page-tabs">
              {['General', 'Notifications', 'Account'].map(tab => (
                <button
                  key={tab}
                  className={`settings-page-tab${settingsPageTab === tab.toLowerCase() ? ' settings-page-tab-active' : ''}`}
                  onClick={() => setSettingsPageTab(tab.toLowerCase())}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* ===== GENERAL TAB ===== */}
            {settingsPageTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Compact Plan Row */}
                <div className="settings-plan-row" style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ padding: '3px 10px', background: 'rgba(244,132,95,0.1)', borderRadius: 999, fontSize: 12, fontWeight: 600, color: 'var(--orange-600)', flexShrink: 0 }}>
                      {(user?.subscription_tier || 'free').charAt(0).toUpperCase() + (user?.subscription_tier || 'free').slice(1)} Plan
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)', minWidth: 0 }}>
                      {user?.subscription_tier === 'business' ? '5% fee'
                        : user?.subscription_tier === 'pro' ? '10% fee'
                        : '15% fee'}
                      {' · '}
                      <span style={{ color: 'var(--orange-600)' }}>Save on fees with verification</span>
                    </span>
                  </div>
                  <a href="/premium" style={{ fontSize: 13, fontWeight: 500, color: 'var(--orange-500)', textDecoration: 'none', whiteSpace: 'nowrap' }}>View Plans →</a>
                </div>

                {/* Available for Hire */}
                <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: user?.availability === 'available' ? 'var(--success)' : '#9CA3AF',
                        marginTop: 5,
                        flexShrink: 0
                      }} />
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 2 }}>Available for Hire</p>
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {user?.availability === 'available'
                            ? 'Visible to agents for task invites'
                            : 'Hidden from search results'}
                        </p>
                      </div>
                    </div>
                    <button
                      className="settings-availability-toggle"
                      onClick={async () => {
                        const newStatus = user?.availability === 'available' ? 'unavailable' : 'available'
                        console.log('[Availability] Toggling:', user?.availability, '→', newStatus)
                        try {
                          let token = user.token || ''
                          if (supabase) {
                            const { data: { session } } = await supabase.auth.getSession()
                            if (session?.access_token) token = session.access_token
                          }
                          if (!token) {
                            console.error('[Availability] No auth token available')
                            toast.error('Please sign in again to update availability')
                            return
                          }
                          const res = await fetch(`${API_URL}/humans/profile`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: token },
                            body: JSON.stringify({ availability: newStatus })
                          })
                          if (res.ok) {
                            const data = await res.json()
                            console.log('[Availability] API response:', data.user?.availability)
                            if (data.user) {
                              const updatedUser = { ...data.user, token, skills: safeArr(data.user.skills), languages: safeArr(data.user.languages), supabase_user: true }
                              onUserUpdate(updatedUser)
                              localStorage.setItem('user', JSON.stringify({ ...updatedUser, token: undefined }))
                            }
                            toast.success(newStatus === 'available' ? 'You\'re now available for work' : 'You\'re now unavailable')
                          } else {
                            const err = await res.json().catch(() => ({}))
                            console.error('[Availability] API error:', res.status, err)
                            toast.error(err.error || 'Failed to update availability')
                          }
                        } catch (e) { console.error('[Availability] Error:', e); toast.error('Failed to update availability') }
                      }}
                      style={{
                        width: 48,
                        height: 28,
                        borderRadius: 14,
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background 0.2s',
                        background: user?.availability === 'available' ? 'var(--success)' : '#D1D5DB',
                        flexShrink: 0
                      }}
                    >
                      <div className="settings-availability-toggle-knob" style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: 3,
                        left: user?.availability === 'available' ? 23 : 3,
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                      }} />
                    </button>
                  </div>
                </div>

                {/* Dashboard Mode — Segmented Control */}
                <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 2 }}>Dashboard Mode</p>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Switch between working and hiring</p>
                    </div>
                    <div style={{
                      display: 'flex',
                      background: 'rgba(26,26,26,0.06)',
                      borderRadius: 999,
                      padding: 3,
                      gap: 2
                    }}>
                      <button
                        onClick={() => {
                          if (hiringMode) {
                            setHiringMode(false)
                            setUserProperties({ user_mode: 'working' })
                            trackEvent('mode_switch', { mode: 'working' })
                            updateTabUrl('settings', false)
                          }
                        }}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 999,
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: !hiringMode ? 'white' : 'transparent',
                          color: !hiringMode ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          boxShadow: !hiringMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
                        Working
                      </button>
                      <button
                        onClick={() => {
                          if (!hiringMode) {
                            setHiringMode(true)
                            setUserProperties({ user_mode: 'hiring' })
                            trackEvent('mode_switch', { mode: 'hiring' })
                            updateTabUrl('settings', true)
                          }
                        }}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 999,
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: hiringMode ? 'white' : 'transparent',
                          color: hiringMode ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          boxShadow: hiringMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                        Hiring
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== NOTIFICATIONS TAB ===== */}
            {settingsPageTab === 'notifications' && (
              <div>
                <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                  {/* Email notifications master toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>Email notifications</p>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Receive notifications via email when you're offline</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={localStorage.getItem('irlwork_email_notifs') !== 'false'}
                      onChange={(e) => {
                        localStorage.setItem('irlwork_email_notifs', e.target.checked)
                        toast.success(e.target.checked ? 'Email notifications enabled' : 'Email notifications disabled')
                      }}
                      style={{ width: 20, height: 20, accentColor: 'var(--orange-500)', cursor: 'pointer', flexShrink: 0 }}
                    />
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-secondary)', margin: '14px 0', opacity: 0.5 }} />

                  {/* Category toggles */}
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 10 }}>Notify me about</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(hiringMode ? [
                      { key: 'new_applications', label: 'New applications', desc: 'When someone applies to your posted task' },
                      { key: 'task_completed', label: 'Task completions', desc: 'When a worker marks a task as done' },
                      { key: 'messages', label: 'Messages', desc: 'New messages from workers' },
                      { key: 'reviews', label: 'Reviews received', desc: 'When a worker leaves you a review' },
                    ] : [
                      { key: 'task_assignments', label: 'Task assignments', desc: 'When you\'re assigned or invited to a task' },
                      { key: 'task_updates', label: 'Task updates', desc: 'Status changes on tasks you\'re working on' },
                      { key: 'payments', label: 'Payments', desc: 'Payment received, pending, or failed' },
                      { key: 'messages', label: 'Messages', desc: 'New messages from agents' },
                      { key: 'reviews', label: 'Reviews received', desc: 'When an agent leaves you a review' },
                    ]).map(({ key, label, desc }) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '6px 0' }}>
                        <input
                          type="checkbox"
                          defaultChecked={localStorage.getItem(`irlwork_notif_${key}`) !== 'false'}
                          onChange={(e) => localStorage.setItem(`irlwork_notif_${key}`, e.target.checked)}
                          style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--orange-500)', flexShrink: 0 }}
                        />
                        <div>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 14 }}>{label}</span>
                          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{desc}</p>
                        </div>
                      </label>
                    ))}

                    <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: 8, marginTop: 2 }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '6px 0' }}>
                        <input
                          type="checkbox"
                          defaultChecked={localStorage.getItem('irlwork_notif_marketing') === 'true'}
                          onChange={(e) => localStorage.setItem('irlwork_notif_marketing', e.target.checked)}
                          style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--orange-500)', flexShrink: 0 }}
                        />
                        <div>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 14 }}>Marketing & updates</span>
                          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Product news, tips, and feature announcements</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== ACCOUNT TAB ===== */}
            {settingsPageTab === 'account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Account info card */}
                <div style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 14 }}>Email</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{user?.email}</p>
                      {(emailVerifSuccess || user?.email_verified) ? (
                        <span style={{ padding: '2px 8px', background: 'rgba(22, 163, 74, 0.1)', color: '#16A34A', fontSize: 11, fontWeight: 600, borderRadius: 999 }}>Verified</span>
                      ) : (
                        <span style={{ padding: '2px 8px', background: 'rgba(251, 191, 36, 0.1)', color: '#D97706', fontSize: 11, fontWeight: 600, borderRadius: 999 }}>Unverified</span>
                      )}
                    </div>
                  </div>

                  {/* Email verification section */}
                  {!(emailVerifSuccess || user?.email_verified) && (
                    <div style={{ padding: '12px 14px', background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.15)', borderRadius: 'var(--radius-md)', marginBottom: 14 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>Verify your email</p>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>Verified accounts get more task offers and build trust with agents</p>

                      {emailVerifError && (
                        <div style={{ padding: '8px 10px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', marginBottom: 8, fontSize: 12, color: '#EF4444' }}>{emailVerifError}</div>
                      )}

                      {!emailVerifSent ? (
                        <button
                          className="v4-btn v4-btn-primary"
                          style={{ width: '100%', fontSize: 13, padding: '8px 16px' }}
                          disabled={emailVerifSending}
                          onClick={async () => {
                            setEmailVerifSending(true)
                            setEmailVerifError('')
                            try {
                              let token = user.token || ''
                              if (supabase) {
                                const { data: { session } } = await supabase.auth.getSession()
                                if (session?.access_token) token = session.access_token
                              }
                              const res = await fetch(`${API_URL}/auth/send-verification`, {
                                method: 'POST',
                                headers: { Authorization: token }
                              })
                              const data = await res.json().catch(() => ({}))
                              if (res.ok) {
                                if (data.message === 'Email already verified') {
                                  setEmailVerifSuccess(true)
                                  toast.success('Email already verified!')
                                } else {
                                  setEmailVerifSent(true)
                                  toast.success('Verification code sent!')
                                }
                              } else {
                                setEmailVerifError(data.error || 'Failed to send verification code')
                              }
                            } catch (e) {
                              setEmailVerifError('Network error. Please try again.')
                            } finally {
                              setEmailVerifSending(false)
                            }
                          }}
                        >
                          {emailVerifSending ? 'Sending...' : 'Send Verification Code'}
                        </button>
                      ) : (
                        <div>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, textAlign: 'center' }}>
                            Enter the 6-digit code sent to <strong>{user?.email}</strong>
                          </p>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={emailVerifCode}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                              setEmailVerifCode(val)
                            }}
                            style={{
                              width: '100%', textAlign: 'center', fontSize: 20, fontWeight: 600,
                              letterSpacing: 8, fontFamily: 'monospace', padding: '10px 12px',
                              background: 'var(--bg-secondary)', border: '1px solid rgba(0,0,0,0.1)',
                              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                              outline: 'none', boxSizing: 'border-box'
                            }}
                          />
                          <button
                            className="v4-btn v4-btn-primary"
                            style={{ width: '100%', fontSize: 13, padding: '8px 16px', marginTop: 8 }}
                            disabled={emailVerifying || emailVerifCode.length < 6}
                            onClick={async () => {
                              if (!emailVerifCode.trim()) return
                              setEmailVerifying(true)
                              setEmailVerifError('')
                              try {
                                let token = user.token || ''
                                if (supabase) {
                                  const { data: { session } } = await supabase.auth.getSession()
                                  if (session?.access_token) token = session.access_token
                                }
                                const res = await fetch(`${API_URL}/auth/verify-email`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: token },
                                  body: JSON.stringify({ code: emailVerifCode.trim() })
                                })
                                const data = await res.json().catch(() => ({}))
                                if (res.ok) {
                                  setEmailVerifSuccess(true)
                                  toast.success('Email verified successfully!')
                                } else {
                                  setEmailVerifError(data.error || 'Invalid code')
                                }
                              } catch (e) {
                                setEmailVerifError('Network error. Please try again.')
                              } finally {
                                setEmailVerifying(false)
                              }
                            }}
                          >
                            {emailVerifying ? 'Verifying...' : 'Verify'}
                          </button>
                          <button
                            onClick={async () => {
                              setEmailVerifSending(true)
                              setEmailVerifError('')
                              try {
                                let token = user.token || ''
                                if (supabase) {
                                  const { data: { session } } = await supabase.auth.getSession()
                                  if (session?.access_token) token = session.access_token
                                }
                                const res = await fetch(`${API_URL}/auth/send-verification`, {
                                  method: 'POST',
                                  headers: { Authorization: token }
                                })
                                if (res.ok) toast.success('Code resent!')
                                else {
                                  const data = await res.json().catch(() => ({}))
                                  setEmailVerifError(data.error || 'Failed to resend')
                                }
                              } catch (e) {
                                setEmailVerifError('Network error.')
                              } finally {
                                setEmailVerifSending(false)
                              }
                            }}
                            disabled={emailVerifSending}
                            style={{
                              background: 'none', border: 'none', color: 'var(--text-tertiary)',
                              fontSize: 12, cursor: 'pointer', marginTop: 6, width: '100%',
                              textAlign: 'center'
                            }}
                          >
                            {emailVerifSending ? 'Sending...' : 'Resend code'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: 14, marginBottom: 14, opacity: 0.5 }} />

                  <div>
                    <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 14 }}>Member since</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}</p>
                  </div>

                  <button
                    className="v4-btn v4-btn-secondary"
                    style={{ width: '100%', marginTop: 16 }}
                    onClick={onLogout}
                  >
                    Sign Out
                  </button>
                </div>

                {/* Danger Zone */}
                <div style={{ padding: '14px 16px', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', background: 'rgba(239,68,68,0.04)' }}>
                  <p style={{ fontWeight: 500, color: '#FF5F57', marginBottom: 4, fontSize: 14 }}>Danger Zone</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>Deactivating your account hides your profile and pauses all activity. You can reactivate anytime by signing back in.</p>
                  <button
                    className="v4-btn v4-btn-secondary"
                    style={{ fontSize: 13, color: '#FF5F57', borderColor: 'rgba(239,68,68,0.3)' }}
                    onClick={() => {
                      if (window.confirm('Are you sure you want to deactivate your account? Your profile will be hidden and all active tasks will be paused. You can reactivate by signing back in.')) {
                        toast.success('Account deactivated')
                        onLogout()
                      }
                    }}
                  >
                    Deactivate Account
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* API Keys Tab - Hiring mode only */}
        {activeTab === 'api-keys' && (
          <div>
            <h1 className="dashboard-v4-page-title">API Keys</h1>
            <div className="dashboard-v4-form" style={{ maxWidth: 720 }}>
              <ApiKeysTab user={user} />
            </div>
          </div>
        )}

        {/* Admin Tab - Only visible to admins */}
        {activeTab === 'admin' && isAdmin && (
          <div>
            <Suspense fallback={<Loading />}>
              <AdminDashboard user={user} />
            </Suspense>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (() => {
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
        })()}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 className="dashboard-v4-page-title">Notifications</h1>
              {notifications.length > 0 && (
                <button onClick={markAllNotificationsRead} className="dashboard-v4-notification-mark-read" style={{ fontSize: 14 }}>
                  Clear all
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="dashboard-v4-empty">
                <div className="dashboard-v4-empty-icon"><Bell size={24} /></div>
                <p className="dashboard-v4-empty-title">No notifications yet</p>
                <p className="dashboard-v4-empty-text">You'll see updates about your tasks here</p>
              </div>
            ) : (
              <div>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`dashboard-v4-notification ${!n.is_read ? 'unread' : ''}`}
                    onClick={() => navigateToNotification(n)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="dashboard-v4-notification-icon">{NOTIFICATION_ICONS[n.type] || <Bell size={18} />}</div>
                    <div className="dashboard-v4-notification-content">
                      <p className="dashboard-v4-notification-title">{n.title}</p>
                      <p className="dashboard-v4-notification-text">{n.message}</p>
                      <p className="dashboard-v4-notification-time">
                        {new Date(n.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      {/* Mobile Bottom Tab Bar */}
      <nav className="dashboard-v4-bottom-tabs">
        {(() => {
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
          return bottomTabs.map(tab => (
            <button
              key={tab.id}
              className={`dashboard-v4-bottom-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
            >
              <span className="dashboard-v4-bottom-tab-icon">{tab.icon}</span>
              <span className="dashboard-v4-bottom-tab-label">{tab.label}</span>
              {tab.badge > 0 && <span className="dashboard-v4-bottom-tab-badge">{tab.badge > 9 ? '9+' : tab.badge}</span>}
            </button>
          ))
        })()}
      </nav>
    </div>
  )
}
export default Dashboard
