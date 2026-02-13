/**
 * IRL Work Agent - High-level SDK for AI Agents
 * 
 * Handles:
 * - Task creation and management
 * - Human hiring
 * - Payment release
 * - Webhook notifications (auto-handled)
 * - Event system for real-time updates
 */

import IRLWorkClient from './client.js'
import { createEventEmitter } from './events.js'

export class IRLWorkAgent {
  /**
   * Create a new IRL Work Agent
   * @param {Object} options
   * @param {string} options.apiKey - Your IRL Work API key (starts with 'irl_')
   * @param {string} [options.apiUrl] - API URL (defaults to https://api.irlwork.ai)
   * @param {Function} [options.onNotification] - Callback for notifications
   */
  constructor({ apiKey, apiUrl = 'https://api.irlwork.ai', onNotification = null }) {
    if (!apiKey || !apiKey.startsWith('irl_')) {
      throw new Error('Invalid API key. Must start with "irl_"')
    }
    
    this.apiKey = apiKey
    this.apiUrl = apiUrl
    this.client = new IRLWorkClient({ apiKey, apiUrl })
    this.events = createEventEmitter()
    
    // Set up notification handler
    if (onNotification) {
      this.on('notification', onNotification)
    }
    
    // Auto-register webhook for notifications
    this._registerWebhook()
  }
  
  /**
   * Register webhook for real-time notifications
   * @private
   */
  async _registerWebhook() {
    try {
      await this.client.callMcp('set_webhook', {
        webhook_url: `${this.apiUrl}/webhooks/${this.apiKey}`
      })
      console.log('[IRL Work] Webhook registered')
    } catch (error) {
      console.warn('[IRL Work] Could not register webhook:', error.message)
    }
  }
  
  // ============ EVENTS ============
  
  /**
   * Listen for events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    this.events.on(event, callback)
  }
  
  /**
   * Listen once (one-time)
   * @param {string} event - Event name  
   * @param {Function} callback - Callback function
   */
  once(event, callback) {
    this.events.once(event, callback)
  }
  
  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} [callback] - Specific callback to remove
   */
  off(event, callback) {
    this.events.off(event, callback)
  }
  
  // ============ TASKS ============
  
  /**
   * Post a new task
   * @param {Object} params
   * @param {string} params.title - Task title
   * @param {string} params.description - Task description
   * @param {string} params.category - Category (delivery, pickup, errand, etc)
   * @param {number} [params.budget] - Budget in USD
   * @param {string} [params.location] - City or location
   * @param {string[]} [params.required_skills] - Skills needed for this task
   * @param {string} [params.requirements] - Additional requirements text
   * @param {boolean} [params.is_remote] - Whether task can be done remotely
   * @param {number} [params.duration_hours] - Estimated duration in hours
   * @param {string} [params.deadline] - ISO deadline string
   * @returns {Promise<Object>} Task details
   */
  async postTask({ title, description, category, budget = 50, location = '', required_skills = [], requirements, is_remote, duration_hours, deadline }) {
    const result = await this.client.callMcp('create_task', {
      title,
      description,
      category,
      budget,
      location,
      required_skills,
      requirements,
      is_remote,
      duration_hours,
      deadline
    })

    this.events.emit('task:created', result)
    return result
  }
  
  /**
   * Get all your tasks
   * @returns {Promise<Array>} List of tasks
   */
  async getTasks() {
    return await this.client.callMcp('get_tasks', {})
  }
  
  /**
   * Get details of a specific task
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task details
   */
  async getTask(taskId) {
    return await this.client.callMcp('get_task_details', { task_id: taskId })
  }
  
  /**
   * Get status of a task
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task status
   */
  async getTaskStatus(taskId) {
    return await this.client.callMcp('get_task_status', { task_id: taskId })
  }
  
  // ============ HUMANS ============
  
  /**
   * List available humans
   * @param {Object} [params]
   * @param {string} [params.category] - Filter by skill category
   * @param {string} [params.city] - Filter by city
   * @param {number} [params.limit] - Max results (default 100)
   * @returns {Promise<Array>} List of humans
   */
  async listHumans({ category = '', city = '', limit = 100 } = {}) {
    return await this.client.callMcp('list_humans', { category, city, limit })
  }
  
  /**
   * Get human profile
   * @param {string} humanId - Human ID
   * @returns {Promise<Object>} Human details
   */
  async getHuman(humanId) {
    return await this.client.callMcp('get_human', { human_id: humanId })
  }
  
  /**
   * Hire a human for a task.
   *
   * This sends an offer to the human — they have 24 hours to accept or decline.
   * The agent's card is NOT charged until the human accepts.
   * A pre-linked payment card is required before calling this method.
   *
   * @param {Object} params
   * @param {string} params.taskId - Task ID
   * @param {string} params.humanId - Human ID to hire
   * @param {string} [params.instructions] - Special instructions for human
   * @param {number} [params.deadlineHours] - Hours to complete after acceptance (default 24)
   * @returns {Promise<Object>} Result with status 'pending_acceptance' and review_deadline
   */
  async hireHuman({ taskId, humanId, instructions = '', deadlineHours = 24 }) {
    const result = await this.client.callMcp('hire_human', {
      task_id: taskId,
      human_id: humanId,
      instructions,
      deadline_hours: deadlineHours
    })

    this.events.emit('human:offered', { taskId, humanId, reviewDeadline: result.review_deadline })
    return result
  }
  
  // ============ REVIEW & PAYMENT ============
  
  /**
   * Approve task completion and release payment
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Payment details
   */
  async approveTask(taskId) {
    const result = await this.client.callMcp('approve_task', { task_id: taskId })
    
    this.events.emit('task:approved', result)
    return result
  }
  
  /**
   * Reject task proof with feedback
   * @param {Object} params
   * @param {string} params.taskId - Task ID
   * @param {string} params.feedback - Reason for rejection
   * @param {number} [params.extendDeadlineHours] - Extra time to complete (default 24)
   */
  async rejectProof({ taskId, feedback, extendDeadlineHours = 24 }) {
    const result = await this.client.callMcp('reject_task', {
      task_id: taskId,
      feedback,
      extend_deadline_hours: extendDeadlineHours
    })
    
    this.events.emit('task:rejected', { taskId, feedback })
    return result
  }
  
  // ============ WEBHOOK HANDLER ============
  
  /**
   * Handle incoming webhook notification
   * (Call this when your webhook endpoint receives a POST)
   * @param {Object} payload - Webhook payload
   */
  handleWebhook(payload) {
    const { event, data, timestamp } = payload
    
    this.events.emit('notification', { event, data, timestamp })
    this.events.emit(event, data)
    
    console.log(`[IRL Work Webhook] ${event}:`, data)
  }
  
  // ============ UTILITY ============
  
  /**
   * Get agent profile
   * @returns {Promise<Object>} Agent details
   */
  async getProfile() {
    return await this.client.getProfile()
  }
  
  /**
   * Health check
   * @returns {Promise<Object>} API status
   */
  async healthCheck() {
    return await this.client.healthCheck()
  }
}

export default IRLWorkAgent
