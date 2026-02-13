const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

/**
 * Fix avatar URLs — replaces broken R2 public URLs with working API proxy URLs.
 * Handles both individual user objects and arrays of users.
 */
export function fixAvatarUrl(userOrUsers) {
  const fix = (u) => {
    if (!u || !u.avatar_url) return u;
    // If avatar_url is a direct R2 public URL, replace with proxy URL
    // R2 public URLs look like: pub-{accountId}.r2.dev/avatars/...
    if (u.avatar_url.includes('.public/') || u.avatar_url.includes('.r2.dev/')) {
      // Include cache-buster from updated_at to avoid stale browser cache
      const cacheBuster = u.updated_at ? new Date(u.updated_at).getTime() : Date.now();
      return { ...u, avatar_url: `${API_URL}/avatar/${u.id}?v=${cacheBuster}` };
    }
    return u;
  };
  if (Array.isArray(userOrUsers)) return userOrUsers.map(fix);
  return fix(userOrUsers);
}
