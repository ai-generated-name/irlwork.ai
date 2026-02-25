const { scanForPII } = require('../pii-scanner');

describe('PII Scanner', () => {
  // --- Phone numbers ---
  describe('phone numbers', () => {
    it('detects US-format phone numbers with dashes', () => {
      const result = scanForPII({ description: 'Call me at 555-123-4567 for details' }, null);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'PII_DETECTED' && e.detected)).toBe(true);
    });

    it('detects phone numbers with parentheses', () => {
      const result = scanForPII({ description: 'Reach me at (555) 123-4567 anytime' }, null);
      expect(result.valid).toBe(false);
    });

    it('detects international phone numbers with plus prefix', () => {
      const result = scanForPII({ description: 'My number is +84901234567' }, null);
      expect(result.valid).toBe(false);
    });

    it('detects phone numbers with spaces', () => {
      const result = scanForPII({ description: 'Call 0909 123 456 to arrange' }, null);
      expect(result.valid).toBe(false);
    });

    it('does NOT flag zip codes (5 digits)', () => {
      const result = scanForPII({ description: 'Located in area 90210 near the downtown' }, null);
      // 5-digit sequences should not trigger phone detection
      const phoneErrors = result.errors.filter(e => e.detected && /phone/i.test(e.message));
      expect(phoneErrors).toHaveLength(0);
    });

    it('does NOT flag simple reference numbers', () => {
      const result = scanForPII({ description: 'Order number 1234567890 needs pickup' }, null);
      // No separators = should not trigger phone pattern
      const phoneErrors = result.errors.filter(e => e.detected && /phone/i.test(e.message));
      expect(phoneErrors).toHaveLength(0);
    });
  });

  // --- Email addresses ---
  describe('email addresses', () => {
    it('detects standard email', () => {
      const result = scanForPII({ description: 'Email me at john@example.com for questions' }, null);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'PII_DETECTED')).toBe(true);
    });

    it('detects email in title', () => {
      const result = scanForPII({ title: 'Contact admin@company.org for this task' }, null);
      expect(result.valid).toBe(false);
    });
  });

  // --- Street addresses ---
  describe('street addresses', () => {
    it('detects English-format address', () => {
      const result = scanForPII({ description: 'Come to 123 Main Street for the pickup' }, null);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'PII_DETECTED' && /address/i.test(e.message))).toBe(true);
    });

    it('detects address with abbreviated suffix', () => {
      const result = scanForPII({ description: 'Meet at 45 Oak Ave for the delivery' }, null);
      expect(result.valid).toBe(false);
    });

    it('detects Vietnamese-style address', () => {
      const result = scanForPII({ description: 'Deliver to 123 Nguyen Hue street' }, null);
      expect(result.valid).toBe(false);
    });

    it('detects apartment/unit numbers', () => {
      const result = scanForPII({ description: 'Go to Apt 4B on the 3rd floor' }, null);
      expect(result.valid).toBe(false);
    });

    it('does NOT flag "2 bedroom apartment"', () => {
      const result = scanForPII({ description: 'Clean a 2 bedroom apartment with 3 bathrooms and large kitchen' }, null);
      const addressErrors = result.errors.filter(e => /address/i.test(e.message));
      expect(addressErrors).toHaveLength(0);
    });

    it('does NOT flag "150 sqft office"', () => {
      const result = scanForPII({ description: 'Organize a 150 sqft office space with shelving' }, null);
      const addressErrors = result.errors.filter(e => /address/i.test(e.message));
      expect(addressErrors).toHaveLength(0);
    });

    it('does NOT flag "3 story building"', () => {
      const result = scanForPII({ description: 'Clean windows on a 3 story building exterior' }, null);
      const addressErrors = result.errors.filter(e => /address/i.test(e.message));
      expect(addressErrors).toHaveLength(0);
    });

    it('does NOT flag floor numbers', () => {
      const result = scanForPII({ description: 'The task is on the 5 floor of the office tower' }, null);
      const addressErrors = result.errors.filter(e => /address/i.test(e.message));
      expect(addressErrors).toHaveLength(0);
    });
  });

  // --- Contact names ---
  describe('contact names', () => {
    it('detects "contact John Smith"', () => {
      const result = scanForPII({ description: 'When you arrive, contact John Smith at the front desk' }, null);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /contact name/i.test(e.message))).toBe(true);
    });

    it('detects "ask for Maria"', () => {
      const result = scanForPII({ description: 'At the store, ask for Maria to get the package' }, null);
      expect(result.valid).toBe(false);
    });

    it('detects "call Mr. Nguyen"', () => {
      const result = scanForPII({ description: 'Please call Mr. Nguyen when you get there' }, null);
      expect(result.valid).toBe(false);
    });
  });

  // --- Social media ---
  describe('social media', () => {
    it('detects @username handles', () => {
      const result = scanForPII({ description: 'Find me at @john_doe_123 for details' }, null);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /social/i.test(e.message))).toBe(true);
    });

    it('detects "my instagram is" reference', () => {
      const result = scanForPII({ description: 'My instagram is great for seeing examples of my work' }, null);
      expect(result.valid).toBe(false);
    });

    it('detects "find me on facebook"', () => {
      const result = scanForPII({ description: 'Find me on facebook for more task details' }, null);
      expect(result.valid).toBe(false);
    });
  });

  // --- URLs ---
  describe('URLs', () => {
    it('detects https URLs', () => {
      const result = scanForPII({ description: 'See details at https://example.com/task-info' }, null);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /URL/i.test(e.message))).toBe(true);
    });

    it('detects www. URLs', () => {
      const result = scanForPII({ description: 'Check www.mysite.com for reference photos' }, null);
      expect(result.valid).toBe(false);
    });
  });

  // --- Private fields should NOT be scanned ---
  describe('private fields', () => {
    it('does NOT scan private_address', () => {
      const result = scanForPII({ private_address: '123 Main Street, Apt 4B' }, null);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('does NOT scan private_notes', () => {
      const result = scanForPII({ private_notes: 'Call 555-123-4567 when arriving' }, null);
      expect(result.valid).toBe(true);
    });

    it('does NOT scan private_contact', () => {
      const result = scanForPII({ private_contact: 'john@example.com, +84901234567' }, null);
      expect(result.valid).toBe(true);
    });
  });

  // --- Masked output ---
  describe('masked detection', () => {
    it('partially masks detected PII', () => {
      const result = scanForPII({ description: 'Email me at john@example.com for details' }, null);
      expect(result.valid).toBe(false);
      const piiError = result.errors.find(e => e.code === 'PII_DETECTED');
      expect(piiError.detected).toBeDefined();
      expect(piiError.detected).not.toBe('john@example.com'); // Should be masked
      expect(piiError.detected).toContain('***');
    });

    it('includes suggestion for correct field', () => {
      const result = scanForPII({ description: 'Meet at 123 Main Street please' }, null);
      const piiError = result.errors.find(e => e.code === 'PII_DETECTED');
      if (piiError) {
        expect(piiError.suggestion).toBeDefined();
        expect(piiError.suggestion.toLowerCase()).toContain('private');
      }
    });
  });

  // --- Clean descriptions that should pass ---
  describe('clean descriptions', () => {
    it('passes a typical cleaning task', () => {
      const result = scanForPII({
        title: 'Standard 2BR Apartment Clean',
        description: 'Need standard cleaning for a 2-bedroom apartment. Kitchen, bathrooms, living areas need vacuuming, mopping, and wiping.',
        location_zone: 'District 2, Thu Duc',
      }, null);
      expect(result.valid).toBe(true);
    });

    it('passes a delivery task', () => {
      const result = scanForPII({
        title: 'Grocery Delivery Needed',
        description: 'Pick up groceries from the local supermarket and deliver to the area. About 5 bags, nothing heavy.',
        location_zone: 'Binh Thanh District',
      }, null);
      expect(result.valid).toBe(true);
    });
  });
});
