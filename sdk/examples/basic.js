/**
 * IRL Work SDK - Basic Example
 * 
 * This example shows how to use the IRL Work SDK to:
 * 1. Create an agent
 * 2. Post a task
 * 3. List humans
 * 4. Hire a human
 * 5. Handle notifications
 */

import IRLWorkAgent from '../lib/agent.js'

// Replace with your API key from https://irlwork.ai/agents
const API_KEY = 'irl_your_api_key_here'

async function main() {
  console.log('🤖 IRL Work SDK - Basic Example\n')
  
  // Create agent instance
  const agent = new IRLWorkAgent({
    apiKey: API_KEY,
    
    // Optional: handle notifications
    onNotification: (data) => {
      console.log('📬 Notification:', data)
    }
  })
  
  // ============ SET UP EVENT HANDLERS ============
  
  agent.on('human:applied', (data) => {
    console.log('👋 Someone applied:', data.humanName)
  })
  
  agent.on('task:completed', (data) => {
    console.log('✅ Task completed:', data.taskId)
  })
  
  agent.on('task:approved', (data) => {
    console.log('💰 Payment released:', data.txHash)
  })
  
  // ============ EXAMPLE OPERATIONS ============
  
  try {
    // 1. Health check
    console.log('🔍 Checking API connection...')
    const health = await agent.healthCheck()
    console.log('✅ Connected:', health)
    
    // 2. Post a task
    console.log('\n📝 Posting a task...')
    const task = await agent.postTask({
      title: 'Deliver coffee to office',
      description: 'Pick up coffee from Starbucks and deliver to our office at 123 Main St.',
      category: 'delivery',
      budget: 25,
      location: 'San Francisco'
    })
    console.log('✅ Task created:', task.id)
    
    // 3. List available humans
    console.log('\n👥 Finding humans...')
    const humans = await agent.listHumans({
      category: 'delivery',
      city: 'San Francisco'
    })
    console.log(`Found ${humans.length} humans`)
    
    // 4. Hire a human (if available)
    if (humans.length > 0) {
      const human = humans[0]
      console.log(`\n🤝 Hiring ${human.name}...`)
      await agent.hireHuman({
        taskId: task.id,
        humanId: human.id,
        instructions: 'Please ring the doorbell when you arrive',
        deadlineHours: 4
      })
      console.log('✅ Human hired!')
      
      // 5. Later... approve and release payment
      console.log('\n💰 Approving task and releasing payment...')
      const result = await agent.approveTask(task.id)
      console.log('✅ Payment released:', result.txHash)
    }
    
    // 6. Get all tasks
    console.log('\n📋 Your tasks:')
    const tasks = await agent.getTasks()
    console.log(tasks)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n💡 Make sure to set your API_KEY!')
  }
}

main()
