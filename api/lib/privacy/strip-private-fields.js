/**
 * Strip private/encrypted fields from a task object before sending to clients.
 * This is a critical security function — it prevents encrypted PII from leaking
 * into public API responses.
 *
 * @param {Object|null} task - The raw task row from Supabase
 * @returns {Object|null} A shallow copy with private_address, private_notes, private_contact removed
 */
function stripPrivateFields(task) {
  if (!task) return task;
  const cleaned = { ...task };
  delete cleaned.private_address;
  delete cleaned.private_notes;
  delete cleaned.private_contact;
  return cleaned;
}

module.exports = { stripPrivateFields };
