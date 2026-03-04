// Client-side SPA navigation utility
// Performs pushState + dispatches popstate so App.jsx's listener updates React state.
// Import this anywhere instead of using window.location.href for internal routes.

export function navigate(url) {
  window.history.pushState({}, '', url)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
