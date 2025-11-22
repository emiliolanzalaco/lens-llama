# LensLlama Technical Specification

## Overview
Pay-per-use stock photography with x402 micropayments. Photographers get 90% instantly via smart contract split.

**MVP Demo Flow:** Browse → Click image → Login with Privy → Pay via x402 → Download full resolution

---

## Tech Stack
- **Frontend:** Next.js 14, TypeScript, TailwindCSS, Privy SDK
- **Backend:** Next.js API Routes, Neon Postgres, Drizzle ORM, Viem
- **Blockchain:** Base Mainnet, custom x402 facilitator (ERC-6492 fix), RevenueDistributor.sol
- **Storage:** Filecoin Onchain Cloud via Synapse SDK (`@filoz/synapse-sdk`), Sharp for watermarks

---

## Database Schema

### images
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| encrypted_cid | string | Encrypted full resolution CID |
| watermarked_cid | string | Preview CID (unencrypted) |
| encryption_key | string | AES-256 key (hex encoded) |
| photographer_address | string | Wallet (42 chars) |
| title | string | Image title |
| description | string | Optional |
| tags | string[] | Search keywords |
| price_usdc | decimal | Price (e.g., 1.50) |
| width, height | int | Dimensions |
| created_at | timestamp | Upload time |

### licenses
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| image_id | UUID | FK to images |
| buyer_address | string | Purchaser wallet |
| photographer_address | string | Creator wallet |
| price_usdc | decimal | Amount paid |
| payment_tx_hash | string | Base tx hash |
| issued_at | timestamp | Purchase time |

---

## API Endpoints

### GET /api/images
Returns all images with watermarked previews for homepage grid.

### GET /api/images/[id]
**The core x402 endpoint.** Behavior depends on license status:

**No license:** Returns 402 with x402 payment headers + watermarked preview + metadata

**With payment proof:** Verifies payment → splits revenue → creates license → returns full resolution

**License exists:** Returns full resolution (re-download)

### POST /api/upload
Accepts image + metadata. Process:
1. Generate watermark with Sharp (unencrypted preview)
2. Generate AES-256 key, encrypt full resolution
3. Upload both to Filecoin via Synapse SDK
4. Save CIDs and encryption key to database

```javascript
import crypto from 'crypto'

// Encrypt full resolution
const key = crypto.randomBytes(32)
const iv = crypto.randomBytes(16)
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
const encrypted = Buffer.concat([iv, cipher.update(imageBuffer), cipher.final()])

// Upload to Filecoin
const synapse = await Synapse.create({ privateKey, rpcURL })
const { pieceCid: encryptedCid } = await synapse.storage.upload(encrypted)
const { pieceCid: watermarkedCid } = await synapse.storage.upload(watermarkedBuffer)

// Store key as hex in database
const keyHex = key.toString('hex')
```

---

## Smart Contract: RevenueDistributor.sol

```solidity
function distributePayment(address photographer, uint256 amount) external {
    // Transfer 90% to photographer
    // Transfer 10% to platform treasury
    // Emit PaymentDistributed event
}
```

Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

---

## x402 Facilitator

Fork of @standard/x402-facilitator with ERC-6492 fix for Coinbase Smart Wallets.

**POST /verify** - Validates signature (supports undeployed smart wallets)
**POST /settle** - Executes USDC transfer on Base

---

## Frontend Pages

### Homepage (/)
Image grid (3-4 columns). Each card: thumbnail, title, price. Click → detail page.

### Image Detail (/image/[id])
Large watermarked preview, title, price, "Buy License" button.

**Purchase flow:**
1. Click "Buy License" → Privy login if needed
2. Sign EIP-712 message with Privy wallet
3. Re-request endpoint with payment proof
4. Download full resolution image

### Upload (/upload)
Auth required. Form: image file, title, description, tags, price. Shows upload progress.

---

## Environment Variables

```
POSTGRES_URL
NEXT_PUBLIC_PRIVY_APP_ID
SYNAPSE_PRIVATE_KEY
FILECOIN_RPC_URL
NEXT_PUBLIC_BASE_RPC_URL
NEXT_PUBLIC_REVENUE_DISTRIBUTOR_ADDRESS
PLATFORM_TREASURY_ADDRESS
FACILITATOR_URL
FACILITATOR_PRIVATE_KEY
MASTER_ENCRYPTION_KEY
```

---

## Purchase Flow (Detailed)

1. `GET /api/images/[id]` → 402 + x402 headers + watermark
2. User clicks "Buy" → Privy auth
3. Privy wallet signs EIP-712 message
4. `GET /api/images/[id]` with payment proof header
5. Backend → facilitator /verify (ERC-6492)
6. Facilitator → /settle (USDC transfer)
7. Backend → RevenueDistributor.distributePayment()
8. Backend creates license record
9. Backend downloads encrypted blob from Filecoin
10. Backend decrypts with stored AES key
11. Backend returns decrypted image to client
12. Future requests: decrypt and return (license exists)

```javascript
// Decrypt after payment
const encrypted = await synapse.storage.download(encryptedCid)
const iv = encrypted.slice(0, 16)
const data = encrypted.slice(16)
const key = Buffer.from(keyHex, 'hex')
const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
```

---

## MVP Success Criteria

**Must work:**
- Privy login (email/Google) creates embedded wallet
- x402 payment settles on Base
- 90/10 split executes on-chain
- Full resolution download after payment
- Transaction visible on Basescan

**Acceptable shortcuts:**
- No search (just browse grid)
- No photographer profiles
- Single price (no license tiers)
- Simple diagonal watermark

---

## Stretch Goals

**Tier 1:** Search bar, category filtering, photographer display names

**Tier 2:** C2PA content credentials, multiple license types, My Licenses page

**Tier 3:** Stats tracking, full-text search, pagination, email notifications

---

## Security Notes

### Payment Security
- Fetch price/photographer from DB, never trust frontend
- Verify license doesn't exist before creating
- Validate payment with facilitator before issuing license
- Match buyer address from auth session to payment proof
- Validate payment amount matches image price exactly
- Include nonce/timestamp in payment proof to prevent replay attacks

### Key Management
- Encrypt per-image keys with master key before storing in DB
- Master key stored as `MASTER_ENCRYPTION_KEY` env var
- Never store unencrypted keys in database

### Smart Contract Security
- Validate photographer and treasury addresses are not zero addresses
- Implement access control for distributePayment function
- Emit events for all state changes
