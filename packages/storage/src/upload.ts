import type { PieceCID } from '@filoz/synapse-sdk';
import { Piece } from '@web3-storage/data-segment';
import { getSynapseClient } from './client';
import { MAX_RETRIES, RETRY_DELAY_MS, sleep } from './utils';

export interface UploadResult {
  pieceCid: string;
  size: number;
}

/**
 * Calculate PIECEID locally using CommP algorithm
 */
function calculatePieceCid(data: Uint8Array): string {
  const piece = Piece.fromPayload(data);
  return piece.link.toString();
}

/**
 * Fire-and-forget upload to Filecoin.
 * Calculates CID locally and returns immediately.
 * Upload continues in background.
 */
export async function uploadToFilecoin(data: Buffer): Promise<UploadResult> {
  const dataArray = new Uint8Array(data);

  // Calculate CID locally - this is instant
  console.log(`[Filecoin] Calculating CID for ${data.length} bytes`);
  const pieceCid = calculatePieceCid(dataArray);
  console.log(`[Filecoin] Local CID: ${pieceCid}`);

  // Fire off upload in background (don't await)
  uploadInBackground(dataArray, pieceCid).catch(error => {
    console.error(`[Filecoin] Background upload failed for ${pieceCid}:`, error);
  });

  // Test retrieval with retries (non-blocking)
  testRetrievalWithRetries(pieceCid).catch(() => {});

  // Return immediately with precomputed CID
  return {
    pieceCid,
    size: data.length,
  };
}

/**
 * Test retrieval with retries to see when content becomes available
 */
async function testRetrievalWithRetries(pieceCid: string): Promise<void> {
  const MAX_ATTEMPTS = 30;
  const RETRY_INTERVAL_MS = 5000; // 5 seconds between attempts
  const start = Date.now();

  console.log(`[Filecoin] Testing retrieval for ${pieceCid} (max ${MAX_ATTEMPTS} attempts, ${RETRY_INTERVAL_MS / 1000}s interval)...`);

  const synapse = await getSynapseClient();
  const storage = await synapse.createStorage();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const data = await storage.download(pieceCid);
      console.log(`[Filecoin] RETRIEVAL SUCCESS on attempt ${attempt}: ${data.length} bytes in ${Date.now() - start}ms`);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[Filecoin] Retrieval attempt ${attempt}/${MAX_ATTEMPTS} failed after ${Date.now() - start}ms: ${message}`);

      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_INTERVAL_MS);
      }
    }
  }

  console.log(`[Filecoin] Retrieval failed after ${MAX_ATTEMPTS} attempts (${Date.now() - start}ms total)`);
}

/**
 * Background upload with retries
 */
async function uploadInBackground(data: Uint8Array, pieceCid: string): Promise<void> {
  console.log(`[Filecoin] Starting background upload for ${pieceCid}`);
  const start = Date.now();

  const synapse = await getSynapseClient();
  console.log(`[Filecoin] Got client in ${Date.now() - start}ms`);

  const storage = await synapse.createStorage();
  console.log(`[Filecoin] Created storage in ${Date.now() - start}ms`);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Filecoin] Background upload attempt ${attempt} for ${pieceCid}`);
      await storage.upload(data, { pieceCid: pieceCid as unknown as PieceCID });
      console.log(`[Filecoin] Background upload complete in ${Date.now() - start}ms for ${pieceCid}`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`[Filecoin] Attempt ${attempt} failed: ${lastError.message}`);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new Error(`Background upload failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}
