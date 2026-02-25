const { scanProhibitedContent } = require('../content-policy');

describe('Content Policy Scanner', () => {
  // --- Prohibited content detection ---
  describe('prohibited keywords', () => {
    it('detects drug-related content', () => {
      const result = scanProhibitedContent({ title: 'Cocaine delivery needed', description: 'Need delivery' }, null);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'PROHIBITED_CONTENT')).toBe(true);
    });

    it('detects weapon-related content', () => {
      const result = scanProhibitedContent({ description: 'Need help with firearm purchase' }, null);
      expect(result.valid).toBe(false);
    });

    it('detects fraud-related content', () => {
      const result = scanProhibitedContent({ description: 'Need someone to create a fake id for me' }, null);
      expect(result.valid).toBe(false);
    });

    it('detects harassment/stalking content', () => {
      const result = scanProhibitedContent({ description: 'I need to stalk someone for information' }, null);
      expect(result.valid).toBe(false);
    });

    it('detects adult services content', () => {
      const result = scanProhibitedContent({ description: 'Looking for escort service for the evening' }, null);
      expect(result.valid).toBe(false);
    });

    it('detects cybercrime content', () => {
      const result = scanProhibitedContent({ description: 'Need someone to hack into an email account' }, null);
      expect(result.valid).toBe(false);
    });
  });

  // --- Word boundary matching ---
  describe('word boundary matching', () => {
    it('does NOT flag "therapist" (contains "rapist" as substring)', () => {
      const result = scanProhibitedContent({
        description: 'Looking for a therapist to help with stress management and wellness',
      }, null);
      expect(result.errors).toHaveLength(0);
    });

    it('does NOT flag "grassy" (contains "ass" as substring)', () => {
      const result = scanProhibitedContent({
        description: 'Need help mowing a grassy field near the park',
      }, null);
      expect(result.errors).toHaveLength(0);
    });

    it('does NOT flag "cassette" (contains "ass" as substring)', () => {
      const result = scanProhibitedContent({
        description: 'Help me organize my old cassette tape collection',
      }, null);
      expect(result.errors).toHaveLength(0);
    });

    it('does NOT flag "password" (contains "ass" as substring)', () => {
      const result = scanProhibitedContent({
        description: 'Help me reset a password for my home router setup',
      }, null);
      expect(result.errors).toHaveLength(0);
    });
  });

  // --- Case insensitivity ---
  describe('case insensitivity', () => {
    it('catches uppercase keywords', () => {
      const result = scanProhibitedContent({ description: 'COCAINE delivery needed urgently' }, null);
      expect(result.valid).toBe(false);
    });

    it('catches mixed case keywords', () => {
      const result = scanProhibitedContent({ description: 'Need someone to Hack Into my account' }, null);
      expect(result.valid).toBe(false);
    });
  });

  // --- Flagged (borderline) content ---
  describe('flagged content', () => {
    it('flags borderline keywords as warnings, not errors', () => {
      const result = scanProhibitedContent({
        description: 'Need help with a background check for a tenant',
      }, null);
      expect(result.errors).toHaveLength(0);
      expect(result.flagged).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('flags "weapon" as borderline', () => {
      const result = scanProhibitedContent({
        description: 'Help me catalog my antique weapon collection for insurance',
      }, null);
      expect(result.flagged).toBe(true);
    });
  });

  // --- Per-task-type prohibited keywords ---
  describe('task type specific keywords', () => {
    it('checks task-type specific prohibited keywords', () => {
      const config = {
        id: 'cleaning',
        display_name: 'Home Cleaning',
        prohibited_keywords: ['hazardous waste', 'biohazard'],
      };
      const result = scanProhibitedContent({
        description: 'Need help cleaning up hazardous waste in the garage',
      }, config);
      expect(result.valid).toBe(false);
    });
  });

  // --- Clean descriptions ---
  describe('clean content', () => {
    it('passes a normal cleaning task', () => {
      const result = scanProhibitedContent({
        title: 'Apartment Cleaning',
        description: 'Standard cleaning for a 2-bedroom apartment. Vacuum, mop, and wipe surfaces.',
      }, null);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes a normal delivery task', () => {
      const result = scanProhibitedContent({
        title: 'Package Delivery',
        description: 'Pick up a package from the post office and deliver it to my area.',
      }, null);
      expect(result.valid).toBe(true);
    });

    it('passes a normal handyman task', () => {
      const result = scanProhibitedContent({
        title: 'Fix Kitchen Faucet',
        description: 'The kitchen faucet is leaking. Need someone with plumbing experience to replace the washer.',
      }, null);
      expect(result.valid).toBe(true);
    });
  });
});
