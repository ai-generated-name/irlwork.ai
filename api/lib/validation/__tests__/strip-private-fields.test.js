const { stripPrivateFields } = require('../../privacy/strip-private-fields');

describe('stripPrivateFields', () => {
  it('removes private_address, private_notes, private_contact', () => {
    const task = {
      id: 'abc-123',
      title: 'Test Task',
      private_address: 'v1:aabbcc:ddeeff:112233',
      private_notes: 'v1:112233:445566:778899',
      private_contact: 'v1:aabb:ccdd:eeff',
    };
    const result = stripPrivateFields(task);
    expect(result).not.toHaveProperty('private_address');
    expect(result).not.toHaveProperty('private_notes');
    expect(result).not.toHaveProperty('private_contact');
  });

  it('preserves all other fields', () => {
    const task = {
      id: 'abc-123',
      title: 'Test Task',
      description: 'A description',
      status: 'open',
      budget: 50,
      private_address: 'encrypted',
    };
    const result = stripPrivateFields(task);
    expect(result.id).toBe('abc-123');
    expect(result.title).toBe('Test Task');
    expect(result.description).toBe('A description');
    expect(result.status).toBe('open');
    expect(result.budget).toBe(50);
  });

  it('returns null for null input', () => {
    expect(stripPrivateFields(null)).toBeNull();
  });

  it('returns undefined for undefined input', () => {
    expect(stripPrivateFields(undefined)).toBeUndefined();
  });

  it('does not mutate the original object', () => {
    const task = {
      id: 'abc-123',
      private_address: 'secret',
      private_notes: 'secret',
      private_contact: 'secret',
    };
    const original = { ...task };
    stripPrivateFields(task);
    expect(task).toEqual(original);
  });

  it('handles task with no private fields', () => {
    const task = { id: 'abc-123', title: 'Test' };
    const result = stripPrivateFields(task);
    expect(result).toEqual({ id: 'abc-123', title: 'Test' });
  });
});
