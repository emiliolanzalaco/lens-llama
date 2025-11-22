# x402 Facilitator API Examples

This document demonstrates how to use the custom x402 payment facilitator server.

## Base URL

```
http://localhost:3001
```

## Endpoints

### Health Check

**GET** `/health`

Check if the server is running.

```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "x402-facilitator"
}
```

---

### Verify Signature

**POST** `/verify`

Verify a signature with ERC-6492 support for smart contract wallets.

**Request Body:**
```json
{
  "signature": "0x...",
  "message": "Sign this message to authenticate",
  "address": "0x1234567890123456789012345678901234567890"
}
```

**Example (EOA Signature):**
```bash
curl -X POST http://localhost:3001/verify \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "0x1234...",
    "message": "Sign this message",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
  }'
```

**Response (Success):**
```json
{
  "verified": true,
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  "message": "Signature verified successfully"
}
```

**Response (Failure):**
```json
{
  "verified": false,
  "error": "Invalid signature"
}
```

**Example (ERC-6492 Smart Contract Wallet):**

For smart contract wallets, the signature includes additional data:
- Standard signature
- Factory address (for deploying the wallet if needed)
- Factory calldata (initialization data)
- Magic bytes: `0x6492649264926492649264926492649264926492649264926492649264926492`

```bash
curl -X POST http://localhost:3001/verify \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "0x<sig><factory><calldata>6492649264926492649264926492649264926492649264926492649264926492",
    "message": "Sign this message",
    "address": "0x..."
  }'
```

---

### Settle Payment

**POST** `/settle`

Settle a payment and finalize the transaction.

**Request Body:**
```json
{
  "paymentId": "payment-123",
  "amount": "1000000000000000000",
  "recipient": "0x1234567890123456789012345678901234567890"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/settle \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "payment-abc-123",
    "amount": "1000000000000000000",
    "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
  }'
```

**Response:**
```json
{
  "settled": true,
  "paymentId": "payment-abc-123",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  "amount": "1000000000000000000",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "message": "Payment settled successfully"
}
```

---

### Get Settlement Status

**GET** `/settle/:paymentId`

Check the status of a payment settlement.

**Example:**
```bash
curl http://localhost:3001/settle/payment-abc-123
```

**Response:**
```json
{
  "paymentId": "payment-abc-123",
  "settled": false,
  "message": "Payment settlement status"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields: signature, message, address"
}
```

### 401 Unauthorized
```json
{
  "verified": false,
  "error": "Invalid signature"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error during verification"
}
```

---

## ERC-6492 Signature Format

ERC-6492 allows signature verification for smart contract wallets that may not be deployed yet.

**Structure:**
```
0x + <signature> + <factory_address> + <factory_calldata> + <magic_bytes>
```

- **signature**: 65 bytes (130 hex chars) - Standard ECDSA signature
- **factory_address**: 20 bytes (40 hex chars) - Address of the factory contract
- **factory_calldata**: Variable length - Calldata for deploying the wallet
- **magic_bytes**: 32 bytes (64 hex chars) - `6492649264926492...`

The facilitator detects ERC-6492 signatures by:
1. Checking if signature length > 132 characters
2. Verifying magic bytes at the end
3. Extracting and validating components

---

## Integration Example (JavaScript/TypeScript)

```typescript
import { recoverMessageAddress } from 'viem';

// Verify a signature
async function verifySignature(address: string, message: string, signature: string) {
  const response = await fetch('http://localhost:3001/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, message, signature }),
  });
  
  const result = await response.json();
  return result.verified;
}

// Settle a payment
async function settlePayment(paymentId: string, amount: string, recipient: string) {
  const response = await fetch('http://localhost:3001/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, amount, recipient }),
  });
  
  return await response.json();
}

// Usage
const isValid = await verifySignature(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
  'Sign this message',
  '0x1234...'
);

if (isValid) {
  const settlement = await settlePayment(
    'payment-123',
    '1000000000000000000',
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'
  );
  console.log('Settlement:', settlement);
}
```
