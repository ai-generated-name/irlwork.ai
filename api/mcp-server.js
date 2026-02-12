#!/usr/bin/env node
// ============================================
// HUMANWORK.AI - MCP Server for AI Agents
// Model Context Protocol Integration
// ============================================

const http = require('http')

const API_URL = process.env.API_URL || 'http://localhost:3002/api'
const API_KEY = process.env.HUMANWORK_API_KEY

// MCP Protocol Handlers
const handlers = {
  // List available humans
  async list_humans(params = {}) {
    const query = new URLSearchParams()
    if (params.category) query.append('category', params.category)
    if (params.city) query.append('city', params.city)
    if (params.min_rate) query.append('min_rate', params.min_rate)
    if (params.max_rate) query.append('max_rate', params.max_rate)
    if (params.min_rating) query.append('min_rating', params.min_rating)
    if (params.skills) query.append('skills', params.skills)
    if (params.sort) query.append('sort', params.sort)
    if (params.limit) query.append('limit', params.limit)
    if (params.offset) query.append('offset', params.offset)
    
    const res = await fetch(`${API_URL}/humans?${query}`)
    return await res.json()
  },

  // Get human profile
  async get_human(params) {
    const res = await fetch(`${API_URL}/humans/${params.human_id}`)
    return await res.json()
  },

  // Start conversation with human
  async start_conversation(params) {
    const res = await fetch(`${API_URL}/conversations`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': API_KEY 
      },
      body: JSON.stringify({ 
        human_id: params.human_id,
        message: params.message || "Hi! I'd like to discuss a potential task."
      })
    })
    return await res.json()
  },

  // Send message
  async send_message(params) {
    const res = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': API_KEY 
      },
      body: JSON.stringify({ 
        conversation_id: params.conversation_id,
        content: params.content,
        type: params.type || 'text'
      })
    })
    return await res.json()
  },

  // Get messages with optional since filter and auto-read marking
  async get_messages(params) {
    const { conversation_id, since } = params;

    // Build query params for pagination/filtering
    const query = new URLSearchParams();
    if (since) {
      query.append('after_time', since);  // Map MCP 'since' to API 'after_time'
    }

    const res = await fetch(`${API_URL}/messages/${conversation_id}?${query}`, {
      headers: { 'Authorization': API_KEY }
    });
    const messages = await res.json();

    // Auto-mark as read if there are unread messages from others
    if (Array.isArray(messages) && messages.length > 0) {
      const hasUnread = messages.some(m => !m.read_at);
      if (hasUnread) {
        // Fire-and-forget the read-all call
        fetch(`${API_URL}/conversations/${conversation_id}/read-all`, {
          method: 'PUT',
          headers: { 'Authorization': API_KEY }
        }).catch(() => {}); // Ignore errors
      }
    }

    return messages;
  },

  // Create booking request
  async create_booking(params) {
    const res = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': API_KEY 
      },
      body: JSON.stringify({
        conversation_id: params.conversation_id,
        title: params.title,
        description: params.description,
        location: params.location,
        scheduled_at: params.scheduled_at,
        duration_hours: params.duration_hours,
        hourly_rate: params.hourly_rate
      })
    })
    return await res.json()
  },

  // Complete booking
  async complete_booking(params) {
    const res = await fetch(`${API_URL}/bookings/${params.booking_id}/complete`, {
      method: 'POST',
      headers: { 'Authorization': API_KEY }
    })
    return await res.json()
  },

  // Release escrow payment
  async release_escrow(params) {
    const res = await fetch(`${API_URL}/bookings/${params.booking_id}/release-escrow`, {
      method: 'POST',
      headers: { 'Authorization': API_KEY }
    })
    return await res.json()
  },

  // Get my bookings
  async my_bookings() {
    const res = await fetch(`${API_URL}/bookings`, {
      headers: { 'Authorization': API_KEY }
    })
    return await res.json()
  },

  // Get notifications
  async notifications() {
    const res = await fetch(`${API_URL}/notifications`, {
      headers: { 'Authorization': API_KEY }
    })
    return await res.json()
  },

  // Get unread message summary across all conversations
  async get_unread_summary() {
    const res = await fetch(`${API_URL}/conversations/unread`, {
      headers: { 'Authorization': API_KEY }
    })
    return await res.json()
  },

  // Register/update webhook URL for push notifications
  async set_webhook(params) {
    const { url, secret } = params;
    const res = await fetch(`${API_URL}/webhooks/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: JSON.stringify({ webhook_url: url, webhook_secret: secret })
    })
    return await res.json()
  },

  // Mark notification read
  async mark_notification_read(params) {
    const res = await fetch(`${API_URL}/notifications/${params.notification_id}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': API_KEY }
    })
    return await res.json()
  },

  // Get task templates
  async task_templates(params = {}) {
    const query = new URLSearchParams()
    if (params.category) query.append('category', params.category)
    const res = await fetch(`${API_URL}/task-templates?${query}`)
    return await res.json()
  },

  // Ad hoc tasks
  async create_adhoc_task(params) {
    const res = await fetch(`${API_URL}/ad-hoc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: JSON.stringify({
        category: params.category,
        title: params.title,
        description: params.description,
        location: params.location,
        urgency: params.urgency || 'normal',
        budget_min: params.budget_min,
        budget_max: params.budget_max,
        required_skills: params.required_skills || []
      })
    })
    return await res.json()
  },

  // Create a task (direct posting via /api/tasks)
  async create_task(params) {
    const res = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: JSON.stringify({
        title: params.title,
        description: params.description,
        category: params.category,
        budget: params.budget || 50,
        location: params.location,
        is_remote: params.is_remote || false,
        duration_hours: params.duration_hours,
        deadline: params.deadline,
        requirements: params.requirements,
        required_skills: params.required_skills || []
      })
    })
    return await res.json()
  },

  async my_adhoc_tasks() {
    const res = await fetch(`${API_URL}/ad-hoc?my_tasks=true`, {
      headers: { 'Authorization': API_KEY }
    })
    return await res.json()
  },

  // Get applicants for a task
  async get_applicants(params) {
    const res = await fetch(`${API_URL}/tasks/${params.task_id}/applications`, {
      headers: { 'Authorization': API_KEY }
    })
    return await res.json()
  },

  // Assign a human to a task
  async assign_human(params) {
    const res = await fetch(`${API_URL}/tasks/${params.task_id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: JSON.stringify({
        human_id: params.human_id
      })
    })
    return await res.json()
  },

  // View proof submissions for a task
  async view_proof(params) {
    const res = await fetch(`${API_URL}/tasks/${params.task_id}/proofs`, {
      headers: { 'Authorization': API_KEY }
    })
    return await res.json()
  },

  // File a dispute for a task
  async dispute_task(params) {
    const res = await fetch(`${API_URL}/disputes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: JSON.stringify({
        task_id: params.task_id,
        reason: params.reason,
        category: params.category || 'quality_issue',
        evidence_urls: params.evidence_urls || []
      })
    })
    return await res.json()
  },

  // Get detailed task status
  async get_task_status(params) {
    const res = await fetch(`${API_URL}/tasks/${params.task_id}/status`, {
      headers: { 'Authorization': API_KEY }
    })
    return await res.json()
  },

  // Submit feedback or bug report
  async submit_feedback(params) {
    if (!params.message) {
      return { error: 'message parameter is required' }
    }
    const res = await fetch(`${API_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: JSON.stringify({
        type: params.type || 'feedback',
        urgency: params.urgency || 'normal',
        subject: params.subject,
        message: params.message,
        image_urls: params.image_urls || [],
        page_url: params.page_url || 'mcp-client'
      })
    })
    return await res.json()
  }
}

// MCP Protocol Server
const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/mcp') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', async () => {
      try {
        const { method, params = {} } = JSON.parse(body)
        
        if (!API_KEY) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'HUMANWORK_API_KEY required' }))
          return
        }
        
        const handler = handlers[method]
        if (!handler) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: `Unknown method: ${method}` }))
          return
        }
        
        const result = await handler(params)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', mcp: 'irlwork.ai' }))
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

const PORT = process.env.MCP_PORT || 3004
server.listen(PORT, () => {
  console.log(`🤖 Humanwork.ai MCP Server running on port ${PORT}`)
  console.log(`   API: ${API_URL}`)
  console.log(`   Available Methods (23):`)
  console.log(``)
  console.log(`   Core:`)
  console.log(`   - list_humans(params)`)
  console.log(`   - get_human(human_id)`)
  console.log(`   - start_conversation(human_id, message)`)
  console.log(`   - send_message(conversation_id, content)`)
  console.log(`   - get_messages(conversation_id, since?) [UPDATED]`)
  console.log(`   - get_unread_summary() [NEW]`)
  console.log(``)
  console.log(`   Bookings & Payments:`)
  console.log(`   - create_booking(...)`)
  console.log(`   - complete_booking(booking_id)`)
  console.log(`   - release_escrow(booking_id)`)
  console.log(`   - my_bookings()`)
  console.log(``)
  console.log(`   Tasks & Applications:`)
  console.log(`   - create_task(title, description, category, budget, location, required_skills, ...) [NEW]`)
  console.log(`   - create_adhoc_task(...)`)
  console.log(`   - my_adhoc_tasks()`)
  console.log(`   - task_templates(params)`)
  console.log(`   - get_applicants(task_id) [NEW]`)
  console.log(`   - assign_human(task_id, human_id) [NEW]`)
  console.log(``)
  console.log(`   Proofs & Disputes:`)
  console.log(`   - view_proof(task_id) [NEW]`)
  console.log(`   - dispute_task(task_id, reason) [NEW]`)
  console.log(`   - get_task_status(task_id) [NEW]`)
  console.log(``)
  console.log(`   Notifications & Webhooks:`)
  console.log(`   - notifications()`)
  console.log(`   - mark_notification_read(notification_id)`)
  console.log(`   - set_webhook(url, secret?) [NEW]`)
  console.log(``)
  console.log(`   Feedback:`)
  console.log(`   - submit_feedback(message, type?, urgency?, subject?) [NEW]`)
})
