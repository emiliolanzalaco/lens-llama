import { describe, it, expect } from 'vitest';
import { encryptWithMasterKey, decryptWithMasterKey, generateMasterKey } from './encryption';

describe('encryption utilities', () => {
  describe('generateMasterKey', () => {
    it('generates a 64-character hex string (32 bytes)', () => {
      const key = generateMasterKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]+$/);
    });

    it('generates unique keys', () => {
      const key1 = generateMasterKey();
      const key2 = generateMasterKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('encryptWithMasterKey and decryptWithMasterKey', () => {
    const masterKey = generateMasterKey();

    it('encrypts and decrypts back to original', () => {
      const original = 'test-encryption-key-12345';
      const encrypted = encryptWithMasterKey(original, masterKey);
      const decrypted = decryptWithMasterKey(encrypted, masterKey);
      expect(decrypted).toBe(original);
    });

    it('produces different ciphertext for same plaintext', () => {
      const original = 'test-data';
      const encrypted1 = encryptWithMasterKey(original, masterKey);
      const encrypted2 = encryptWithMasterKey(original, masterKey);
      expect(encrypted1).not.toBe(encrypted2); // Different IVs
    });

    it('encrypted data has correct format (iv:authTag:data)', () => {
      const original = 'test-data';
      const encrypted = encryptWithMasterKey(original, masterKey);
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(24); // 12 bytes IV = 24 hex chars
      expect(parts[1]).toHaveLength(32); // 16 bytes auth tag = 32 hex chars
    });

    it('throws error with wrong master key', () => {
      const original = 'test-data';
      const encrypted = encryptWithMasterKey(original, masterKey);
      const wrongKey = generateMasterKey();
      expect(() => decryptWithMasterKey(encrypted, wrongKey)).toThrow();
    });

    it('works with hex-encoded AES keys', () => {
      const hexKey = 'a1b2c3d4e5f6789012345678901234567890abcdefabcdef1234567890abcdef';
      const encrypted = encryptWithMasterKey(hexKey, masterKey);
      const decrypted = decryptWithMasterKey(encrypted, masterKey);
      expect(decrypted).toBe(hexKey);
    });

    it('works with empty strings', () => {
      const original = '';
      const encrypted = encryptWithMasterKey(original, masterKey);
      const decrypted = decryptWithMasterKey(encrypted, masterKey);
      expect(decrypted).toBe(original);
    });

    it('works with unicode characters', () => {
      const original = 'Hello 世界 🚀';
      const encrypted = encryptWithMasterKey(original, masterKey);
      const decrypted = decryptWithMasterKey(encrypted, masterKey);
      expect(decrypted).toBe(original);
    });
  });
});
