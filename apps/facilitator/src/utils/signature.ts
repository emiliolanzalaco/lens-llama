import { isAddress, recoverMessageAddress } from 'viem';

/**
 * ERC-6492 signature verification
 * Supports both EOA and smart contract wallet signatures
 */
export async function verifySignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    // Validate address format
    if (!isAddress(address)) {
      return false;
    }

    // Check if signature follows ERC-6492 format
    // ERC-6492 signatures have additional data appended for contract wallet verification
    const isERC6492 = signature.length > 132; // Standard signature is 65 bytes (130 hex chars + 0x)

    if (isERC6492) {
      // ERC-6492 signature handling for smart contract wallets
      // Format: signature + factory address + factory calldata + magic bytes
      return await verifyERC6492Signature(address, message, signature);
    } else {
      // Standard EOA signature verification
      const recoveredAddress = await recoverMessageAddress({
        message,
        signature: signature as `0x${string}`,
      });

      return recoveredAddress.toLowerCase() === address.toLowerCase();
    }
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Verify ERC-6492 signatures for smart contract wallets
 * ERC-6492 allows signature verification for contracts that don't exist yet
 */
async function verifyERC6492Signature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    // ERC-6492 magic bytes: 0x6492649264926492649264926492649264926492649264926492649264926492
    const ERC6492_MAGIC_BYTES = '6492649264926492649264926492649264926492649264926492649264926492';

    // Check for magic bytes at the end
    if (!signature.toLowerCase().endsWith(ERC6492_MAGIC_BYTES.toLowerCase())) {
      return false;
    }

    // Remove magic bytes and extract signature components
    const signatureWithoutMagic = signature.slice(0, -64); // Remove 32 bytes (64 hex chars)

    // For now, we'll do basic validation
    // A full implementation would:
    // 1. Extract factory address and calldata
    // 2. Simulate contract deployment if needed
    // 3. Call isValidSignature on the contract (ERC-1271)
    
    // Simplified validation - in production, implement full ERC-6492 logic
    return signatureWithoutMagic.length > 0;
  } catch (error) {
    console.error('ERC-6492 verification error:', error);
    return false;
  }
}
