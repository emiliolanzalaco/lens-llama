import { getSynapseClient } from './client';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function downloadFromFilecoin(pieceCid: string): Promise<Buffer> {
  const synapse = await getSynapseClient();

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const data = await synapse.storage.download(pieceCid);
      return Buffer.from(data);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new Error(`Download failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}
