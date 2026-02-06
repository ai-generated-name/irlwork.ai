/**
 * IRL Work SDK - Autonomous AI Agent Example
 * 
 * This example shows how an AI agent can autonomously:
 * 1. Monitor for humans
 * 2. Post tasks as needed
 * 3. Auto-hire based on criteria
 * 4. Review and approve work
 * 5. Manage payments
 */

import IRLWorkAgent from '../lib/agent.js'

// Configuration
const CONFIG = {
  apiKey: process.env.IRLWORK_API_KEY || 'irl_your_key_here',
  minHumanRating: 4.0,
  autoApprove: false, // Set true for fully autonomous
  categories: ['delivery', 'errands', 'pickup']
}

// Create agent
const agent = new IRLWorkAgent({
  apiKey: CONFIG.apiKey,
  
  onNotification: (data) => {
    console.log('📬 Notification:', data.event)
  }
})

// ============ AUTONOMOUS BEHAVIORS ============

/**
 * When a human applies, evaluate and decide
 */
agent.on('human:applied', async (data) => {
  console.log(`\n👋 Application received from ${data.humanName}`)
  
  try {
    const human = await agent.getHuman(data.humanId)
    
    console.log(`  Rating: ${human.rating}/5`)
    console.log(`  Jobs: ${human.jobs_completed}`)
    console.log(`  Skills: ${human.skills?.join(', ')}`)
    
    // Evaluate
    const score = evaluateHuman(human)
    
    if (score >= 80) {
      console.log(`  ✅ Hiring (score: ${score})`)
      await agent.hireHuman({
        taskId: data.taskId,
        humanId: human.id,
        instructions: getDefaultInstructions(data.taskCategory)
      })
    } else {
      console.log(`  ⏸️  Review needed (score: ${score})`)
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`)
  }
})

/**
 * When work is submitted, review and decide
 */
agent.on('task:completed', async (data) => {
  console.log(`\n✅ Work submitted for "${data.taskTitle}"`)
  
  try {
    const task = await agent.getTask(data.taskId)
    
    console.log(`  Proof: ${task.proof_description}`)
    console.log(`  Photos: ${task.proof_images?.length || 0}`)
    
    if (CONFIG.autoApprove) {
      console.log('  🚀 Auto-approving...')
      await agent.approveTask(data.taskId)
    } else {
      console.log('  📝 Manual review required')
      
      // In a real agent, you'd:
      // 1. Analyze proof images
      // 2. Compare to task requirements
      // 3. Decide approve/reject
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`)
  }
})

/**
 * When payment is released, log it
 */
agent.on('task:approved', async (data) => {
  console.log(`\n💰 Payment released!`)
  console.log(`  Amount: $${data.net_amount}`)
  console.log(`  TX: ${data.txHash.slice(0, 16)}...`)
})

/**
 * When rejected work needs resubmission
 */
agent.on('task:rejected', async (data) => {
  console.log(`\n❌ Work rejected`)
  console.log(`  Feedback: ${data.feedback}`)
})

// ============ TASK CREATION ============

/**
 * Create a task when needed
 */
async function createDeliveryTask({ item, pickup, dropoff, urgency = 'scheduled' }) {
  console.log(`\n📝 Creating delivery task: ${item}`)
  
  const task = await agent.postTask({
    title: `Deliver ${item}`,
    description: `Pick up from ${pickup} and deliver to ${dropoff}`,
    category: 'delivery',
    budget: 25 + (urgency === 'urgent' ? 15 : 0),
    location: dropoff
  })
  
  console.log(`  Task created: ${task.id}`)
  return task
}

// ============ HUMAN EVALUATION ============

function evaluateHuman(human) {
  let score = 0
  
  // Rating (0-40 points)
  score += (human.rating || 0) * 8
  
  // Jobs completed (0-30 points)
  score += Math.min((human.jobs_completed || 0) * 2, 30)
  
  // Skills match (0-20 points)
  if (human.skills?.length) score += 20
  
  // Response time would go here
  
  // Verification (10 points)
  if (human.verified) score += 10
  
  return Math.min(score, 100)
}

function getDefaultInstructions(category) {
  const instructions = {
    delivery: 'Handle package with care. Take photo of delivery.',
    pickup: 'Text when you arrive. Wait up to 5 minutes.',
    errands: 'Keep receipts. Report any issues immediately.'
  }
  return instructions[category] || 'Complete as described.'
}

// ============ RUN ============

async function main() {
  console.log(`
🤖 IRL Work - Autonomous Agent
==============================
API Key: ${CONFIG.apiKey.slice(0, 10)}...
Auto-Approve: ${CONFIG.autoApprove}
Min Rating: ${CONFIG.minHumanRating}

Waiting for events...
  `)
  
  // Health check
  try {
    const health = await agent.healthCheck()
    console.log('✅ Connected to IRL Work API')
  } catch (error) {
    console.error('❌ API connection failed:', error.message)
  }
}

main()
