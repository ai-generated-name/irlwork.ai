/**
 * Reputation Service
 *
 * Centralized reputation stat management for workers and agents.
 * All reputation increment calls across server.js should eventually
 * import from this service instead of making direct increment_user_stat
 * RPC calls inline.
 *
 * Usage:
 *   const { incrementStat, computeSuccessRate, computeAgentReliability, enrichWithReputation } = require('./services/reputationService');
 */

/**
 * Increment a user stat atomically via Supabase RPC.
 * Wraps `increment_user_stat` with error handling and logging.
 *
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} statName - Column name (e.g. 'total_rejections')
 * @param {number} [incrementBy=1] - How much to increment
 */
async function incrementStat(supabase, userId, statName, incrementBy = 1) {
  try {
    const { error } = await supabase.rpc('increment_user_stat', {
      user_id_param: userId,
      stat_name: statName,
      increment_by: incrementBy
    });

    if (error) {
      console.error(`[Reputation] Failed to increment ${statName} for ${userId}:`, error.message);
    }
  } catch (err) {
    console.error(`[Reputation] RPC error incrementing ${statName} for ${userId}:`, err.message);
  }
}

/**
 * Compute worker success rate from task-level outcomes.
 *
 * Formula: total_tasks_completed / (total_tasks_completed + total_disputes_lost)
 *
 * NOTE: total_rejections is intentionally excluded. Revision requests are
 * part of normal workflow, not failures. A worker who completes 10 tasks
 * but gets revision requests on 5 should still have a 100% success rate
 * if all tasks were ultimately paid.
 *
 * @param {object} user - User object with reputation fields
 * @returns {number|null} - Success rate as percentage (0-100), or null if no history
 */
function computeSuccessRate(user) {
  const completed = user.total_tasks_completed || 0;
  const disputesLost = user.total_disputes_lost || 0;
  const denominator = completed + disputesLost;

  if (denominator === 0) return null; // No history yet

  return Math.round((completed / denominator) * 100);
}

/**
 * Compute agent reliability (inverse cancellation rate).
 *
 * Formula: 1 - (total_cancellations / total_tasks_posted)
 * Returns null if total_tasks_posted < 5 (avoid noise from new agents).
 *
 * @param {object} user - User object with total_cancellations and total_tasks_posted
 * @returns {number|null} - Reliability as percentage (0-100), or null if insufficient data
 */
function computeAgentReliability(user) {
  const posted = user.total_tasks_posted || 0;
  if (posted < 5) return null; // Not enough data

  const cancellations = user.total_cancellations || 0;
  return Math.round((1 - cancellations / posted) * 100);
}

/**
 * Enrich an array of user objects with computed success_rate field.
 *
 * @param {object[]} users - Array of user objects with reputation fields
 * @returns {object[]} - Same array with success_rate attached to each user
 */
function enrichWithReputation(users) {
  return (users || []).map(user => ({
    ...user,
    success_rate: computeSuccessRate(user)
  }));
}

/**
 * Get full reputation summary for a single user.
 *
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {object|null} - Reputation summary with computed rates
 */
async function getReputationSummary(supabase, userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, type, total_tasks_completed, total_tasks_accepted, total_rejections, total_disputes_lost, total_disputes_filed, total_cancellations, total_tasks_posted, jobs_completed, rating')
    .eq('id', userId)
    .single();

  if (error || !user) return null;

  return {
    ...user,
    success_rate: computeSuccessRate(user),
    agent_reliability: user.type === 'agent' ? computeAgentReliability(user) : null
  };
}

module.exports = {
  incrementStat,
  computeSuccessRate,
  computeAgentReliability,
  enrichWithReputation,
  getReputationSummary
};
