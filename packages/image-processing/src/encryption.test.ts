import { describe, it, expect } from 'vitest';
import {
  generateEncryptionKey,
  encryptImage,
  decryptImage,
  keyToHex,
  hexToKey,
} from './encryption';

describe('encryption', () => {
  describe('generateEncryptionKey', () => {
    it('generates a 32-byte key', () => {
      const key = generateEncryptionKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('generates unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1.equals(key2)).toBe(false);
    });
  });

  describe('encryptImage and decryptImage', () => {
    it('encrypts and decrypts back to original', async () => {
      const input = Buffer.from('test image data');
      const key = generateEncryptionKey();

      const encrypted = await encryptImage(input, key);
      const decrypted = await decryptImage(encrypted, key);

      expect(decrypted).toEqual(input);
    });

    it('produces different ciphertext for same plaintext', async () => {
      const input = Buffer.from('test image data');
      const key = generateEncryptionKey();

      const encrypted1 = await encryptImage(input, key);
      const encrypted2 = await encryptImage(input, key);

      // Different IVs produce different ciphertext
      expect(encrypted1.equals(encrypted2)).toBe(false);
    });

    it('fails to decrypt with wrong key', async () => {
      const input = Buffer.from('test image data');
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      const encrypted = await encryptImage(input, key1);

      await expect(decryptImage(encrypted, key2)).rejects.toThrow();
    });

    it('handles empty buffer', async () => {
      const input = Buffer.from('');
      const key = generateEncryptionKey();

      const encrypted = await encryptImage(input, key);
      const decrypted = await decryptImage(encrypted, key);

      expect(decrypted).toEqual(input);
    });

    it('handles large buffer', async () => {
      const input = Buffer.alloc(1024 * 1024, 'x'); // 1MB
      const key = generateEncryptionKey();

      const encrypted = await encryptImage(input, key);
      const decrypted = await decryptImage(encrypted, key);

      expect(decrypted).toEqual(input);
    });
  });

  describe('keyToHex and hexToKey', () => {
    it('converts key to hex and back', () => {
      const key = generateEncryptionKey();
      const hex = keyToHex(key);
      const restored = hexToKey(hex);

      expect(restored).toEqual(key);
    });

    it('produces 64 character hex string', () => {
      const key = generateEncryptionKey();
      const hex = keyToHex(key);

      expect(hex.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
    });
  });
});
