import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqoxllqofxbcwxskguuj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxb3hsbHFvZnhiY3d4c2tndXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODE5MjUsImV4cCI6MjA4NTc1NzkyNX0.kUi4_yHpg3H3rBUhi2L9a0KdcUQoYbiCC6hyPj-A0Yg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'http://localhost:3002/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[Auth] Initializing auth, API_URL:', API_URL)
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setLoading(false)
        }
      } catch (error) {
        console.error('[Auth] Error in auth state change handler:', error)
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    console.log('[Auth] Fetching profile for user:', userId)

    try {
      console.log('[Auth] Calling API:', API_URL + '/auth/verify')

      const res = await fetch(API_URL + '/auth/verify', {
        headers: { Authorization: userId }
      })

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
    } finally {
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
      email: form.email,
      password: form.password,
      options: { data: { name: form.name, city: form.city, hourly_rate: form.hourly_rate || 25, account_type: 'human' } }
    })
    if (error) throw new Error(error.message)
    try {
      const res = await fetch(API_URL + '/auth/register/human', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Failed to complete registration')
    } catch (e) {
      console.warn('Backend registration failed, continuing:', e.message)
    }
    return data.user
  }

  const registerAgent = async (form) => {
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password || 'agent-placeholder',
      options: { data: { name: form.name || form.organization, account_type: 'agent' } }
    })
    if (error) throw new Error(error.message)
    try {
      const res = await fetch(API_URL + '/auth/register/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Failed to complete registration')
    } catch (e) {
      console.warn('Backend registration failed, continuing:', e.message)
    }
    return data.user
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const value = {
    user,
    setUser,
    loading,
    login,
    registerHuman,
    registerAgent,
    logout,
    supabase,
    API_URL
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
