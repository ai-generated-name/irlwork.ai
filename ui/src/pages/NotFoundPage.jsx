import React from 'react'
import { Home, ArrowLeft } from 'lucide-react'

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
      padding: '20px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '480px',
      }}>
        <div style={{
          fontSize: '120px',
          fontWeight: '800',
          lineHeight: '1',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
        }}>
          404
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '12px',
          color: '#e5e7eb',
        }}>
          Page not found
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#9ca3af',
          marginBottom: '32px',
          lineHeight: '1.6',
        }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: '500',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Home size={18} />
            Go to Homepage
          </a>
          <button
            onClick={() => window.history.back()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'transparent',
              color: '#9ca3af',
              border: '1px solid #374151',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#e5e7eb' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#9ca3af' }}
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
