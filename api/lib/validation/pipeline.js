/**
 * Validation Pipeline Orchestrator
 *
 * Central entry point that:
 *   1. Loads task type config from registry (10s cache, admin-flushable)
 *   2. Runs ALL 4 validators (no short-circuit)
 *   3. Hashes payload for dedup tracking
 *   4. Logs to task_validation_log
 *   5. Tracks consecutive failures — 5 consecutive = RATE_LIMIT_EXCEEDED
 *   6. Returns aggregated result
 */

const crypto = require('crypto');
const { validateSchema } = require('./schema-validator');
const { scanForPII } = require('./pii-scanner');
const { scanProhibitedContent } = require('./content-policy');
const { validateBudget } = require('./budget-validator');
const { makeError } = require('./types');
const EC = require('./error-codes');

// --- Task type config cache (10s TTL) ---
// Supabase is local — aggressive caching unnecessary at current scale.
// Admin cache-bust: POST /api/admin/flush-task-type-cache
const taskTypeCache = new Map(); // id -> { config, loadedAt }
const CACHE_TTL_MS = 10 * 1000; // 10 seconds

function flushTaskTypeCache() {
  taskTypeCache.clear();
}

async function getTaskTypeConfig(supabase, taskTypeId) {
  if (!taskTypeId) return null;

  const cached = taskTypeCache.get(taskTypeId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.config;
  }

  const { data, error } = await supabase
    .from('task_type_registry')
    .select('*')
    .eq('id', taskTypeId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    // Cache the miss briefly (5s) to avoid hammering DB for invalid types
    taskTypeCache.set(taskTypeId, { config: null, loadedAt: Date.now() - CACHE_TTL_MS + 5000 });
    return null;
  }

  taskTypeCache.set(taskTypeId, { config: data, loadedAt: Date.now() });
  return data;
}

/**
 * Consecutive failure tracking by agentId (NOT by payload hash).
 *
 * Tracks how many consecutive validation failures an agent has made,
 * regardless of whether the payload changed between attempts. The hash
 * stored in `lastPayloadHash` is for observability/logging only.
 *
 * Resets on ANY successful validation (not just successful task creation).
 * After MAX_CONSECUTIVE_FAILURES, returns RATE_LIMIT_EXCEEDED.
 */
const failureTracker = new Map(); // agentId -> { count, lastPayloadHash }
const MAX_CONSECUTIVE_FAILURES = 5;

function trackFailure(agentId, payloadHash) {
  const existing = failureTracker.get(agentId) || { count: 0, lastPayloadHash: null };
  existing.count += 1;
  existing.lastPayloadHash = payloadHash;
  failureTracker.set(agentId, existing);
  return existing.count;
}

function resetFailures(agentId) {
  failureTracker.delete(agentId);
}

function getFailureCount(agentId) {
  const existing = failureTracker.get(agentId);
  return existing ? existing.count : 0;
}

/**
 * Hash the entire task payload for dedup/audit logging.
 *
 * IMPORTANT: This hash is used ONLY for dedup detection in task_validation_log
 * (i.e., "did the agent submit the exact same payload again?"). It is NOT used
 * for failure tracking. The consecutive failure counter (trackFailure/getFailureCount)
 * tracks by agentId alone — even if the agent changes the payload between attempts,
 * the counter still increments.
 *
 * Changing ANY field (even fixing one error) produces a completely new hash.
 * This is intentional — each distinct payload gets its own log row.
 *
 * @param {Object} input - The raw task payload
 * @returns {string} SHA-256 hex digest
 */
function hashPayload(input) {
  const sorted = JSON.stringify(input, Object.keys(input).sort());
  return crypto.createHash('sha256').update(sorted).digest('hex');
}

// --- Logging ---
async function logValidation(supabase, { agentId, taskTypeId, payloadHash, result, errors, policyFlags, attemptNumber, dryRun }) {
  try {
    await supabase.from('task_validation_log').insert({
      agent_id: agentId || null,
      task_type_id: taskTypeId || null,
      payload_hash: payloadHash,
      validation_result: result,
      errors: errors || [],
      policy_flags: policyFlags || [],
      attempt_number: attemptNumber || 1,
      dry_run: !!dryRun,
    });
  } catch (err) {
    // Log failure shouldn't break validation
    console.error('[Validation] Failed to log validation attempt:', err.message);
  }
}

/**
 * Run the full validation pipeline.
 *
 * @param {Object} supabase - Supabase client
 * @param {Object} input - The task payload
 * @param {Object} options
 * @param {boolean} options.dryRun - If true, this is a validate-only call
 * @param {string} options.agentId - The agent's user ID
 * @returns {Promise<{valid: boolean, errors: Array, warnings: Array, flagged: boolean, task_type_schema_url?: string}>}
 */
async function validateTask(supabase, input, options = {}) {
  const { dryRun = false, agentId = null } = options;
  const taskTypeId = input.task_type || input.task_type_id;
  const payloadHash = hashPayload(input);

  // Check consecutive failure rate limit
  const failureCount = getFailureCount(agentId);
  if (failureCount >= MAX_CONSECUTIVE_FAILURES) {
    return {
      valid: false,
      errors: [makeError('_request', EC.RATE_LIMIT_EXCEEDED,
        `${MAX_CONSECUTIVE_FAILURES} consecutive validation failures. Please review the errors from previous attempts or escalate to a human user for clarification.`,
        { suggestion: 'Use GET /api/schemas/' + (taskTypeId || '') + ' to review the task type requirements, then fix all errors before retrying.' }
      )],
      warnings: [],
      flagged: false,
      task_type_schema_url: taskTypeId ? `/api/schemas/${taskTypeId}` : undefined,
    };
  }

  // 1. Load task type config
  let taskTypeConfig = null;
  if (taskTypeId) {
    taskTypeConfig = await getTaskTypeConfig(supabase, taskTypeId);
  }

  // 2. Run ALL validators (no short-circuit)
  const schemaResult = validateSchema(input, taskTypeConfig);
  const piiResult = scanForPII(input, taskTypeConfig);
  const contentResult = scanProhibitedContent(input, taskTypeConfig);
  const budgetResult = validateBudget(input, taskTypeConfig);

  // 3. Aggregate all errors and warnings
  const allErrors = [
    ...schemaResult.errors,
    ...piiResult.errors,
    ...contentResult.errors,
    ...budgetResult.errors,
  ];
  const allWarnings = [
    ...schemaResult.warnings,
    ...piiResult.warnings,
    ...contentResult.warnings,
    ...budgetResult.warnings,
  ];

  const valid = allErrors.length === 0;
  const flagged = contentResult.flagged || false;

  // 4. Track failures / reset on success
  if (valid) {
    resetFailures(agentId);
  } else {
    trackFailure(agentId, payloadHash);
  }

  // 5. Determine validation result status
  let resultStatus = 'passed';
  if (!valid) resultStatus = 'failed';
  else if (flagged) resultStatus = 'flagged_for_review';

  // 6. Log to task_validation_log
  const attemptNumber = valid ? 1 : getFailureCount(agentId);
  await logValidation(supabase, {
    agentId,
    taskTypeId,
    payloadHash,
    result: resultStatus,
    errors: allErrors,
    policyFlags: flagged ? allWarnings.filter(w => w.code === EC.PROHIBITED_CONTENT) : [],
    attemptNumber,
    dryRun,
  });

  return {
    valid,
    errors: allErrors,
    warnings: allWarnings,
    flagged,
    task_type_schema_url: taskTypeId ? `/api/schemas/${taskTypeId}` : undefined,
  };
}

module.exports = {
  validateTask,
  flushTaskTypeCache,
  getTaskTypeConfig,
  // Exported for testing
  hashPayload,
  resetFailures,
  getFailureCount,
  trackFailure,
  MAX_CONSECUTIVE_FAILURES,
};
