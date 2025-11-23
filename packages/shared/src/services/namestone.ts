

/**
 * ENS coin types for multichain address resolution
 * See: https://github.com/ensdomains/address-encoder/blob/master/docs/supported-cryptocurrencies.md
 */
export const COIN_TYPES = {
  ETH: 60, // Ethereum mainnet (default)
  BASE: 2147568180, // Base L2 (works for both mainnet and testnet)
} as const;

export interface NameStoneConfig {
  apiKey: string;
  parentDomain: string;
  network: 'sepolia';
}

export interface ClaimNameResponse {
  success: boolean;
  name?: string;
  address?: string;
  error?: string;
}

export interface GetNamesResponse {
  names: Array<{
    name: string;
    address: string;
    textRecords?: Record<string, string>;
  }>;
}

export interface SetNameRequest {
  name: string;
  address: string;
  domain: string;
  textRecords?: Record<string, string>;
}

/**
 * Validates username format according to DNS label rules
 * - 3-63 characters
 * - lowercase alphanumeric and hyphens
 * - cannot start or end with hyphen
 */
export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 63) {
    return { valid: false, error: 'Username must be 63 characters or less' };
  }

  const validFormat = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  if (!validFormat.test(username)) {
    return {
      valid: false,
      error: 'Username must contain only lowercase letters, numbers, and hyphens (cannot start or end with hyphen)',
    };
  }

  return { valid: true };
}

/**
 * NameStone API client for ENS subdomain management
 */
export class NameStoneService {
  private config: NameStoneConfig;

  constructor(config: NameStoneConfig) {
    this.config = config;
  }

  /**
   * Generic fetch wrapper for NameStone API calls
   */
  private async fetch<T>(
    path: string,
    options: {
      method: 'GET' | 'POST' | 'DELETE';
      body?: unknown;
    }
  ): Promise<T> {
    // NameStone uses the same API endpoint for all networks
    // The network is determined by which resolver your domain uses
    const baseUrl = 'https://namestone.com/api/public_v1_sepolia';
    const url = `${baseUrl}/${path}`;

    const response = await fetch(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.config.apiKey,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `NameStone API error (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Check if a username is available
   * Returns true if available, false if taken
   */
  async checkAvailability(username: string): Promise<boolean> {
    const validation = validateUsername(username);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      // Try to get existing names - if the name exists, it's taken
      const ensName = `${username}.${this.config.parentDomain}`;
      const response = await this.fetch<GetNamesResponse>('get-names', {
        method: 'POST',
        body: { domain: ensName },
      });

      // If we get names back, the username is taken
      return response.names.length === 0;
    } catch (error) {
      // If the API returns an error, assume the name might be available
      // The claim will fail later if it's actually taken
      console.error('Error checking availability:', error);
      return true;
    }
  }

  /**
   * Claim a subdomain for an address
   * Uses claim-name endpoint which fails if already taken
   * Registers the address for both Ethereum and Base chains
   */
  async claimSubdomain(
    username: string,
    address: string,
    textRecords?: Record<string, string>
  ): Promise<ClaimNameResponse> {
    const validation = validateUsername(username);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    try {
      const ensName = `${username}.${this.config.parentDomain}`;

      // For Sepolia network, we store Base Sepolia address in text records
      // because Base Sepolia (84532) is not in the ENS address-encoder supported list
      const finalTextRecords = {
        ...textRecords,
        ...(this.config.network === 'sepolia' && {
          'eth.base.sepolia': address, // Store Base Sepolia address
        }),
      };

      const requestBody: any = {
        name: username,
        address, // Sets the ETH mainnet/sepolia address (coin type 60)
        domain: this.config.parentDomain,
        text_records: finalTextRecords,
      };

      // Only add coin_types for mainnet (Base mainnet coin type is supported)
      if (this.config.network === 'mainnet') {
        requestBody.coin_types = {
          [COIN_TYPES.BASE]: address, // Base mainnet address
        };
      }

      await this.fetch<ClaimNameResponse>('set-name', {
        method: 'POST',
        body: requestBody,
      });

      return {
        success: true,
        name: ensName,
        address,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to claim subdomain',
      };
    }
  }

  /**
   * Set or update text records for an existing ENS name
   */
  async setTextRecords(
    ensName: string,
    textRecords: Record<string, string>
  ): Promise<void> {
    const username = ensName.replace(`.${this.config.parentDomain}`, '');

    await this.fetch('set-name', {
      method: 'POST',
      body: {
        name: username,
        domain: this.config.parentDomain,
        textRecords,
      },
    });
  }

  /**
   * Update the address for a specific chain
   * Useful for updating Base or other L2 addresses after initial claim
   */
  async updateChainAddress(
    ensName: string,
    address: string,
    coinType: number = COIN_TYPES.BASE
  ): Promise<void> {
    const username = ensName.replace(`.${this.config.parentDomain}`, '');

    await this.fetch('set-name', {
      method: 'POST',
      body: {
        name: username,
        domain: this.config.parentDomain,
        coin_types: {
          [coinType]: address,
        },
      },
    });
  }

  /**
   * Get all names for a specific address
   */
  async getNamesForAddress(address: string): Promise<string[]> {
    const response = await this.fetch<GetNamesResponse>('get-names', {
      method: 'POST',
      body: { address },
    });

    return response.names.map((n) => n.name);
  }

  /**
   * Delete a subdomain
   */
  async deleteSubdomain(username: string, address: string): Promise<void> {
    await this.fetch('delete-name', {
      method: 'DELETE',
      body: {
        name: username,
        address,
        domain: this.config.parentDomain,
      },
    });
  }
}

/**
 * Create a NameStone service instance from environment variables
 */
export function createNameStoneService(): NameStoneService {
  const apiKey = process.env.NAMESTONE_API_KEY;
  const parentDomain = process.env.NAMESTONE_PARENT_DOMAIN || 'ens.eth';
  const network =
    (process.env.NAMESTONE_NETWORK as 'mainnet' | 'sepolia') || 'sepolia';

  if (!apiKey) {
    throw new Error('NAMESTONE_API_KEY environment variable is required');
  }

  return new NameStoneService({
    apiKey,
    parentDomain,
    network,
  });
}
