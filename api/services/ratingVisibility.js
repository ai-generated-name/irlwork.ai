/**
 * Rating Visibility Service
 *
 * Automatically makes ratings visible after 72 hours if both parties haven't rated yet.
 * This ensures that ratings don't stay hidden indefinitely when one party doesn't submit a rating.
 *
 * Runs periodically to check for ratings that:
 * 1. Are older than 72 hours
 * 2. Still have visible_at = null
 * 3. Are the only rating for their task (i.e., the other party never rated)
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../lib/logger').child({ service: 'rating_visibility' });
const { captureException } = require('../lib/sentry');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Check interval: 1 hour by default (can be overridden by env var)
const CHECK_INTERVAL_MS = parseInt(process.env.RATING_VISIBILITY_INTERVAL_MS || '3600000'); // 1 hour

// Visibility threshold: 72 hours (can be overridden by env var)
const VISIBILITY_THRESHOLD_MS = parseInt(process.env.RATING_VISIBILITY_THRESHOLD_MS || '259200000'); // 72 hours

let supabase = null;
let intervalId = null;

/**
 * Initialize Supabase client
 */
function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[RATING_VISIBILITY] Missing Supabase configuration');
    return false;
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return true;
}

/**
 * Check for ratings that should become visible after 72 hours
 */
async function checkAndUpdateVisibility() {
  if (!supabase && !initSupabase()) {
    console.error('[RATING_VISIBILITY] Cannot check ratings - Supabase not configured');
    return { updated: 0, error: 'Supabase not configured' };
  }

  try {
    const now = new Date();
    const threshold = new Date(now.getTime() - VISIBILITY_THRESHOLD_MS);

    console.log('[RATING_VISIBILITY] Checking for ratings older than', threshold.toISOString());

    // Find ratings that:
    // 1. Are older than 72 hours (created_at < threshold)
    // 2. Are still hidden (visible_at IS NULL)
    const { data: staleRatings, error: fetchError } = await supabase
      .from('ratings')
      .select('id, task_id, created_at, rater_id, ratee_id')
      .is('visible_at', null)
      .lt('created_at', threshold.toISOString());

    if (fetchError) {
      console.error('[RATING_VISIBILITY] Error fetching stale ratings:', fetchError);
      return { updated: 0, error: fetchError.message };
    }

    if (!staleRatings || staleRatings.length === 0) {
      console.log('[RATING_VISIBILITY] No stale ratings found');
      return { updated: 0 };
    }

    console.log(`[RATING_VISIBILITY] Found ${staleRatings.length} stale rating(s)`);

    // Group ratings by task_id to check if both parties have rated
    const taskRatingCounts = {};
    for (const rating of staleRatings) {
      if (!taskRatingCounts[rating.task_id]) {
        const { count } = await supabase
          .from('ratings')
          .select('*', { count: 'exact', head: true })
          .eq('task_id', rating.task_id);

        taskRatingCounts[rating.task_id] = count || 0;
      }
    }

    // All stale ratings (>72h with no visible_at) should become visible
    const ratingsToUpdate = staleRatings;

    if (ratingsToUpdate.length === 0) {
      console.log('[RATING_VISIBILITY] No ratings need visibility updates');
      return { updated: 0 };
    }

    // Update all stale ratings to be visible
    const ratingIds = ratingsToUpdate.map(r => r.id);
    const { error: updateError } = await supabase
      .from('ratings')
      .update({ visible_at: now.toISOString() })
      .in('id', ratingIds);

    if (updateError) {
      console.error('[RATING_VISIBILITY] Error updating ratings:', updateError);
      return { updated: 0, error: updateError.message };
    }

    console.log(`[RATING_VISIBILITY] Made ${ratingsToUpdate.length} rating(s) visible`);

    // Update user ratings for affected users
    const affectedUsers = new Set(ratingsToUpdate.map(r => r.ratee_id));
    for (const userId of affectedUsers) {
      await updateUserRating(userId);
    }

    // Send notifications to users about newly visible ratings
    for (const rating of ratingsToUpdate) {
      const taskRatingCount = taskRatingCounts[rating.task_id];
      const bothRated = taskRatingCount === 2;

      await createNotification(
        rating.ratee_id,
        'rating_visible',
        'Rating Now Visible',
        bothRated
          ? `Ratings for task #${rating.task_id.substring(0, 8)} are now visible. Both parties have rated.`
          : `A rating for task #${rating.task_id.substring(0, 8)} is now visible after 72 hours.`,
        `/dashboard`
      );
    }

    return {
      updated: ratingsToUpdate.length,
      details: ratingsToUpdate.map(r => ({
        task_id: r.task_id,
        rater_id: r.rater_id,
        ratee_id: r.ratee_id,
        created_at: r.created_at
      }))
    };
  } catch (error) {
    logger.error({ err: error }, 'Rating visibility check failed');
    captureException(error, { tags: { service: 'rating_visibility' } });
    return { updated: 0, error: error.message };
  }
}

/**
 * Update user's aggregate rating based on all visible ratings
 */
async function updateUserRating(userId) {
  if (!supabase) return;

  try {
    const { data: ratings } = await supabase
      .from('ratings')
      .select('rating_score')
      .eq('ratee_id', userId)
      .not('visible_at', 'is', null)
      .lte('visible_at', new Date().toISOString());

    if (!ratings || ratings.length === 0) return;

    const averageRating = ratings.reduce((sum, r) => sum + r.rating_score, 0) / ratings.length;

    await supabase
      .from('users')
      .update({ rating: averageRating.toFixed(2) })
      .eq('id', userId);

    console.log(`[RATING_VISIBILITY] Updated user ${userId} rating to ${averageRating.toFixed(2)}`);
  } catch (error) {
    console.error('[RATING_VISIBILITY] Error updating user rating:', error);
  }
}

/**
 * Create notification (imported pattern from server.js)
 */
async function createNotification(userId, type, title, message, link) {
  if (!supabase) return;

  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      link,
      read: false,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[RATING_VISIBILITY] Error creating notification:', error);
  }
}

/**
 * Start the periodic check
 */
function start() {
  if (intervalId) {
    console.log('[RATING_VISIBILITY] Service already running');
    return;
  }

  if (!initSupabase()) {
    console.error('[RATING_VISIBILITY] Cannot start - Supabase not configured');
    return;
  }

  console.log(`[RATING_VISIBILITY] Starting service (check every ${CHECK_INTERVAL_MS / 60000} minutes, threshold: ${VISIBILITY_THRESHOLD_MS / 3600000} hours)`);

  // Run immediately on start
  checkAndUpdateVisibility();

  // Then run periodically
  intervalId = setInterval(checkAndUpdateVisibility, CHECK_INTERVAL_MS);
}

/**
 * Stop the periodic check
 */
function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[RATING_VISIBILITY] Service stopped');
  }
}

/**
 * Check if service is running
 */
function isActive() {
  return intervalId !== null;
}

/**
 * Manually trigger a check (for testing or admin endpoints)
 */
async function checkNow() {
  console.log('[RATING_VISIBILITY] Manual check triggered');
  return await checkAndUpdateVisibility();
}

module.exports = {
  start,
  stop,
  isActive,
  checkNow,
  CHECK_INTERVAL_MS,
  VISIBILITY_THRESHOLD_MS
};
