/**
 * IRL Work HTTP Client
 * Low-level HTTP client for making API calls
 */

export default class IRLWorkClient {
  /**
   * Create a new client
   * @param {Object} options
   * @param {string} options.apiKey - API key
   * @param {string} [options.apiUrl] - Base API URL
   */
  constructor({ apiKey, apiUrl = 'https://api.irlwork.ai' }) {
    this.apiKey = apiKey
    this.apiUrl = apiUrl
  }
  
  /**
   * Make HTTP request
   * @private
   */
  async _request(endpoint, options = {}) {
    const url = `${this.apiUrl}${endpoint}`
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': this.apiKey,
      ...options.headers
    }
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data
  }
  
  // ============ MCP API ============
  
  /**
   * Call MCP method
   * @param {string} method - Method name
   * @param {Object} params - Method parameters
   * @returns {Promise<any>} Response data
   */
  async callMcp(method, params = {}) {
    return await this._request('/api/mcp', {
      method: 'POST',
      body: { method, params }
    })
  }
  
  // ============ REST API ============
  
  /**
   * Get agent profile
   */
  async getProfile() {
    return await this._request('/api/profile')
  }
  
  /**
   * Health check
   */
  async healthCheck() {
    return await this._request('/api/health')
  }
  
  /**
   * Get notifications
   */
  async getNotifications() {
    return await this._request('/api/notifications')
  }
  
  /**
   * Get wallet status
   */
  async getWallet() {
    return await this._request('/api/wallet/status')
  }
}

export default IRLWorkClient
