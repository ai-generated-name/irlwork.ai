/**
 * Reliability Score Service
 *
 * Calculates a platform-generated 0-100 composite score for workers.
 * Used by agents making programmatic hiring decisions via the API/MCP.
 *
 * Score breakdown:
 *   avg_rating      40 pts  — average star rating (1-5) scaled to 0-40
 *   completion_rate 30 pts  — tasks_completed / tasks_accepted
 *   clean_record    20 pts  — penalises cancellations, disputes lost, rejections
 *   recency         10 pts  — active within last 30 days = 10, else 5
 *
 * Returns null if the worker has fewer than 3 completed tasks (not enough data).
 */

const MIN_TASKS_FOR_SCORE = 3;
const RECENCY_WINDOW_DAYS = 30;

/**
 * Calculate a reliability score from raw user stats.
 * Pure function — no DB calls.
 *
 * @param {object} user - User row with reputation fields
 * @returns {number|null} 0-100 score, or null if insufficient data
 */
function calculateReliabilityScore(user) {
  const completed = user.total_tasks_completed || 0;

  if (completed < MIN_TASKS_FOR_SCORE) return null;

  const accepted   = Math.max(user.total_tasks_accepted || 0, completed); // accepted >= completed
  const rating     = parseFloat(user.rating) || 0;
  const cancelRate = user.total_cancellations || 0;
  const disputes   = user.total_disputes_lost || 0;
  const rejections = user.total_rejections || 0;

  // Component 1: avg rating (0–40)
  const ratingScore = (rating / 5.0) * 40;

  // Component 2: completion rate (0–30)
  const completionRate = completed / accepted;
  const completionScore = completionRate * 30;

  // Component 3: clean record (0–20) — penalise negative events
  const cleanRecord = Math.max(0, 20 - (cancelRate * 3) - (disputes * 5) - (rejections * 2));

  // Component 4: recency (5 or 10)
  let recencyScore = 5;
  if (user.last_active_at) {
    const daysSinceActive = (Date.now() - new Date(user.last_active_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActive <= RECENCY_WINDOW_DAYS) recencyScore = 10;
  }

  const total = ratingScore + completionScore + cleanRecord + recencyScore;
  return Math.min(100, Math.round(total));
}

/**
 * Recalculate and persist a worker's reliability score.
 * Call this after any event that changes reputation stats:
 *   - rating submitted (after updateUserRating)
 *   - task completed (after releasePaymentToPending)
 *   - task cancelled (cancel endpoint)
 *   - proof rejected (reject endpoint)
 *   - dispute resolved (admin dispute resolution)
 *
 * @param {string} userId
 * @param {object} supabase - Supabase client (service role)
 */
async function updateReliabilityScore(userId, supabase) {
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      rating,
      total_tasks_completed,
      total_tasks_accepted,
      total_cancellations,
      total_rejections,
      total_disputes_lost,
      last_active_at
    `)
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.error(`[Reliability] Failed to fetch user ${userId}:`, error?.message);
    return;
  }

  const score = calculateReliabilityScore(user);

  const { error: updateError } = await supabase
    .from('users')
    .update({ reliability_score: score })
    .eq('id', userId);

  if (updateError) {
    console.error(`[Reliability] Failed to update score for ${userId}:`, updateError.message);
  }
}

module.exports = { calculateReliabilityScore, updateReliabilityScore };
