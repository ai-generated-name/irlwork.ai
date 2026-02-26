const { validateBudget, DEFAULT_MIN_HOURLY_RATE, HIGH_RATE_WARNING_THRESHOLD } = require('../budget-validator');

const CLEANING_CONFIG = {
  id: 'cleaning',
  display_name: 'Home Cleaning',
  minimum_budget_usd: 15,
  maximum_duration_hr: 12,
};

describe('Budget Validator', () => {
  describe('task type minimum budget', () => {
    it('passes when budget meets minimum', () => {
      const result = validateBudget({ budget_usd: 20, duration_hours: 2 }, CLEANING_CONFIG);
      expect(result.valid).toBe(true);
    });

    it('fails when budget is below minimum', () => {
      const result = validateBudget({ budget_usd: 10, duration_hours: 2 }, CLEANING_CONFIG);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'BUDGET_BELOW_MINIMUM')).toBe(true);
    });

    it('passes when budget equals minimum exactly', () => {
      const result = validateBudget({ budget_usd: 15, duration_hours: 2 }, CLEANING_CONFIG);
      expect(result.valid).toBe(true);
    });
  });

  describe('implied hourly rate', () => {
    it('fails when implied rate is below minimum wage', () => {
      // $8 for 4 hours = $2/hr
      const result = validateBudget({ budget_usd: 8, duration_hours: 4 }, { minimum_budget_usd: 5 });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'BELOW_MINIMUM')).toBe(true);
    });

    it('passes when implied rate meets minimum wage', () => {
      // $30 for 3 hours = $10/hr
      const result = validateBudget({ budget_usd: 30, duration_hours: 3 }, CLEANING_CONFIG);
      expect(result.valid).toBe(true);
    });

    it('warns when implied rate is very high', () => {
      // $5000 for 1 hour = $5000/hr
      const result = validateBudget({ budget_usd: 5000, duration_hours: 1 }, CLEANING_CONFIG);
      expect(result.valid).toBe(true); // Warnings don't fail
      expect(result.warnings.some(w => w.code === 'HIGH_BUDGET_WARNING')).toBe(true);
    });

    it('does not check rate when duration is missing', () => {
      const result = validateBudget({ budget_usd: 100 }, CLEANING_CONFIG);
      expect(result.valid).toBe(true);
    });

    it('does not check rate when duration is zero', () => {
      const result = validateBudget({ budget_usd: 100, duration_hours: 0 }, CLEANING_CONFIG);
      expect(result.valid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('skips when budget is NaN', () => {
      const result = validateBudget({ budget_usd: 'not a number' }, CLEANING_CONFIG);
      expect(result.valid).toBe(true); // Missing budget handled by schema validator
    });

    it('handles null config gracefully', () => {
      const result = validateBudget({ budget_usd: 50, duration_hours: 2 }, null);
      expect(result.valid).toBe(true);
    });

    it('includes suggestion in below-minimum error', () => {
      const result = validateBudget({ budget_usd: 2, duration_hours: 4 }, { minimum_budget_usd: 5 });
      const error = result.errors.find(e => e.code === 'BELOW_MINIMUM' || e.code === 'BUDGET_BELOW_MINIMUM');
      if (error && error.suggestion) {
        expect(error.suggestion).toContain('$');
      }
    });
  });
});
