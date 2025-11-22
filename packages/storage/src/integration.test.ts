/**
 * Integration test for Filecoin storage
 *
 * Run manually with env vars set:
 * SYNAPSE_PRIVATE_KEY=... FILECOIN_RPC_URL=... pnpm test:integration
 */

import { describe, it, expect } from 'vitest';
import { uploadToFilecoin } from './upload';
import { downloadFromFilecoin } from './download';
import { resetSynapseClient } from './client';

describe.skipIf(!process.env.SYNAPSE_PRIVATE_KEY)('Filecoin integration', () => {
  beforeEach(() => {
    resetSynapseClient();
  });

  it('uploads and downloads data round-trip', async () => {
    // Filecoin minimum upload size is 127 bytes
    const testData = Buffer.alloc(256, 'x');
    testData.write(`test data ${Date.now()}`, 0);

    // Upload
    const uploadResult = await uploadToFilecoin(testData);
    expect(uploadResult.pieceCid).toBeTruthy();
    expect(uploadResult.size).toBeGreaterThan(0);

    console.log('Uploaded with CID:', uploadResult.pieceCid);

    // Download
    const downloaded = await downloadFromFilecoin(uploadResult.pieceCid);
    expect(downloaded).toEqual(testData);

    console.log('Download successful, data matches!');
  }, 180000); // 3 minute timeout for network operations
});
