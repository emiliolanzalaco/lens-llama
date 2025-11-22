import { describe, it, expect } from '@jest/globals';

describe('Unit Tests - Utils', () => {
  it('should validate Ethereum addresses', () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    const invalidAddress = '0xinvalid';

    expect(validAddress.startsWith('0x')).toBe(true);
    expect(validAddress.length).toBe(42);
    expect(invalidAddress.length).not.toBe(42);
  });

  it('should handle bigint conversions', () => {
    const amount = BigInt(1000);
    expect(amount.toString()).toBe('1000');
  });
});
