/**
 * Private Data Release Service
 *
 * Handles decryption and access control for private task fields
 * (private_address, private_notes, private_contact).
 *
 * Private fields are only released to:
 *   - The task's agent (creator)
 *   - The assigned worker(s), once task is in an appropriate status
 */

const { decrypt, isEncrypted } = require('./encryption');

const ALLOWED_STATUSES_FOR_WORKER = ['assigned', 'in_progress', 'pending_review', 'completed', 'pending_acceptance'];

/**
 * Release private data for a task.
 *
 * @param {Object} supabase - Supabase client
 * @param {string} taskId - Task ID
 * @param {string} requestingUserId - The user requesting private data
 * @returns {Promise<{private_address: string|null, private_notes: string|null, private_contact: string|null}>}
 */
async function releasePrivateData(supabase, taskId, requestingUserId) {
  // 1. Fetch task with private fields
  const { data: task, error } = await supabase
    .from('tasks')
    .select('id, agent_id, human_id, human_ids, status, private_address, private_notes, private_contact')
    .eq('id', taskId)
    .single();

  if (error || !task) {
    throw new Error('Task not found');
  }

  // 2. Authorization check
  const isAgent = task.agent_id === requestingUserId;
  const isAssignedHuman = task.human_id === requestingUserId ||
    (Array.isArray(task.human_ids) && task.human_ids.includes(requestingUserId));

  if (!isAgent && !isAssignedHuman) {
    throw new Error('Not authorized to view private task data');
  }

  // Workers can only see private data in appropriate statuses
  if (!isAgent && !ALLOWED_STATUSES_FOR_WORKER.includes(task.status)) {
    throw new Error('Private data is only available after task assignment');
  }

  // 3. Decrypt fields
  const result = {
    private_address: null,
    private_notes: null,
    private_contact: null,
  };

  if (task.private_address) {
    result.private_address = isEncrypted(task.private_address)
      ? decrypt(task.private_address)
      : task.private_address;
  }

  if (task.private_notes) {
    result.private_notes = isEncrypted(task.private_notes)
      ? decrypt(task.private_notes)
      : task.private_notes;
  }

  if (task.private_contact) {
    result.private_contact = isEncrypted(task.private_contact)
      ? decrypt(task.private_contact)
      : task.private_contact;
  }

  return result;
}

module.exports = { releasePrivateData, ALLOWED_STATUSES_FOR_WORKER };
