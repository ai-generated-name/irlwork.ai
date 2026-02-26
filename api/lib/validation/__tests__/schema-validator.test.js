const { validateSchema } = require('../schema-validator');

const CLEANING_CONFIG = {
  id: 'cleaning',
  display_name: 'Home Cleaning',
  category: 'cleaning',
  required_fields: ['title', 'description', 'datetime_start', 'duration_hours', 'budget_usd', 'location_zone'],
  optional_fields: ['skills_required', 'requirements', 'private_address', 'private_notes', 'private_contact'],
  field_schemas: {
    duration_hours: { type: 'number', min: 1, max: 12 },
    budget_usd: { type: 'number', min: 15 },
    skills_required: {
      type: 'array',
      allowed_values: ['standard_clean', 'deep_clean', 'move_out_clean', 'laundry', 'dishes', 'windows', 'organizing'],
    },
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
  datetime_start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h from now
  duration_hours: 3,
  budget_usd: 35,
};

describe('Schema Validator', () => {
  it('passes valid input', () => {
    const result = validateSchema(VALID_INPUT, CLEANING_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns INVALID_TASK_TYPE when config is null', () => {
    const result = validateSchema({ task_type: 'nonexistent' }, null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('INVALID_TASK_TYPE');
  });

  it('reports all missing required fields at once', () => {
    const result = validateSchema({ task_type: 'cleaning' }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    const missingFields = result.errors.filter(e => e.code === 'MISSING_REQUIRED').map(e => e.field);
    expect(missingFields).toContain('title');
    expect(missingFields).toContain('description');
    expect(missingFields).toContain('datetime_start');
    expect(missingFields).toContain('duration_hours');
    expect(missingFields).toContain('budget_usd');
    expect(missingFields).toContain('location_zone');
  });

  it('catches empty string required fields', () => {
    const result = validateSchema({ ...VALID_INPUT, title: '' }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'title' && e.code === 'MISSING_REQUIRED')).toBe(true);
  });

  it('validates number type', () => {
    const result = validateSchema({ ...VALID_INPUT, duration_hours: 'not a number' }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'duration_hours' && e.code === 'INVALID_TYPE')).toBe(true);
  });

  it('validates number minimum', () => {
    const result = validateSchema({ ...VALID_INPUT, duration_hours: 0.5 }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'duration_hours' && e.code === 'BELOW_MINIMUM')).toBe(true);
  });

  it('validates number maximum', () => {
    const result = validateSchema({ ...VALID_INPUT, duration_hours: 15 }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'duration_hours' && e.code === 'ABOVE_MAXIMUM')).toBe(true);
  });

  it('validates string min_length', () => {
    const result = validateSchema({ ...VALID_INPUT, description: 'Too short' }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'description' && e.code === 'STRING_TOO_SHORT')).toBe(true);
  });

  it('validates string max_length', () => {
    const result = validateSchema({ ...VALID_INPUT, description: 'x'.repeat(1001) }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'description' && e.code === 'STRING_TOO_LONG')).toBe(true);
  });

  it('validates array type', () => {
    const result = validateSchema({ ...VALID_INPUT, skills_required: 'not an array' }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'skills_required' && e.code === 'INVALID_TYPE')).toBe(true);
  });

  it('validates array allowed_values', () => {
    const result = validateSchema({ ...VALID_INPUT, skills_required: ['standard_clean', 'nonexistent_skill'] }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'skills_required' && e.code === 'INVALID_VALUE')).toBe(true);
  });

  it('validates datetime_start in past', () => {
    const result = validateSchema({ ...VALID_INPUT, datetime_start: '2020-01-01T00:00:00Z' }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'datetime_start' && e.code === 'INVALID_DATETIME')).toBe(true);
  });

  it('validates datetime_start less than 1 hour from now', () => {
    const result = validateSchema({ ...VALID_INPUT, datetime_start: new Date(Date.now() + 30 * 60 * 1000).toISOString() }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'datetime_start' && e.code === 'INVALID_DATETIME')).toBe(true);
  });

  it('validates unparseable datetime', () => {
    const result = validateSchema({ ...VALID_INPUT, datetime_start: 'not-a-date' }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'datetime_start' && e.code === 'INVALID_DATETIME')).toBe(true);
  });

  it('validates budget below task type minimum', () => {
    const result = validateSchema({ ...VALID_INPUT, budget_usd: 10 }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'budget_usd' && e.code === 'BUDGET_BELOW_MINIMUM')).toBe(true);
  });

  it('validates duration above task type maximum', () => {
    const result = validateSchema({ ...VALID_INPUT, duration_hours: 15 }, CLEANING_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'ABOVE_MAXIMUM' || e.code === 'DURATION_EXCEEDS_MAX')).toBe(true);
  });

  it('warns on unknown fields', () => {
    const result = validateSchema({ ...VALID_INPUT, unknown_field: 'something' }, CLEANING_CONFIG);
    expect(result.valid).toBe(true); // Warnings don't fail validation
    expect(result.warnings.some(w => w.field === 'unknown_field' && w.code === 'UNKNOWN_FIELD')).toBe(true);
  });

  it('accepts valid array values', () => {
    const result = validateSchema({ ...VALID_INPUT, skills_required: ['standard_clean', 'deep_clean'] }, CLEANING_CONFIG);
    expect(result.valid).toBe(true);
  });

  it('includes constraint info in errors', () => {
    const result = validateSchema({ ...VALID_INPUT, duration_hours: 0.5 }, CLEANING_CONFIG);
    const error = result.errors.find(e => e.field === 'duration_hours');
    expect(error.constraint).toBeDefined();
    expect(error.constraint.min).toBe(1);
  });
});
