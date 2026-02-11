const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'https://api.irlwork.ai/api'

/**
 * Fix avatar URLs — replaces broken R2 public URLs with working API proxy URLs.
 * Handles both individual user objects and arrays of users.
 */
export function fixAvatarUrl(userOrUsers) {
  const fix = (u) => {
    if (!u || !u.avatar_url) return u;
    // If avatar_url contains a broken format, replace with proxy URL
    if (u.avatar_url.includes('.public/') || u.avatar_url.includes('pub-r2.dev/')) {
      return { ...u, avatar_url: `${API_URL}/avatar/${u.id}` };
    }
    return u;
  };
  if (Array.isArray(userOrUsers)) return userOrUsers.map(fix);
  return fix(userOrUsers);
}
