/**
 * PII Scanner (Gate 2)
 *
 * Scans public-facing text fields for personally identifiable information.
 * PII in public fields is a HARD REJECTION — returns errors (not warnings).
 * PII in private fields (private_address, private_notes, private_contact) is allowed.
 */

const { makeError, makeResult } = require('./types');
const EC = require('./error-codes');
const { PII_PATTERNS, PUBLIC_FIELDS_TO_SCAN } = require('../privacy/pii-patterns');

/**
 * @param {Object} input - The task payload
 * @param {Object|null} taskTypeConfig - The task type config (unused by this validator)
 * @returns {import('./types').ValidationResult}
 */
function scanForPII(input, taskTypeConfig) {
  const errors = [];
  const warnings = [];

  for (const field of PUBLIC_FIELDS_TO_SCAN) {
    let value = input[field];
    if (!value) continue;

    // Handle arrays (e.g. requirements might be an array of strings)
    if (Array.isArray(value)) {
      value = value.join(' ');
    }

    if (typeof value !== 'string') continue;

    for (const pattern of PII_PATTERNS) {
      // Reset regex lastIndex for global patterns
      pattern.regex.lastIndex = 0;

      let match;
      while ((match = pattern.regex.exec(value)) !== null) {
        const matchedText = match[0];

        // Run false positive check if defined
        if (pattern.falsePositiveCheck && !pattern.falsePositiveCheck(matchedText, value)) {
          continue;
        }

        const masked = pattern.mask ? pattern.mask(matchedText) : matchedText.substring(0, 5) + '***';

        errors.push(makeError(field, EC.PII_DETECTED,
          `${field} contains what appears to be a ${pattern.label}. Remove PII from public fields.`,
          {
            detected: masked,
            suggestion: pattern.suggestion,
          }
        ));

        // Only report the first match per pattern per field to avoid noise
        break;
      }
    }
  }

  return makeResult(errors, warnings);
}

module.exports = { scanForPII };
