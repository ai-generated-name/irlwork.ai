/**
 * Task Validation Routes
 *
 * POST /api/tasks/validate    - Dry-run validation (no task created)
 * GET  /api/tasks/:id/private - Private data release for assigned workers
 *
 * Extracted from server.js to keep the diff manageable.
 */

const express = require('express');
const { validateTask, flushTaskTypeCache } = require('../lib/validation/pipeline');
const { releasePrivateData } = require('../services/privateDataService');

/**
 * Rate Limiting: In-memory only.
 *
 * LIMITATIONS:
 *   - State resets on server restart (all rate limits cleared)
 *   - Does NOT work across multiple server instances / load balancer
 *   - No cleanup of stale entries (memory leak under sustained unique users)
 *
 * TODO: Migrate to Redis (or Supabase row-level counters) when:
 *   - Running >1 API instance behind a load balancer
 *   - Observing rate limit bypass via server restarts
 *   - Memory usage grows beyond acceptable limits
 *
 * For Redis migration, use a sorted set per user with EXPIRE matching the window.
 */

// Rate limiting for private data endpoint: 10 req/min per user
const privateDataRateLimit = new Map();
const PRIVATE_DATA_RATE_LIMIT = 10;
const PRIVATE_DATA_RATE_WINDOW = 60 * 1000; // 1 minute

function checkPrivateDataRateLimit(userId) {
  const now = Date.now();
  const userRequests = privateDataRateLimit.get(userId);

  if (!userRequests || now - userRequests.windowStart > PRIVATE_DATA_RATE_WINDOW) {
    privateDataRateLimit.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (userRequests.count >= PRIVATE_DATA_RATE_LIMIT) {
    return false;
  }

  userRequests.count += 1;
  return true;
}

// Rate limiting for validate endpoint: 10 req/min per agent
const validateRateLimit = new Map();
const VALIDATE_RATE_LIMIT = 10;
const VALIDATE_RATE_WINDOW = 60 * 1000;

function checkValidateRateLimit(userId) {
  const now = Date.now();
  const userRequests = validateRateLimit.get(userId);

  if (!userRequests || now - userRequests.windowStart > VALIDATE_RATE_WINDOW) {
    validateRateLimit.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (userRequests.count >= VALIDATE_RATE_LIMIT) {
    return false;
  }

  userRequests.count += 1;
  return true;
}

function initTaskValidationRoutes(supabase, getUserByToken) {
  const router = express.Router();

  // POST /api/tasks/validate - Dry-run validation
  router.post('/validate', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const user = await getUserByToken(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    // Rate limit
    if (!checkValidateRateLimit(user.id)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Maximum 10 validation requests per minute. Please wait before retrying.',
      });
    }

    try {
      const result = await validateTask(supabase, req.body, {
        dryRun: true,
        agentId: user.id,
      });

      if (result.valid) {
        return res.status(200).json({
          status: 'valid',
          task_type: req.body.task_type || req.body.task_type_id,
          warnings: result.warnings,
          flagged: result.flagged,
        });
      }

      return res.status(422).json({
        status: 'validation_failed',
        error_count: result.errors.length,
        errors: result.errors,
        warnings: result.warnings,
        task_type_schema_url: result.task_type_schema_url,
      });
    } catch (err) {
      console.error('[Validate] Pipeline error:', err.message);
      return res.status(500).json({ error: 'Validation service error' });
    }
  });

  // GET /api/tasks/:id/private - Private data release
  router.get('/:id/private', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const user = await getUserByToken(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    // Rate limit per user
    if (!checkPrivateDataRateLimit(user.id)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Maximum 10 private data requests per minute.',
      });
    }

    try {
      const privateData = await releasePrivateData(supabase, req.params.id, user.id);

      // Log access for audit trail
      try {
        await supabase.from('task_validation_log').insert({
          agent_id: user.id,
          task_type_id: null,
          payload_hash: `private_access:${req.params.id}`,
          validation_result: 'passed',
          errors: [],
          policy_flags: [{ action: 'private_data_accessed', task_id: req.params.id }],
          attempt_number: 1,
          dry_run: false,
        });
      } catch (logErr) {
        // Don't fail the request if logging fails
        console.error('[Private] Audit log error:', logErr.message);
      }

      return res.json({
        task_id: req.params.id,
        ...privateData,
        note: 'Private fields are decrypted for authorized access. Do not share publicly.',
      });
    } catch (err) {
      if (err.message === 'Task not found') {
        return res.status(404).json({ error: 'Task not found' });
      }
      if (err.message.includes('Not authorized') || err.message.includes('only available')) {
        return res.status(403).json({ error: err.message });
      }
      console.error('[Private] Error releasing data:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve private data' });
    }
  });

  return router;
}

module.exports = initTaskValidationRoutes;
