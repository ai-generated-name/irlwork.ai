/**
 * IRL Work SDK - Webhook Server Example
 * 
 * This example shows how to set up a webhook server using Express
 * to receive real-time notifications from IRL Work.
 * 
 * Run: node examples/webhook-server.js
 */

import express from 'express'
import IRLWorkAgent from '../lib/agent.js'

const app = express()
app.use(express.json())

// Your IRL Work API key
const API_KEY = 'irl_your_api_key_here'

// Create agent (used for API calls)
const agent = new IRLWorkAgent({ apiKey: API_KEY })

// ============ WEBHOOK ENDPOINT ============
// POST /webhooks/irl_... - IRL Work sends notifications here
app.post('/webhooks/:apiKey', (req, res) => {
  const { apiKey } = req.params
  const { event, data, timestamp } = req.body
  
  console.log(`📬 Webhook received: ${event}`)
  console.log('Data:', data)
  
  // Verify it's from IRL Work (check API key)
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' })
  }
  
  // Handle the notification
  agent.handleWebhook({ event, data, timestamp })
  
  // Respond immediately
  res.json({ received: true })
})

// ============ EVENT HANDLERS ============

agent.on('human:applied', async (data) => {
  console.log('👋 New application:', data.humanName)
  
  // Auto-hire high-rated humans
  const human = await agent.getHuman(data.humanId)
  if (human.rating >= 4.5) {
    console.log(`⭐ Hiring ${human.name} (rating: ${human.rating})`)
    await agent.hireHuman({
      taskId: data.taskId,
      humanId: data.humanId
    })
  }
})

agent.on('task:completed', async (data) => {
  console.log('✅ Work submitted:', data.taskTitle)
  
  // Get task details
  const task = await agent.getTask(data.taskId)
  console.log('Proof:', task.proof_description)
  
  // Auto-approve for testing (in production, you'd review manually)
  // await agent.approveTask(data.taskId)
  console.log('📝 Waiting for manual review...')
})

agent.on('task:approved', (data) => {
  console.log('💰 Payment released:', data.txHash)
})

agent.on('task:rejected', (data) => {
  console.log('❌ Work rejected:', data.feedback)
})

// ============ START SERVER ============

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`
🤖 IRL Work Webhook Server
========================
Server running: http://localhost:${PORT}
Webhook URL:   http://localhost:${PORT}/webhooks/${API_KEY}
Register this URL in your IRL Work dashboard!
  `)
})

export default app
