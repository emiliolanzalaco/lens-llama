import crypto from 'crypto';

/**
 * Encrypts data using AES-256-GCM with the master encryption key
 * Used for encrypting per-image encryption keys at rest in the database
 */
export function encryptWithMasterKey(data: string, masterKey: string): string {
  const key = Buffer.from(masterKey, 'hex');
  const iv = crypto.randomBytes(12); // GCM standard IV length
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData (all hex encoded)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts data using AES-256-GCM with the master encryption key
 * Used for decrypting per-image encryption keys from the database
 */
export function decryptWithMasterKey(encryptedData: string, masterKey: string): string {
  const key = Buffer.from(masterKey, 'hex');
  const [ivHex, authTagHex, dataHex] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(dataHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Generates a random AES-256 master encryption key
 * This should be generated once and stored securely as MASTER_ENCRYPTION_KEY
 */
export function generateMasterKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
