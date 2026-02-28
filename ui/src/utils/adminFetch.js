import { supabase } from '../App'

/**
 * Authenticated fetch for admin API calls.
 * Gets a fresh JWT from the Supabase session on every request.
 * Does NOT depend on React context (works outside AuthProvider).
 */
export async function adminFetch(url, options = {}) {
  let token = ''
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) token = session.access_token
  }
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: token,
    },
  })
}
