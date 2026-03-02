import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui'

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
        <p className="text-[#6B7280]">Unable to verify authentication.</p>
        <Button
          variant="primary"
          size="md"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
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
