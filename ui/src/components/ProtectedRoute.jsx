import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AUTH_TIMEOUT_MS = 10000

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setTimedOut(true)
    }, AUTH_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [loading])

  if (timedOut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-600">Unable to verify authentication.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-coral text-white rounded-[14px] hover:bg-coral-dark transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}
