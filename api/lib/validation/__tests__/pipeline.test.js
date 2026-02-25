const { validateTask, resetFailures, getFailureCount, hashPayload, MAX_CONSECUTIVE_FAILURES, flushTaskTypeCache } = require('../pipeline');

// Mock supabase client
function createMockSupabase(taskTypeData = null) {
  return {
    from: (table) => ({
      select: () => ({
        eq: function (col, val) {
          this._filters = this._filters || [];
          this._filters.push({ col, val });
          return this;
        },
        single: async () => {
          if (table === 'task_type_registry') {
            return { data: taskTypeData, error: taskTypeData ? null : { message: 'Not found' } };
          }
          return { data: null, error: null };
        },
        order: () => ({ data: taskTypeData ? [taskTypeData] : [], error: null }),
      }),
      insert: async () => ({ data: null, error: null }),
    }),
  };
}

const CLEANING_CONFIG = {
  id: 'cleaning',
  display_name: 'Home Cleaning',
  category: 'cleaning',
  required_fields: ['title', 'description', 'datetime_start', 'duration_hours', 'budget_usd', 'location_zone'],
  optional_fields: ['skills_required', 'requirements', 'private_address', 'private_notes', 'private_contact'],
  field_schemas: {
    duration_hours: { type: 'number', min: 1, max: 12 },
    budget_usd: { type: 'number', min: 15 },
    description: { type: 'string', min_length: 20, max_length: 1000 },
    title: { type: 'string', min_length: 5, max_length: 200 },
  },
  minimum_budget_usd: 15,
  maximum_duration_hr: 12,
  prohibited_keywords: [],
  requires_address: true,
  is_active: true,
};

const VALID_INPUT = {
  task_type: 'cleaning',
  title: 'Standard Apartment Clean',
  description: 'Clean a 2-bedroom apartment including kitchen, bathroom, and living areas.',
  location_zone: 'District 2, Thu Duc',
  datetime_start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  duration_hours: 3,
  budget_usd: 35,
};

describe('Validation Pipeline', () => {
  beforeEach(() => {
    resetFailures('test-agent');
    flushTaskTypeCache();
  });

  it('passes valid input through all validators', async () => {
    const supabase = createMockSupabase(CLEANING_CONFIG);
    const result = await validateTask(supabase, VALID_INPUT, { agentId: 'test-agent' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('aggregates errors from ALL validators (no short-circuit)', async () => {
    const supabase = createMockSupabase(CLEANING_CONFIG);
    const badInput = {
      task_type: 'cleaning',
      title: 'Hi', // Too short
      description: 'Call 555-123-4567', // Has PII and too short
      budget_usd: 5, // Below minimum
      // Missing required fields: datetime_start, duration_hours, location_zone
    };

    const result = await validateTask(supabase, badInput, { agentId: 'test-agent' });
    expect(result.valid).toBe(false);

    // Should have errors from multiple validators
    const errorCodes = new Set(result.errors.map(e => e.code));
    expect(errorCodes.size).toBeGreaterThan(1); // Errors from at least 2 validators

    // Should have MISSING_REQUIRED errors
    expect(result.errors.some(e => e.code === 'MISSING_REQUIRED')).toBe(true);
  });

  it('detects PII in descriptions', async () => {
    const supabase = createMockSupabase(CLEANING_CONFIG);
    const input = {
      ...VALID_INPUT,
      description: 'Clean the apartment. Email me at john@example.com when done.',
    };

    const result = await validateTask(supabase, input, { agentId: 'test-agent' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'PII_DETECTED')).toBe(true);
  });

  it('detects prohibited content', async () => {
    const supabase = createMockSupabase(CLEANING_CONFIG);
    const input = {
      ...VALID_INPUT,
      description: 'Need help with cocaine delivery to the apartment location.',
    };

    const result = await validateTask(supabase, input, { agentId: 'test-agent' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'PROHIBITED_CONTENT')).toBe(true);
  });

  describe('consecutive failure tracking', () => {
    it('tracks consecutive failures', async () => {
      const supabase = createMockSupabase(CLEANING_CONFIG);
      const badInput = { task_type: 'cleaning', title: 'Hi' }; // Invalid

      for (let i = 0; i < 3; i++) {
        await validateTask(supabase, badInput, { agentId: 'test-agent' });
      }

      expect(getFailureCount('test-agent')).toBe(3);
    });

    it('resets failure count on successful validation', async () => {
      const supabase = createMockSupabase(CLEANING_CONFIG);
      const badInput = { task_type: 'cleaning', title: 'Hi' };

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        await validateTask(supabase, badInput, { agentId: 'test-agent' });
      }
      expect(getFailureCount('test-agent')).toBe(3);

      // Succeed once
      await validateTask(supabase, VALID_INPUT, { agentId: 'test-agent' });
      expect(getFailureCount('test-agent')).toBe(0);
    });

    it('returns RATE_LIMIT_EXCEEDED after 5 consecutive failures', async () => {
      const supabase = createMockSupabase(CLEANING_CONFIG);
      const badInput = { task_type: 'cleaning', title: 'Hi' };

      // Fail MAX_CONSECUTIVE_FAILURES times
      for (let i = 0; i < MAX_CONSECUTIVE_FAILURES; i++) {
        await validateTask(supabase, badInput, { agentId: 'test-agent' });
      }

      // Next attempt should get rate limit error
      const result = await validateTask(supabase, badInput, { agentId: 'test-agent' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'RATE_LIMIT_EXCEEDED')).toBe(true);
    });

    it('rate limit message suggests escalation', async () => {
      const supabase = createMockSupabase(CLEANING_CONFIG);
      const badInput = { task_type: 'cleaning', title: 'Hi' };

      for (let i = 0; i < MAX_CONSECUTIVE_FAILURES; i++) {
        await validateTask(supabase, badInput, { agentId: 'test-agent' });
      }

      const result = await validateTask(supabase, badInput, { agentId: 'test-agent' });
      const rateError = result.errors.find(e => e.code === 'RATE_LIMIT_EXCEEDED');
      expect(rateError.message).toContain('escalate');
    });
  });

  describe('payload hashing', () => {
    it('produces consistent hashes for same input', () => {
      const hash1 = hashPayload({ a: 1, b: 2 });
      const hash2 = hashPayload({ a: 1, b: 2 });
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different input', () => {
      const hash1 = hashPayload({ a: 1 });
      const hash2 = hashPayload({ a: 2 });
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('flagged content', () => {
    it('marks result as flagged for borderline content', async () => {
      const supabase = createMockSupabase(CLEANING_CONFIG);
      const input = {
        ...VALID_INPUT,
        description: 'Need help with a background check on a potential tenant for property.',
      };

      const result = await validateTask(supabase, input, { agentId: 'test-agent' });
      // May be valid (no hard errors) but flagged
      expect(result.flagged).toBe(true);
    });
  });
});
