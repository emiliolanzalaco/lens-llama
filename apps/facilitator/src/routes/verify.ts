import { Router } from 'express';
import { verifySignature } from '../utils/signature';

export const verifyRouter = Router();

/**
 * Verify endpoint for x402 payment protocol
 * Handles signature verification including ERC-6492 support for smart contract wallets
 */
verifyRouter.post('/', async (req, res) => {
  try {
    const { signature, message, address } = req.body;

    if (!signature || !message || !address) {
      return res.status(400).json({
        error: 'Missing required fields: signature, message, address',
      });
    }

    // Verify signature with ERC-6492 support for smart contract wallets
    const isValid = await verifySignature(address, message, signature);

    if (isValid) {
      return res.json({
        verified: true,
        address,
        message: 'Signature verified successfully',
      });
    } else {
      return res.status(401).json({
        verified: false,
        error: 'Invalid signature',
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      error: 'Internal server error during verification',
    });
  }
});
