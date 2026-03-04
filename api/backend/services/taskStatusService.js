/**
 * Task Status Service
 *
 * Manages the task status state machine — valid transitions,
 * validation, and atomic status updates.
 *
 * Usage:
 *   const { VALID_STATUS_TRANSITIONS, validateStatusTransition, TERMINAL_STATUSES } = require('./services/taskStatusService');
 */

/**
 * Valid status transitions for the task lifecycle.
 *
 * State machine:
 *   open → pending_acceptance (Stripe path: agent assigns, human reviews)
 *   open → assigned (USDC/legacy path: agent assigns directly)
 *   open → expired (TTL expiry, no applicants)
 *   open → cancelled (agent cancels before any assignment)
 *
 *   pending_acceptance → assigned (human accepts offer)
 *   pending_acceptance → open (human declines offer)
 *   pending_acceptance → cancelled (agent cancels before human accepts)
 *
 *   assigned → in_progress (human starts work, escrow captured)
 *   assigned → cancelled (agent cancels before work begins)
 *
 *   in_progress → pending_review (human submits proof)
 *   in_progress → disputed (either party disputes)
 *
 *   pending_review → approved (agent approves proof)
 *   pending_review → in_progress (agent rejects proof, revision requested — max 2)
 *   pending_review → disputed (either party disputes)
 *
 *   approved → paid (payment released after 48h clearing)
 *
 *   disputed → approved (dispute resolved in worker's favor)
 *   disputed → cancelled (dispute resolved in agent's favor — full refund)
 *   disputed → paid (dispute resolved — partial or full payment to worker)
 *
 *   paid → (terminal)
 *   expired → (terminal)
 *   cancelled → (terminal)
 */
const VALID_STATUS_TRANSITIONS = {
  open: ['pending_acceptance', 'assigned', 'expired', 'cancelled'],
  pending_acceptance: ['assigned', 'open', 'cancelled'],
  assigned: ['in_progress', 'cancelled', 'open'],        // 'open' = worker withdrawal (task reopens)
  in_progress: ['pending_review', 'disputed', 'open'],   // 'open' = worker withdrawal (task reopens)
  pending_review: ['approved', 'in_progress', 'disputed'],
  approved: ['paid'],
  disputed: ['approved', 'cancelled', 'paid', 'pending_review'],  // 'pending_review' = partial dispute resolution
  paid: [],
  expired: [],
  cancelled: [],
};

const TERMINAL_STATUSES = ['paid', 'expired', 'cancelled'];

const DISPUTABLE_STATUSES = ['in_progress', 'pending_review'];

const PRE_WORK_STATUSES = ['open', 'pending_acceptance', 'assigned'];

/**
 * Validate a status transition.
 * @param {string} from - Current status
 * @param {string} to - Desired new status
 * @returns {{ valid: boolean, error?: string }}
 */
function validateStatusTransition(from, to) {
  if (!VALID_STATUS_TRANSITIONS[from]) {
    return { valid: false, error: `Unknown current status: ${from}` };
  }

  if (!VALID_STATUS_TRANSITIONS[from].includes(to)) {
    return {
      valid: false,
      error: `Invalid status transition from '${from}' to '${to}'. Valid transitions from '${from}': ${VALID_STATUS_TRANSITIONS[from].join(', ') || '(none — terminal state)'}`
    };
  }

  return { valid: true };
}

/**
 * Check if a status is terminal (no further transitions possible).
 * @param {string} status
 * @returns {boolean}
 */
function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Check if a task can be cancelled from its current status.
 * Only pre-work statuses allow cancellation.
 * @param {string} status
 * @returns {boolean}
 */
function isCancellable(status) {
  return PRE_WORK_STATUSES.includes(status);
}

/**
 * Check if a task can be disputed from its current status.
 * @param {string} status
 * @returns {boolean}
 */
function isDisputable(status) {
  return DISPUTABLE_STATUSES.includes(status);
}

module.exports = {
  VALID_STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
  DISPUTABLE_STATUSES,
  PRE_WORK_STATUSES,
  validateStatusTransition,
  isTerminalStatus,
  isCancellable,
  isDisputable
};
