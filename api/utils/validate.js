/**
 * Shared Validation Utilities
 *
 * Used by both REST endpoints and MCP handlers to ensure
 * identical validation rules across all API surfaces.
 *
 * Usage:
 *   const { validateString, validateNumber, validateTaskInput, validateMessageInput } = require('./utils/validate');
 */

/**
 * Validate a string field.
 * @returns {string|null} Error message, or null if valid
 */
function validateString(value, name, { required = false, minLength = 0, maxLength = Infinity } = {}) {
  if (required && (!value || typeof value !== 'string' || value.trim().length === 0)) {
    return `${name} is required`;
  }
  if (value !== undefined && value !== null && typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.length < minLength) {
      return `${name} must be at least ${minLength} characters`;
    }
    if (value.length > maxLength) {
      return `${name} must be ${maxLength} characters or less`;
    }
  }
  return null;
}

/**
 * Validate a numeric field.
 * @returns {string|null} Error message, or null if valid
 */
function validateNumber(value, name, { required = false, min = -Infinity, max = Infinity } = {}) {
  if (required && (value === undefined || value === null)) {
    return `${name} is required`;
  }
  if (value !== undefined && value !== null) {
    const num = typeof value === 'string' ? Number(value) : value;
    if (typeof num !== 'number' || isNaN(num)) {
      return `${name} must be a number`;
    }
    if (num < min) return `${name} must be at least ${min}`;
    if (num > max) return `${name} must be at most ${max}`;
  }
  return null;
}

/**
 * Validate a UUID field.
 * @returns {string|null} Error message, or null if valid
 */
function validateUUID(value, name, { required = false } = {}) {
  if (required && !value) {
    return `${name} is required`;
  }
  if (value && typeof value === 'string') {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return `${name} must be a valid UUID`;
    }
  }
  return null;
}

// Valid task categories
const VALID_CATEGORIES = [
  'delivery', 'pickup', 'errands', 'dog_walking', 'pet_sitting',
  'cleaning', 'moving', 'assembly', 'wait_line', 'stand_billboard',
  'event_staff', 'tech_setup', 'grocery', 'photography', 'general',
  'other'
];

/**
 * Validate task creation input.
 * Used by both REST POST /api/tasks and MCP create_posting.
 * @returns {{ errors: string[] }} Array of validation errors (empty if valid)
 */
function validateTaskInput(params) {
  const errors = [];
  const e = (msg) => { if (msg) errors.push(msg); };

  e(validateString(params.title, 'Title', { required: true, minLength: 1, maxLength: 200 }));
  e(validateString(params.description, 'Description', { maxLength: 5000 }));
  e(validateString(params.requirements, 'Requirements', { maxLength: 3000 }));
  e(validateString(params.location, 'Location', { maxLength: 300 }));
  e(validateString(params.instructions, 'Instructions', { maxLength: 10000 }));

  // Budget validation
  const budget = params.budget || params.budget_usd || params.budget_max;
  if (budget !== undefined && budget !== null) {
    e(validateNumber(budget, 'Budget', { min: 5, max: 100000 }));
  }

  // Duration validation
  if (params.duration_hours !== undefined && params.duration_hours !== null) {
    e(validateNumber(params.duration_hours, 'Duration (hours)', { min: 0.1, max: 720 }));
  }

  // Category validation
  if (params.category && !VALID_CATEGORIES.includes(params.category)) {
    errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  // Quantity validation
  if (params.quantity !== undefined) {
    e(validateNumber(params.quantity, 'Quantity', { min: 1, max: 100 }));
  }

  // Private field length limits
  e(validateString(params.private_address, 'Private address', { maxLength: 500 }));
  e(validateString(params.private_notes, 'Private notes', { maxLength: 2000 }));
  e(validateString(params.private_contact, 'Private contact', { maxLength: 200 }));

  return { errors: errors.filter(Boolean) };
}

/**
 * Validate message input.
 * Used by both REST POST /api/messages and MCP send_message.
 * @returns {{ errors: string[] }}
 */
function validateMessageInput(params) {
  const errors = [];
  const e = (msg) => { if (msg) errors.push(msg); };

  e(validateString(params.content, 'Content', { required: true, minLength: 1, maxLength: 10000 }));

  if (params.attachments) {
    if (!Array.isArray(params.attachments)) {
      errors.push('Attachments must be an array');
    } else if (params.attachments.length > 5) {
      errors.push('Maximum 5 attachments allowed');
    } else {
      for (let i = 0; i < params.attachments.length; i++) {
        const att = params.attachments[i];
        if (!att.url) errors.push(`Attachment ${i + 1} must have a url`);
        if (!att.filename) errors.push(`Attachment ${i + 1} must have a filename`);
      }
    }
  }

  return { errors: errors.filter(Boolean) };
}

/**
 * Validate profile update input.
 * @returns {{ errors: string[] }}
 */
function validateProfileInput(params) {
  const errors = [];
  const e = (msg) => { if (msg) errors.push(msg); };

  e(validateString(params.name, 'Name', { maxLength: 100 }));
  e(validateString(params.bio, 'Bio', { maxLength: 1000 }));
  e(validateString(params.headline, 'Headline', { maxLength: 200 }));
  e(validateString(params.city, 'City', { maxLength: 100 }));
  e(validateString(params.state, 'State', { maxLength: 100 }));

  if (params.hourly_rate !== undefined) {
    e(validateNumber(params.hourly_rate, 'Hourly rate', { min: 0, max: 1000 }));
  }

  return { errors: errors.filter(Boolean) };
}

/**
 * Validate review/rating input.
 * @returns {{ errors: string[] }}
 */
function validateRatingInput(params) {
  const errors = [];
  const e = (msg) => { if (msg) errors.push(msg); };

  e(validateNumber(params.rating_score || params.rating, 'Rating', { required: true, min: 1, max: 5 }));
  e(validateString(params.comment, 'Comment', { maxLength: 2000 }));

  return { errors: errors.filter(Boolean) };
}

/**
 * Validate dispute input.
 * @returns {{ errors: string[] }}
 */
function validateDisputeInput(params) {
  const errors = [];
  const e = (msg) => { if (msg) errors.push(msg); };

  e(validateString(params.reason, 'Reason', { required: true, minLength: 10, maxLength: 2000 }));

  const validCategories = ['quality_issue', 'incomplete_work', 'communication', 'fraud', 'other'];
  if (params.category && !validCategories.includes(params.category)) {
    errors.push(`Dispute category must be one of: ${validCategories.join(', ')}`);
  }

  if (params.evidence_urls) {
    if (!Array.isArray(params.evidence_urls)) {
      errors.push('Evidence URLs must be an array');
    } else if (params.evidence_urls.length > 10) {
      errors.push('Maximum 10 evidence URLs allowed');
    }
  }

  return { errors: errors.filter(Boolean) };
}

/**
 * Validate rejection input.
 * @returns {{ errors: string[] }}
 */
function validateRejectionInput(params) {
  const errors = [];
  const e = (msg) => { if (msg) errors.push(msg); };

  e(validateString(params.feedback, 'Feedback', { required: true, minLength: 10, maxLength: 2000 }));

  return { errors: errors.filter(Boolean) };
}

module.exports = {
  validateString,
  validateNumber,
  validateUUID,
  validateTaskInput,
  validateMessageInput,
  validateProfileInput,
  validateRatingInput,
  validateDisputeInput,
  validateRejectionInput,
  VALID_CATEGORIES
};
