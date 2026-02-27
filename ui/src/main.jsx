import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext'
import './index.css'

// Initialize Sentry for frontend error tracking
// Gracefully skips if VITE_SENTRY_DSN is not set
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    sendDefaultPii: false,
  })
  console.log('[Sentry] Frontend error tracking initialized')
}

// Error fallback UI shown when Sentry catches an unhandled error
function SentryFallback({ error, resetError }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif',
      backgroundColor: '#FAFAF8', padding: '2rem'
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>Something went wrong</div>
        <p style={{ color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
          An unexpected error occurred. Our team has been notified.
        </p>
        <button
          onClick={resetError}
          style={{
            padding: '10px 24px', backgroundColor: '#E8853D', color: 'white',
            border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 600,
            fontSize: 14
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={SentryFallback}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
