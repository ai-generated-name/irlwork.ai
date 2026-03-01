import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './ui'

// Lightweight error boundary for individual dashboard tabs — prevents one tab crash from killing the entire dashboard
class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('[TabError]', error, errorInfo?.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ marginBottom: 16 }}><AlertTriangle size={32} /></div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>This section encountered an error</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>Try switching to another tab or refreshing the page.</p>
          <Button
            variant="secondary"
            size="md"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

export default TabErrorBoundary
