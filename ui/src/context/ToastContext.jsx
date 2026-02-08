import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    // Fallback to console if not in provider (should not happen)
    return {
      show: (message) => console.log('Toast:', message),
      success: (message) => console.log('Success:', message),
      error: (message) => console.error('Error:', message)
    }
  }
  return context
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const success = useCallback((message) => show(message, 'success'), [show])
  const error = useCallback((message) => show(message, 'error'), [show])

  return (
    <ToastContext.Provider value={{ show, success, error }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
            </div>
            <div className="toast-message">{toast.message}</div>
            <button
              className="toast-close"
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
