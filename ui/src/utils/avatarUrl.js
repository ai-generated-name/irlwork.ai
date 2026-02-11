/**
 * Fix avatar URLs — clears broken R2 public URLs that are not accessible.
 * Handles both individual user objects and arrays of users.
 * Valid URLs (Supabase Storage, Google profile pics, etc.) are left as-is.
 */
export function fixAvatarUrl(userOrUsers) {
  const fix = (u) => {
    if (!u || !u.avatar_url) return u;
    // Clear broken R2 URLs that were saved before the Supabase Storage migration
    if (u.avatar_url.includes('.public/') || u.avatar_url.includes('pub-r2.dev/')) {
      return { ...u, avatar_url: '' };
    }
    return u;
  };
  if (Array.isArray(userOrUsers)) return userOrUsers.map(fix);
  return fix(userOrUsers);
}
