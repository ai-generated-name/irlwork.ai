// irlwork.ai - Modern Clean UI
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import { supabase } from './lib/supabase'
import API_URL from './config/api'
import { debug } from './utils/appConstants'
import { fixAvatarUrl } from './utils/avatarUrl'
import { trackPageView, trackEvent, setUserProperties } from './utils/analytics'
import Loading from './components/Loading'
import MarketingFooter from './components/Footer'
import MarketingNavbar from './components/MarketingNavbar'
import FeedbackButton from './components/FeedbackButton'

// Lazy-loaded pages — only fetched when their route is visited
const Onboarding = lazy(() => import('./components/Onboarding'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const LandingPageV4 = lazy(() => import('./pages/LandingPageV4'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const ThesisPage = lazy(() => import('./pages/ThesisPage'))
const BrowsePage = lazy(() => import('./pages/BrowsePage'))
const HumanProfilePage = lazy(() => import('./pages/HumanProfilePage'))
const TaskDetailPage = lazy(() => import('./pages/TaskDetailPage'))
const ConnectAgentPage = lazy(() => import('./pages/ConnectAgentPage'))
const MCPPage = lazy(() => import('./pages/MCPPage'))
const PremiumPage = lazy(() => import('./pages/PremiumPage'))

function App() {
  // Initialize from localStorage cache for instant rendering (no loading spinner for returning users)
  const [user, setUser] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('user') || 'null')
      return cached?.supabase_user ? cached : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('user') || 'null')
      return !cached?.supabase_user
    } catch { return true }
  })
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const initDoneRef = useRef(false)

  // Navigate without full page reload — updates URL + React state only
  const navigate = useCallback((url) => {
    debug('[Nav] Navigating to:', url)
    window.history.pushState({}, '', url)
    // Only track pathname portion — query params are read from window.location.search
    const pathname = url.split('?')[0].split('#')[0]
    setCurrentPath(pathname)
    trackPageView(pathname)
  }, [])

  // Send initial pageview (index.html disables automatic send_page_view for SPA)
  useEffect(() => {
    trackPageView(window.location.pathname)
  }, [])

  // Listen for browser back/forward
  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname)
      trackPageView(window.location.pathname)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!supabase) {
      console.error('[Auth] Supabase not configured - missing VITE_SUPABASE_ANON_KEY')
      setLoading(false)
      return
    }

    async function init() {
      debug('[Auth] Initializing...')

      // Check for OAuth callback first
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        debug('[Auth] Processing OAuth callback...')
        try {
          const params = new URLSearchParams(hash.slice(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')

          if (accessToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || undefined
            })
            if (error) {
              console.error('[Auth] Session set error:', error)
            } else {
              debug('[Auth] Session set successfully')
            }
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } catch (e) {
          console.error('[Auth] OAuth callback processing error:', e)
        }
      }

      // Get session and user
      try {
        const { data: { session } } = await supabase.auth.getSession()
        debug('[Auth] Session:', session ? 'found' : 'none')

        if (session?.user) {
          await fetchUserProfile(session.user, session.access_token)
        } else {
          setUser(null)
          setLoading(false)
        }
      } catch (e) {
        console.error('[Auth] getSession error:', e)
        setLoading(false)
      }
      initDoneRef.current = true
    }

    init()

    // Listen for auth changes — skip TOKEN_REFRESHED to avoid disrupting user mid-interaction
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      debug('[Auth] State change:', event, session ? 'with session' : 'no session')
      if (event === 'TOKEN_REFRESHED') {
        debug('[Auth] Token refreshed, updating token on user')
        // Update the stored token without re-fetching full profile
        if (session?.access_token) {
          setUser(prev => prev ? { ...prev, token: session.access_token } : prev)
        }
        return
      }
      if (session?.user) {
        await fetchUserProfile(session.user, session.access_token)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(supabaseUser, accessToken) {
    try {
      debug('[Auth] Fetching user profile...')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      // Prefer JWT access_token for auth, fall back to UUID
      const authToken = accessToken || supabaseUser.id
      const res = await fetch(`${API_URL}/auth/verify`, {
        headers: { Authorization: authToken },
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        debug('[Auth] User found in DB:', data.user?.email, 'needs_onboarding:', data.user?.needs_onboarding)

        // Trust backend completely - no localStorage merge
        // Always use Supabase auth email (source of truth for sign-in email)
        // Store JWT token on user object for subsequent API calls
        const finalUser = fixAvatarUrl({ ...data.user, email: supabaseUser.email || data.user.email, token: accessToken || null, supabase_user: true })
        // Don't cache JWT in localStorage (it expires) — only cache profile data
        const cacheUser = { ...finalUser, token: undefined }
        localStorage.setItem('user', JSON.stringify(cacheUser))
        setUser(finalUser)
      } else if (res.status === 404) {
        // New user - needs onboarding
        debug('[Auth] New user, needs onboarding')
        const newUser = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
          avatar_url: supabaseUser.user_metadata?.avatar_url || '',
          token: accessToken || null,
          supabase_user: true,
          needs_onboarding: true
        }
        const cacheUser = { ...newUser, token: undefined }
        localStorage.setItem('user', JSON.stringify(cacheUser))
        setUser(newUser)
      } else {
        debug('[Auth] Backend error:', res.status)
        // On error, use cached profile if available (don't force re-onboarding on transient errors)
        const cached = JSON.parse(localStorage.getItem('user') || 'null')
        if (cached && !cached.needs_onboarding) {
          debug('[Auth] Using cached profile (API error fallback)')
          setUser({ ...cached, token: accessToken || null, supabase_user: true })
        } else {
          const newUser = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name || 'User',
            token: accessToken || null,
            supabase_user: true,
            needs_onboarding: true
          }
          setUser(newUser)
        }
      }
    } catch (e) {
      console.error('[Auth] Fetch error:', e)
      // On network error, use cached profile if available (don't force re-onboarding on transient errors)
      const cached = JSON.parse(localStorage.getItem('user') || 'null')
      if (cached && !cached.needs_onboarding) {
        debug('[Auth] Using cached profile (network error fallback)')
        setUser({ ...cached, token: accessToken || null, supabase_user: true })
      } else {
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
          avatar_url: supabaseUser.user_metadata?.avatar_url || '',
          token: accessToken || null,
          supabase_user: true,
          needs_onboarding: true
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (supabase) await supabase.auth.signOut()
    localStorage.removeItem('user')
    setUser(null)
    navigate('/')
  }

  const handleOnboardingComplete = async (profile) => {
    debug('[Onboarding] Completing with profile:', profile)

    try {
      // Use the new idempotent onboard endpoint
      const res = await fetch(`${API_URL}/auth/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.token || ''
        },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          city: profile.city,
          latitude: profile.latitude,
          longitude: profile.longitude,
          country: profile.country,
          country_code: profile.country_code,
          hourly_rate: profile.hourly_rate,
          skills: profile.skills,
          travel_radius: profile.travel_radius,
          bio: profile.bio,
          avatar_url: user.avatar_url || null,
          role: 'human'
        })
      })

      if (res.ok) {
        const data = await res.json()
        const finalUser = fixAvatarUrl({ ...data.user, supabase_user: true })
        debug('[Onboarding] Success, user:', finalUser)
        trackEvent('onboarding_complete')
        setUserProperties({ user_mode: 'working' })
        localStorage.setItem('user', JSON.stringify(finalUser))
        setUser(finalUser)
        navigate('/dashboard/working/browse')
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('[Onboarding] Failed:', errorData)
        throw new Error(errorData.error || 'Failed to complete onboarding')
      }
    } catch (e) {
      console.error('[Onboarding] Error:', e)
      // Re-throw so the Onboarding component can show the error in-UI
      throw e
    }
  }

  // Auth redirects via useEffect — never redirect during render to avoid loops.
  // Must be before any early returns to satisfy React's rules of hooks.
  const path = currentPath
  useEffect(() => {
    if (loading) return
    if (path === '/auth' && user) {
      debug('[Auth] Already logged in, redirecting to dashboard')
      const params = new URLSearchParams(window.location.search)
      const returnTo = params.get('returnTo')
      const decoded = returnTo ? decodeURIComponent(returnTo) : null
      if (decoded && decoded.startsWith('/') && !decoded.startsWith('//')) {
        navigate(decoded)
      } else {
        const savedHiring = localStorage.getItem('irlwork_hiringMode') === 'true'
        navigate(savedHiring ? '/dashboard/hiring' : '/dashboard/working')
      }
    } else if (path === '/onboard' && !user) {
      debug('[Auth] No user for onboard, redirecting to auth')
      navigate('/auth')
    } else if (path === '/onboard' && user && !user.needs_onboarding) {
      debug('[Auth] User already onboarded, redirecting to dashboard')
      const savedHiring = localStorage.getItem('irlwork_hiringMode') === 'true'
      navigate(savedHiring ? '/dashboard/hiring' : '/dashboard/working')
    } else if (path === '/dashboard' && user) {
      debug('[Auth] Bare /dashboard, redirecting to mode-specific URL')
      const savedHiring = localStorage.getItem('irlwork_hiringMode') === 'true'
      navigate(savedHiring ? '/dashboard/hiring' : '/dashboard/working')
    } else if (path === '/messages' && user) {
      // Redirect /messages to dashboard messages tab
      const savedHiring = localStorage.getItem('irlwork_hiringMode') === 'true'
      navigate(savedHiring ? '/dashboard/hiring/messages' : '/dashboard/working/messages')
    } else if (path === '/messages' && !user) {
      const returnTo = encodeURIComponent('/messages')
      navigate(`/auth?returnTo=${returnTo}`)
    } else if (path === '/browse') {
      // Redirect bare /browse to /browse/tasks (or /browse/humans if legacy ?mode=humans)
      const browseParams = new URLSearchParams(window.location.search)
      const mode = browseParams.get('mode')
      navigate(mode === 'humans' ? '/browse/humans' : '/browse/tasks')
    } else if (path.startsWith('/dashboard') && !user) {
      debug('[Auth] No user, redirecting to auth')
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
      navigate(`/auth?returnTo=${returnTo}`)
    } else if (path.startsWith('/dashboard') && user && user.needs_onboarding) {
      debug('[Auth] User needs onboarding, redirecting to /onboard')
      navigate('/onboard')
    }
  }, [path, user, loading, navigate])

  // Routes — use currentPath (React state) instead of window.location.pathname
  // to avoid full-page reloads that restart auth init and cause mobile refresh loops
  debug('[Auth] Rendering route:', path, 'user:', user ? user.email : 'none')

  // Only block on auth loading for routes that require authentication
  // Skip the gate if we have a cached user (renders instantly from localStorage)
  if (loading && !user && ['/dashboard/', '/dashboard', '/onboard'].some(r => path.startsWith(r))) {
    debug('[Auth] Loading...')
    return <Loading />
  }

  // Determine active page for navbar highlight
  const activePage = path.startsWith('/browse') ? 'browse'
    : path === '/connect-agent' ? 'connect-agent'
    : null

  // Routes that should NOT get the shared marketing navbar+footer
  const isAuthRoute = path === '/auth' || path === '/forgot-password' || path === '/reset-password'
  const isOnboardRoute = path === '/onboard'
  const isDashboardRoute = path.startsWith('/dashboard')
  const isSelfContainedPage = path === '/connect-agent' || path === '/mcp' // has its own header + footer
  const isMarketingPage = !isAuthRoute && !isOnboardRoute && !isDashboardRoute && !isSelfContainedPage

  // Route content (wrapped in IIFE so FeedbackButton renders on all pages)
  const routeContent = (() => {
    // Task detail route - /tasks/:id
    if (path.startsWith('/tasks/')) {
      const taskId = path.split('/tasks/')[1]
      if (taskId) {
        return <Suspense fallback={<Loading />}><TaskDetailPage taskId={taskId} user={user} onLogout={logout} onNavigate={navigate} /></Suspense>
      }
    }

    // Human profile route - /humans/:id
    if (path.startsWith('/humans/')) {
      const humanId = path.split('/humans/')[1]
      if (humanId) {
        return <Suspense fallback={<Loading />}><HumanProfilePage humanId={humanId} user={user} onLogout={logout} onNavigate={navigate} /></Suspense>
      }
    }

    // Onboarding route - dedicated route for onboarding wizard
    if (path === '/onboard') {
      if (!user || !user.needs_onboarding) return <Loading />
      return <Suspense fallback={<Loading />}><Onboarding onComplete={handleOnboardingComplete} user={user} /></Suspense>
    }

    // Dashboard route - requires auth (matches /dashboard/working/... and /dashboard/hiring/...)
    if (path.startsWith('/dashboard/working') || path.startsWith('/dashboard/hiring')) {
      if (!user || user.needs_onboarding) return <Loading />
      return <Suspense fallback={<Loading />}><Dashboard user={user} onLogout={logout} initialMode={path.startsWith('/dashboard/hiring') ? 'hiring' : 'working'} onUserUpdate={setUser} /></Suspense>
    }

    // Bare /dashboard redirect (handled by useEffect above, but guard here too)
    if (path === '/dashboard') {
      if (!user || user.needs_onboarding) return <Loading />
      return <Loading />
    }

    if (path === '/auth') {
      if (user) return <Loading />
      return <Suspense fallback={<Loading />}><AuthPage onNavigate={navigate} /></Suspense>
    }
    if (path === '/forgot-password') {
      if (user) return <Loading />
      return <Suspense fallback={<Loading />}><ForgotPasswordPage onNavigate={navigate} /></Suspense>
    }
    if (path === '/reset-password') {
      return <Suspense fallback={<Loading />}><ResetPasswordPage onNavigate={navigate} /></Suspense>
    }
    if (path === '/mcp') return <Suspense fallback={<Loading />}><MCPPage /></Suspense>
    if (path === '/premium') {
      if (loading && !user) return <Loading />
      if (!user) {
        navigate('/auth')
        return <Loading />
      }
      return <Suspense fallback={<Loading />}><PremiumPage user={user} /></Suspense>
    }
    if (path === '/connect-agent') return <Suspense fallback={<Loading />}><ConnectAgentPage /></Suspense>
    if (path === '/contact') return <Suspense fallback={<Loading />}><ContactPage /></Suspense>
    if (path === '/about') return <Suspense fallback={<Loading />}><AboutPage /></Suspense>
    if (path === '/privacy') return <Suspense fallback={<Loading />}><PrivacyPage /></Suspense>
    if (path === '/terms') return <Suspense fallback={<Loading />}><TermsPage /></Suspense>
    if (path === '/thesis') return <Suspense fallback={<Loading />}><ThesisPage /></Suspense>
    if (path === '/browse' || path === '/browse/tasks' || path === '/browse/humans') return <Suspense fallback={<Loading />}><BrowsePage user={user} navigate={navigate} /></Suspense>

    // Homepage
    if (path === '/') return <Suspense fallback={<Loading />}><LandingPageV4 /></Suspense>

    // 404 for any unmatched route
    return <Suspense fallback={<Loading />}><NotFoundPage /></Suspense>
  })()

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-[14px] focus:shadow-lg focus:text-[#1A1A1A] focus:border focus:border-[#ECECEC]"
      >
        Skip to main content
      </a>
      {isMarketingPage ? (
        <>
          <MarketingNavbar user={user} activePage={activePage} />
          <div id="main-content" className="marketing-content-wrapper">
            {routeContent}
          </div>
          <MarketingFooter />
        </>
      ) : (
        <div id="main-content">
          {routeContent}
        </div>
      )}
      {!isDashboardRoute && <FeedbackButton user={user} />}
    </>
  )
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  )
}
