import { Synapse } from '@filoz/synapse-sdk';

let synapseInstance: Synapse | null = null;

export async function getSynapseClient(): Promise<Synapse> {
  if (synapseInstance) {
    return synapseInstance;
  }

  const privateKey = process.env.SYNAPSE_PRIVATE_KEY;
  const rpcURL = process.env.FILECOIN_RPC_URL;

  if (!privateKey) {
    throw new Error('SYNAPSE_PRIVATE_KEY environment variable is required');
  }

  if (!rpcURL) {
    throw new Error('FILECOIN_RPC_URL environment variable is required');
  }

  synapseInstance = await Synapse.create({
    privateKey,
    rpcURL,
  });

  return synapseInstance;
}

// For testing - allows resetting the singleton
export function resetSynapseClient(): void {
  synapseInstance = null;
}
