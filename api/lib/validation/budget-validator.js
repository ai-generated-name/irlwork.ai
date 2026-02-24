/**
 * Budget Validator (Gate 4)
 *
 * Validates budget reasonableness:
 *   - Budget >= task type minimum_budget_usd
 *   - Implied hourly rate >= configurable minimum wage ($5/hr default)
 *   - Warn (don't reject) if implied rate > $500/hr
 */

const { makeError, makeResult } = require('./types');
const EC = require('./error-codes');

const DEFAULT_MIN_HOURLY_RATE = 5; // $5/hr minimum
const HIGH_RATE_WARNING_THRESHOLD = 500; // $500/hr triggers a warning

/**
 * @param {Object} input - The task payload
 * @param {Object|null} taskTypeConfig - The task type config from registry
 * @returns {import('./types').ValidationResult}
 */
function validateBudget(input, taskTypeConfig) {
  const errors = [];
  const warnings = [];

  const budget = parseFloat(input.budget_usd);
  if (isNaN(budget)) {
    // Missing budget is caught by schema validator; skip here
    return makeResult(errors, warnings);
  }

  // 1. Budget vs task type minimum
  if (taskTypeConfig && taskTypeConfig.minimum_budget_usd) {
    const minBudget = parseFloat(taskTypeConfig.minimum_budget_usd);
    if (budget < minBudget) {
      errors.push(makeError('budget_usd', EC.BUDGET_BELOW_MINIMUM,
        `Minimum budget for ${taskTypeConfig.display_name} tasks is $${minBudget}. Submitted: $${budget}`,
        { constraint: { min: minBudget } }
      ));
    }
  }

  // 2. Implied hourly rate check (only if duration is provided)
  const duration = parseFloat(input.duration_hours);
  if (!isNaN(duration) && duration > 0) {
    const impliedHourlyRate = budget / duration;

    if (impliedHourlyRate < DEFAULT_MIN_HOURLY_RATE) {
      errors.push(makeError('budget_usd', EC.BELOW_MINIMUM,
        `Implied hourly rate is $${impliedHourlyRate.toFixed(2)}/hr (budget $${budget} / ${duration}hr). Minimum is $${DEFAULT_MIN_HOURLY_RATE}/hr.`,
        {
          constraint: { min: DEFAULT_MIN_HOURLY_RATE },
          suggestion: `Increase budget to at least $${(DEFAULT_MIN_HOURLY_RATE * duration).toFixed(2)} for ${duration} hours of work`
        }
      ));
    }

    if (impliedHourlyRate > HIGH_RATE_WARNING_THRESHOLD) {
      warnings.push(makeError('budget_usd', 'HIGH_BUDGET_WARNING',
        `Implied hourly rate is $${impliedHourlyRate.toFixed(2)}/hr — this is unusually high. Please confirm this is intentional.`,
        { suggestion: 'Double-check the budget and duration values' }
      ));
    }
  }

  return makeResult(errors, warnings);
}

module.exports = { validateBudget, DEFAULT_MIN_HOURLY_RATE, HIGH_RATE_WARNING_THRESHOLD };
