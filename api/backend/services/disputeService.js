/**
 * Dispute Service
 *
 * Shared dispute opening and resolution logic.
 * Both `/api/tasks/:id/dispute` and `/api/disputes` endpoints
 * should use these shared helpers.
 *
 * NOTE: This service is currently a reference implementation.
 * The actual dispute logic is still inline in server.js.
 * During full ARCH-1 extraction, server.js should import from here.
 *
 * Usage:
 *   const { DISPUTABLE_STATUSES, buildDisputeRecord } = require('./services/disputeService');
 */

const { v4: uuidv4 } = require('uuid');

const DISPUTABLE_STATUSES = ['in_progress', 'pending_review'];

/**
 * Build a dispute record for insertion.
 * @param {object} params
 * @returns {object} - Dispute record ready for Supabase insert
 */
function buildDisputeRecord({ taskId, reason, filedBy, filedAgainst }) {
  return {
    id: uuidv4(),
    task_id: taskId,
    reason,
    filed_by: filedBy,
    filed_against: filedAgainst,
    status: 'open',
    created_at: new Date().toISOString()
  };
}

/**
 * Determine the dispute parties based on who is filing.
 * @param {object} task - Task with agent_id and human_id
 * @param {string} filingUserId - ID of the user opening the dispute
 * @returns {{ filedBy: string, filedAgainst: string }}
 */
function determineDisputeParties(task, filingUserId) {
  const filedBy = filingUserId;
  const filedAgainst = filingUserId === task.agent_id ? task.human_id : task.agent_id;
  return { filedBy, filedAgainst };
}

module.exports = {
  DISPUTABLE_STATUSES,
  buildDisputeRecord,
  determineDisputeParties
};
