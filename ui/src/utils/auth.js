import { supabase } from '../App'

/**
 * Get the current auth token for API requests.
 * Prefers Supabase JWT (secure) over raw UUID (legacy).
 */
export async function getAuthToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) return session.access_token
  } catch (e) {
    // Supabase unavailable, fall back
  }
  return null
}

/**
 * Get auth header value synchronously from user object.
 * Uses stored token (JWT) if available, falls back to user.id (UUID legacy).
 */
export function authHeader(user) {
  return user?.token || user?.id || ''
}
