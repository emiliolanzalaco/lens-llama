import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

export function generateEncryptionKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

export function encryptImage(imageBuffer: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(imageBuffer), cipher.final()]);

  // Prepend IV to encrypted data for decryption
  return Buffer.concat([iv, encrypted]);
}

export function decryptImage(encryptedBuffer: Buffer, key: Buffer): Buffer {
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const data = encryptedBuffer.subarray(IV_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function keyToHex(key: Buffer): string {
  return key.toString('hex');
}

export function hexToKey(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}
