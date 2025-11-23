import type { PieceCID } from '@filoz/synapse-sdk';
import { Piece } from '@web3-storage/data-segment';
import { getSynapseClient } from './client';
import { MAX_RETRIES, RETRY_DELAY_MS, sleep } from './utils';

export interface UploadResult {
  pieceCid: string;
  size: number;
}

/**
 * Calculate PieceCID locally using CommP algorithm
 */
function calculatePieceCid(data: Uint8Array): { cid: PieceCID; str: string } {
  const piece = Piece.fromPayload(data);
  return {
    cid: piece.link as unknown as PieceCID,
    str: piece.link.toString(),
  };
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
  const { cid, str: pieceCidStr } = calculatePieceCid(dataArray);
  console.log(`[Filecoin] Local CID: ${pieceCidStr}`);

  // Fire off upload in background (don't await)
  uploadInBackground(dataArray, cid, pieceCidStr).catch(error => {
    console.error(`[Filecoin] Background upload failed for ${pieceCidStr}:`, error);
  });

  // Return immediately with precomputed CID
  return {
    pieceCid: pieceCidStr,
    size: data.length,
  };
}

/**
 * Background upload with retries
 */
async function uploadInBackground(data: Uint8Array, pieceCid: PieceCID, pieceCidStr: string): Promise<void> {
  console.log(`[Filecoin] Starting background upload for ${pieceCidStr}`);
  const start = Date.now();

  const synapse = await getSynapseClient();
  console.log(`[Filecoin] Got client in ${Date.now() - start}ms`);

  const storage = await synapse.createStorage();
  console.log(`[Filecoin] Created storage in ${Date.now() - start}ms`);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Filecoin] Background upload attempt ${attempt} for ${pieceCidStr}`);
      await storage.upload(data, { pieceCid });
      console.log(`[Filecoin] Background upload complete in ${Date.now() - start}ms for ${pieceCidStr}`);
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
