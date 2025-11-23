/**
 * Validates username format
 * - 3-63 characters
 * - lowercase alphanumeric and hyphens
 * - cannot start or end with hyphen
 */
export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 63) {
    return { valid: false, error: 'Username must be 63 characters or less' };
  }

  const validFormat = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  if (!validFormat.test(username)) {
    return {
      valid: false,
      error: 'Username must contain only lowercase letters, numbers, and hyphens (cannot start or end with hyphen)',
    };
  }

  return { valid: true };
}
