import React from 'react'

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{
          fontSize: '96px',
          fontWeight: '800',
          lineHeight: '1',
          background: 'linear-gradient(135deg, #f4845f 0%, #ff6b35 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
        }}>
          404
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '12px',
        }}>
          Page not found
        </h1>

        <p style={{
          fontSize: '16px',
          color: 'rgba(255,255,255,0.6)',
          marginBottom: '32px',
          lineHeight: '1.6',
        }}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/"
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #f4845f 0%, #ff6b35 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            Go to Homepage
          </a>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
