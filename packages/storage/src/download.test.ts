import { describe, it, expect } from 'vitest';
import { downloadFromFilecoin } from './download';

describe('download', () => {
  describe('downloadFromFilecoin', () => {
    it('requires Synapse client to be configured', async () => {
      // Without env vars, should throw
      const fakeCid = 'baga6ea4seaqjtovkwk4myyzj56eztkh5pzsk5upksan6f5outesy62bsvl4dsha';

      await expect(downloadFromFilecoin(fakeCid)).rejects.toThrow();
    });
  });
});
