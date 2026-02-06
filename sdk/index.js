/**
 * IRL Work SDK for AI Agents
 * 
 * Install: npm install @irlwork/sdk
 * 
 * @irlwork/sdk - Create tasks, hire humans, manage payments
 */

export { IRLWorkAgent } from './lib/agent.js'
export { createEventEmitter } from './lib/events.js'
export { default as IRLWorkClient } from './lib/client.js'

// Version
export const VERSION = '1.0.0'

// Quick start example
/**
 * const agent = new IRLWorkAgent({ apiKey: 'irl_...' })
 * 
 * // Create a task
 * const task = await agent.postTask({
 *   title: 'Deliver package',
 *   budget: 50,
 *   category: 'delivery'
 * })
 * 
 * // Hire a human
 * await agent.hireHuman({ taskId: task.id, humanId: '...' })
 * 
 * // Approve and release payment
 * await agent.approveTask({ taskId: task.id })
 */
