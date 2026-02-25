/**
 * Content Policy Scanner (Gate 3)
 *
 * Checks title and description against prohibited content rules:
 *   - Keyword matching with word boundaries (no substring matching)
 *   - Case-insensitive
 *   - Global prohibited list + per-task-type prohibited_keywords
 *   - Borderline cases → flagged_for_review (not rejected)
 */

const { makeError, makeResult } = require('./types');
const EC = require('./error-codes');

/**
 * PROHIBITED_KEYWORDS: exact word-boundary match triggers HARD REJECTION.
 *
 * These represent unambiguously illegal or harmful activities. A task containing
 * any of these keywords will fail validation with a PROHIBITED_CONTENT error
 * and will NOT be created.
 *
 * Criteria for adding to this list:
 *   - The term describes an activity that is illegal in most jurisdictions
 *   - There is no plausible legitimate task interpretation
 *   - False positive rate is near zero with word-boundary matching
 */
const PROHIBITED_KEYWORDS = [
  // Illegal drugs / controlled substances
  'cocaine', 'heroin', 'methamphetamine', 'meth', 'fentanyl', 'ecstasy', 'mdma',
  'lsd', 'crack cocaine', 'opium', 'ketamine', 'pcp', 'drug dealer', 'drug dealing',
  'marijuana delivery', 'weed delivery', 'drug mule', 'drug smuggling',

  // Weapons
  'firearm', 'gun purchase', 'buy a gun', 'sell a gun', 'ammunition', 'explosive',
  'bomb making', 'weapon manufacturing', 'silencer', 'suppressor',

  // Fraud / Identity theft
  'fake id', 'fake passport', 'fake license', 'counterfeit', 'forged document',
  'identity theft', 'credit card fraud', 'money laundering', 'wire fraud',
  'ponzi scheme', 'pyramid scheme', 'phishing',

  // Harassment / Stalking / Surveillance
  'stalk someone', 'follow someone', 'spy on', 'surveillance of', 'track someone',
  'intimidate', 'threaten', 'blackmail', 'extort', 'harass',
  'revenge porn', 'doxing', 'doxxing',

  // Adult / Sexual services
  'escort service', 'sexual services', 'sex work', 'prostitution',
  'adult massage', 'happy ending', 'sugar daddy', 'sugar baby',

  // Gambling
  'illegal gambling', 'gambling operation', 'underground casino',
  'sports betting operation', 'bookmaking',

  // Harm to people or animals
  'poison someone', 'hurt someone', 'assault', 'kidnap', 'kidnapping',
  'animal cruelty', 'animal fighting', 'dogfighting',

  // Cybercrime
  'hack into', 'break into account', 'crack password', 'ddos',
  'ransomware', 'malware', 'keylogger', 'unauthorized access',
  'stolen data', 'data breach', 'social engineering attack',
];

/**
 * FLAGGED_KEYWORDS: exact word-boundary match triggers SOFT FLAG for admin review.
 *
 * These are general terms that COULD be legitimate in context. Examples:
 *   - "knife" → kitchen knife sharpening task (legitimate)
 *   - "gun" → moving a gun safe (legitimate)
 *   - "background check" → tenant screening (legitimate)
 *
 * A task matching these keywords will be CREATED with status='pending_review'
 * and held until an admin approves it. The task poster receives a warning.
 *
 * Criteria for this list (vs PROHIBITED_KEYWORDS):
 *   - The term has common legitimate uses in task contexts
 *   - Outright rejection would produce too many false positives
 *   - Admin review is needed to determine intent
 */
const FLAGGED_KEYWORDS = [
  'weapon', 'gun', 'knife', 'blade',
  'drugs', 'pills', 'substances',
  'adult content', 'adult entertainment',
  'gambling', 'betting', 'casino',
  'investigation', 'private investigator',
  'background check',
];

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check text against a keyword list with word boundary matching.
 * Returns array of matched keywords.
 */
function matchKeywords(text, keywords) {
  const matches = [];
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
    if (regex.test(text)) {
      matches.push(keyword);
    }
  }
  return matches;
}

/**
 * @param {Object} input - The task payload
 * @param {Object|null} taskTypeConfig - The task type config from registry
 * @returns {import('./types').ValidationResult & { flagged?: boolean }}
 */
function scanProhibitedContent(input, taskTypeConfig) {
  const errors = [];
  const warnings = [];
  let flagged = false;

  // Combine title and description for scanning
  const fieldsToScan = ['title', 'description'];
  const textParts = [];

  for (const field of fieldsToScan) {
    if (input[field] && typeof input[field] === 'string') {
      textParts.push({ field, text: input[field] });
    }
  }

  for (const { field, text } of textParts) {
    // Check global prohibited keywords
    const prohibitedMatches = matchKeywords(text, PROHIBITED_KEYWORDS);
    if (prohibitedMatches.length > 0) {
      errors.push(makeError(field, EC.PROHIBITED_CONTENT,
        `${field} contains prohibited content that violates our content policy`,
        { suggestion: 'Review the prohibited content guidelines at GET /api/schemas' }
      ));
    }

    // Check per-task-type prohibited keywords
    if (taskTypeConfig && Array.isArray(taskTypeConfig.prohibited_keywords)) {
      const typeMatches = matchKeywords(text, taskTypeConfig.prohibited_keywords);
      if (typeMatches.length > 0) {
        errors.push(makeError(field, EC.PROHIBITED_CONTENT,
          `${field} contains content prohibited for ${taskTypeConfig.display_name} tasks`,
          { suggestion: 'Review the task type schema at GET /api/schemas/' + taskTypeConfig.id }
        ));
      }
    }

    // Check borderline keywords — flag for review, don't reject
    const flaggedMatches = matchKeywords(text, FLAGGED_KEYWORDS);
    if (flaggedMatches.length > 0) {
      flagged = true;
      warnings.push(makeError(field, EC.PROHIBITED_CONTENT,
        `${field} contains content that requires manual review before the task becomes visible`,
        { suggestion: 'The task will be created but held for review. Consider rephrasing if this was unintentional.' }
      ));
    }
  }

  const result = makeResult(errors, warnings);
  result.flagged = flagged;
  return result;
}

module.exports = { scanProhibitedContent, PROHIBITED_KEYWORDS, FLAGGED_KEYWORDS };
