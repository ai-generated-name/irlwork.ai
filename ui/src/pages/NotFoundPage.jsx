import React from 'react'
import { Home, ArrowLeft, MapPin } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)',
      padding: 'var(--space-6)',
      paddingTop: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle grid background like landing page */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Orange glow accent */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(232,133,61,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        textAlign: 'center',
        maxWidth: '480px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          background: 'rgba(232, 133, 61, 0.1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-6)',
        }}>
          <MapPin size={32} color="var(--orange-600)" />
        </div>

        {/* 404 number */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '96px',
          fontWeight: '800',
          lineHeight: '1',
          background: 'linear-gradient(135deg, var(--orange-600) 0%, var(--orange-500) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 'var(--space-4)',
        }}>
          404
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: 'var(--space-3)',
          color: 'var(--text-primary)',
        }}>
          Page not found
        </h1>

        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--space-8)',
          lineHeight: '1.6',
        }}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div style={{
          display: 'flex',
          gap: 'var(--space-3)',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <a
            href="/"
            className="v4-btn v4-btn-primary"
            style={{
              padding: 'var(--space-3) var(--space-6)',
              fontSize: '15px',
              textDecoration: 'none',
            }}
          >
            <Home size={18} />
            Return to homepage
          </a>
          <button
            onClick={() => window.history.back()}
            className="v4-btn v4-btn-secondary"
            style={{
              padding: 'var(--space-3) var(--space-6)',
              fontSize: '15px',
            }}
          >
            <ArrowLeft size={18} />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
