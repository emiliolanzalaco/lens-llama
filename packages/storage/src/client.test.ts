import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSynapseClient, resetSynapseClient } from './client';

describe('client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetSynapseClient();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getSynapseClient', () => {
    it('throws error when SYNAPSE_PRIVATE_KEY is missing', async () => {
      delete process.env.SYNAPSE_PRIVATE_KEY;
      process.env.FILECOIN_RPC_URL = 'https://example.com';

      await expect(getSynapseClient()).rejects.toThrow(
        'SYNAPSE_PRIVATE_KEY environment variable is required'
      );
    });

    it('throws error when FILECOIN_RPC_URL is missing', async () => {
      process.env.SYNAPSE_PRIVATE_KEY = '0x1234';
      delete process.env.FILECOIN_RPC_URL;

      await expect(getSynapseClient()).rejects.toThrow(
        'FILECOIN_RPC_URL environment variable is required'
      );
    });
  });
});
