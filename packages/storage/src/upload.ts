import type { PieceCID } from '@filoz/synapse-sdk';
import { getSynapseClient } from './client';
import { MAX_RETRIES, RETRY_DELAY_MS, sleep } from './utils';

export interface UploadResult {
  pieceCid: string;
  size: number;
}

export async function uploadToFilecoin(data: Buffer): Promise<UploadResult> {
  const synapse = await getSynapseClient();
  const storage = await synapse.createStorage();

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await storage.upload(new Uint8Array(data));

      return {
        pieceCid: result.pieceCid.toString(),
        size: result.size,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new Error(`Upload failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}
