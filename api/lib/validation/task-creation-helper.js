/**
 * Shared task validation helper for task creation endpoints.
 *
 * Consolidates the duplicated validation logic from:
 *   - POST /api/tasks
 *   - POST /api/tasks/create
 *   - MCP create_posting
 *
 * @module task-creation-helper
 */

const { validateTask } = require('./pipeline');

/**
 * Run the validation pipeline for task creation.
 *
 * @param {Object} supabase - Supabase client
 * @param {Object} payload - The raw request body / params (task payload)
 * @param {string} agentId - The authenticated user's ID
 * @returns {Promise<{ proceed: boolean, flagged: boolean, errorResponse: Object|null }>}
 *   - proceed=true: validation passed (or no task_type_id), safe to create
 *   - proceed=false: validation failed, caller should return res.status(422).json(errorResponse)
 *   - flagged=true: task should be created with status 'pending_review'
 */
async function runTaskValidation(supabase, payload, agentId) {
  const taskTypeId = payload.task_type_id;
  if (!taskTypeId) {
    return { proceed: true, flagged: false, errorResponse: null };
  }

  try {
    const validationPayload = {
      ...payload,
      budget_usd: payload.budget_usd || payload.budget,
    };
    const result = await validateTask(supabase, validationPayload, {
      dryRun: false,
      agentId,
    });

    if (!result.valid) {
      return {
        proceed: false,
        flagged: false,
        errorResponse: {
          status: 'validation_failed',
          error_count: result.errors.length,
          errors: result.errors,
          warnings: result.warnings,
          task_type_schema_url: result.task_type_schema_url,
        },
      };
    }

    return { proceed: true, flagged: !!result.flagged, errorResponse: null };
  } catch (err) {
    // Don't block task creation if validation service itself errors
    console.error('[Validation] Pipeline error:', err.message);
    return { proceed: true, flagged: false, errorResponse: null };
  }
}

module.exports = { runTaskValidation };
