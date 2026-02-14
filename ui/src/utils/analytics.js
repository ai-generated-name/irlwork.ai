const GA_ID = 'G-GDWHMTQ6PJ'

function gtag() {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(arguments)
}

/** Send a pageview for SPA route changes */
export function trackPageView(path) {
  gtag('config', GA_ID, {
    page_path: path,
    send_page_view: true,
  })
}

/** Send a custom GA4 event */
export function trackEvent(eventName, params = {}) {
  gtag('event', eventName, params)
}

/** Set persistent user properties (e.g. user mode) */
export function setUserProperties(properties) {
  gtag('set', 'user_properties', properties)
}
