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

  // Get messages
  async get_messages(params) {
    const res = await fetch(`${API_URL}/conversations/${params.conversation_id}/messages`, {
      headers: { 'Authorization': API_KEY }
    })
    return await res.json()
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
        budget_max: params.budget_max
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
  console.log(`   Available Methods (19):`)
  console.log(``)
  console.log(`   Core:`)
  console.log(`   - list_humans(params)`)
  console.log(`   - get_human(human_id)`)
  console.log(`   - start_conversation(human_id, message)`)
  console.log(`   - send_message(conversation_id, content)`)
  console.log(`   - get_messages(conversation_id)`)
  console.log(``)
  console.log(`   Bookings & Payments:`)
  console.log(`   - create_booking(...)`)
  console.log(`   - complete_booking(booking_id)`)
  console.log(`   - release_escrow(booking_id)`)
  console.log(`   - my_bookings()`)
  console.log(``)
  console.log(`   Tasks & Applications:`)
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
  console.log(`   Notifications:`)
  console.log(`   - notifications()`)
  console.log(`   - mark_notification_read(notification_id)`)
})
