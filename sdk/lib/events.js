/**
 * Simple Event Emitter
 * Lightweight event system for handling notifications
 */

/**
 * Create an event emitter
 * @returns {Object} Event emitter with on/off/emit methods
 */
export function createEventEmitter() {
  const listeners = new Map()
  
  return {
    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event).add(callback)
      
      // Return unsubscribe function
      return () => this.off(event, callback)
    },
    
    /**
     * Add one-time listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
      const wrapper = (...args) => {
        callback(...args)
        this.off(event, wrapper)
      }
      this.on(event, wrapper)
    },
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} [callback] - Specific callback (removes all if omitted)
     */
    off(event, callback) {
      if (!listeners.has(event)) return
      
      if (callback) {
        listeners.get(event).delete(callback)
      } else {
        listeners.delete(event)
      }
    },
    
    /**
     * Emit event
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to callbacks
     */
    emit(event, ...args) {
      if (!listeners.has(event)) return
      
      listeners.get(event).forEach(callback => {
        try {
          callback(...args)
        } catch (error) {
          console.error(`[Event Error] ${event}:`, error)
        }
      })
    },
    
    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
      return listeners.get(event)?.size || 0
    },
    
    /**
     * Remove all listeners
     */
    removeAllListeners() {
      listeners.clear()
    }
  }
}

export default createEventEmitter
