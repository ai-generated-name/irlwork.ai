// Set a test encryption key before importing the module
const TEST_KEY = 'a'.repeat(64); // 32 bytes of 0xAA in hex
const originalKey = process.env.ENCRYPTION_KEY;

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterAll(() => {
  if (originalKey) {
    process.env.ENCRYPTION_KEY = originalKey;
  } else {
    delete process.env.ENCRYPTION_KEY;
  }
});

describe('Encryption Service', () => {
  // Re-import after setting env var
  let encrypt, decrypt, isEncrypted;

  beforeAll(() => {
    const mod = require('../encryption');
    encrypt = mod.encrypt;
    decrypt = mod.decrypt;
    isEncrypted = mod.isEncrypted;
  });

  describe('encrypt/decrypt round-trip', () => {
    it('encrypts and decrypts simple text', () => {
      const plaintext = 'Hello, world!';
      const encrypted = encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('handles long text', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('handles UTF-8 characters', () => {
      const plaintext = '123 Nguyen Hu, Apt 4B, District 2, TP. H Ch Minh';
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('handles emojis', () => {
      const plaintext = 'Gate code: 1234. Ring bell twice.';
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('produces different ciphertext each time (random IV)', () => {
      const plaintext = 'Same input';
      const enc1 = encrypt(plaintext);
      const enc2 = encrypt(plaintext);
      expect(enc1).not.toBe(enc2); // Different IVs
      expect(decrypt(enc1)).toBe(plaintext);
      expect(decrypt(enc2)).toBe(plaintext);
    });
  });

  describe('encrypt', () => {
    it('returns null for null input', () => {
      expect(encrypt(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(encrypt('')).toBeNull();
    });

    it('produces versioned format: v1:iv:tag:ciphertext', () => {
      const encrypted = encrypt('test');
      expect(encrypted).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    });

    it('starts with version prefix v1', () => {
      const encrypted = encrypt('test');
      expect(encrypted.startsWith('v1:')).toBe(true);
    });
  });

  describe('decrypt', () => {
    it('returns null for null input', () => {
      expect(decrypt(null)).toBeNull();
    });

    it('throws on invalid format', () => {
      expect(() => decrypt('not-encrypted')).toThrow();
    });

    it('throws on unsupported version', () => {
      const encrypted = encrypt('test');
      const v2 = encrypted.replace('v1:', 'v2:');
      expect(() => decrypt(v2)).toThrow(/Unsupported encryption version/);
    });

    it('throws on tampered ciphertext', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      parts[3] = 'ff'.repeat(parts[3].length / 2); // Replace ciphertext
      expect(() => decrypt(parts.join(':'))).toThrow();
    });
  });

  describe('isEncrypted', () => {
    it('returns true for encrypted strings', () => {
      const encrypted = encrypt('test');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('returns false for plain text', () => {
      expect(isEncrypted('Hello, world!')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isEncrypted(null)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('returns false for non-string', () => {
      expect(isEncrypted(123)).toBe(false);
    });
  });
});
