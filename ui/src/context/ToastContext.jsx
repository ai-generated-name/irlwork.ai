import React, { createContext, useContext, useState, useCallback } from 'react'
import { Check, X, Info } from 'lucide-react'

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
  const info = useCallback((message) => show(message, 'info'), [show])

  return (
    <ToastContext.Provider value={{ show, success, error, info }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' ? <Check size={14} /> : toast.type === 'error' ? <X size={14} /> : <Info size={14} />}
            </div>
            <div className="toast-message">{toast.message}</div>
            <button
              className="toast-close"
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
