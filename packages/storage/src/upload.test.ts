import { describe, it, expect } from 'vitest';
import { uploadToFilecoin } from './upload';

describe('upload', () => {
  describe('uploadToFilecoin', () => {
    it('requires Synapse client to be configured', async () => {
      // Without env vars, should throw
      const data = Buffer.from('test data');

      await expect(uploadToFilecoin(data)).rejects.toThrow();
    });
  });
});
