/**
 * AES-256-GCM encryption service for private task fields.
 *
 * Encrypted format: "v1:iv_hex:authTag_hex:ciphertext_hex"
 * The version prefix supports future key rotation — encrypt with latest version,
 * decrypt by looking up the key for the version in the string.
 *
 * Key from process.env.ENCRYPTION_KEY (64 hex chars = 32 bytes).
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const CURRENT_VERSION = 'v1';

/**
 * KEY MANAGEMENT NOTE:
 *
 * Current approach: ENCRYPTION_KEY stored as plaintext hex in .env.
 * The "v1:" version prefix enables future key rotation — new data is encrypted
 * with the latest version, decryption selects the key by version string.
 *
 * MIGRATION TRIGGER: Move to a cloud KMS (AWS KMS, GCP KMS, or Vault) before:
 *   - Storing >100 tasks with private data, OR
 *   - Onboarding the first paying enterprise customer, OR
 *   - Adding a second server operator who shouldn't see the raw key
 *
 * Migration steps:
 *   1. Add "v2:" support that calls KMS for encrypt/decrypt
 *   2. Re-encrypt existing v1 data using the KMS-wrapped key
 *   3. Remove the plaintext ENCRYPTION_KEY from .env
 */

function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Must be a 64-character hex string (32 bytes).');
  }
  if (keyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * @param {string} plaintext
 * @returns {string} "v1:iv_hex:authTag_hex:ciphertext_hex"
 */
function encrypt(plaintext) {
  if (!plaintext) return null;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${CURRENT_VERSION}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted string.
 * @param {string} encryptedStr "v1:iv_hex:authTag_hex:ciphertext_hex"
 * @returns {string} plaintext
 */
function decrypt(encryptedStr) {
  if (!encryptedStr) return null;

  const parts = encryptedStr.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted string format. Expected "version:iv:authTag:ciphertext".');
  }

  const [version, ivHex, authTagHex, ciphertext] = parts;

  if (version !== 'v1') {
    throw new Error(`Unsupported encryption version: ${version}. Only v1 is currently supported.`);
  }

  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if a string appears to be encrypted (matches versioned format).
 * @param {string} str
 * @returns {boolean}
 */
function isEncrypted(str) {
  if (!str || typeof str !== 'string') return false;
  return /^v\d+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(str);
}

module.exports = { encrypt, decrypt, isEncrypted };
