# Lens Llama Technical Specification

## Overview

Lens Llama is a pay-per-use stock photography marketplace built on Web3 principles. Photographers upload images and receive 90% of sales through automated smart contract revenue splits. The platform combines modern web development practices with blockchain payments on Base L2.

**Current Status**: MVP phase with working upload/browse functionality. Payment integration (x402) in development.

---

## Tech Stack

### Frontend
- **Next.js 14** (App Router) - React framework for production
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Privy SDK** (`@privy-io/react-auth`, `@privy-io/server-auth`) - Web3 authentication
- **Vercel Blob Client** (`@vercel/blob`) - File upload SDK
- **Viem** - Ethereum library for blockchain interactions
- **Zod** - Runtime validation and type inference

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Drizzle ORM** - Type-safe SQL query builder for PostgreSQL
- **Zod** - Request/response validation
- **Privy Server Auth** - JWT token verification

### Infrastructure
- **Vercel** - Application hosting, deployments, and Blob storage
- **NeonDB** - Serverless PostgreSQL database
- **Base (L2)** - Low-cost blockchain for payments (future)
- **Privy** - Managed authentication service

---

## Database Schema

### Images Table

```typescript
images {
  id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  originalBlobUrl: TEXT NOT NULL              // Full-resolution image URL
  watermarkedBlobUrl: TEXT NOT NULL           // Preview image URL
  photographerAddress: VARCHAR(42) NOT NULL   // Wallet address (0x...)
  photographerUsername: VARCHAR(255)          // Display name (nullable)
  title: VARCHAR(255) NOT NULL
  description: TEXT
  tags: TEXT[] NOT NULL DEFAULT []           // Searchable keywords
  priceUsdc: DECIMAL(10,2) NOT NULL          // Price in USDC (e.g., 9.99)
  width: INTEGER NOT NULL                     // Original dimensions
  height: INTEGER NOT NULL
  createdAt: TIMESTAMP NOT NULL DEFAULT NOW()
}

INDEXES:
- photographer_idx ON photographerAddress
- created_at_idx ON createdAt
```

### Usernames Table

```typescript
usernames {
  id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  userAddress: VARCHAR(42) NOT NULL UNIQUE    // Wallet address
  username: VARCHAR(63) NOT NULL UNIQUE       // Display name
  claimedAt: TIMESTAMP NOT NULL DEFAULT NOW()
  firstImageId: UUID REFERENCES images(id)    // FK to first upload
}

INDEXES:
- username_user_address_idx ON userAddress
- username_idx ON username
```

**Relationship**: `images.photographerAddress` links to `usernames.userAddress` (soft reference, no FK constraint)

---

## API Endpoints

### POST /api/upload

**Purpose**: Generate upload token for Vercel Blob storage

**Flow**: Vercel Blob's `handleUpload()` calls `onBeforeGenerateToken` callback with client payload, allowing server-side validation before issuing upload credentials.

**Request** (from Vercel Blob client SDK):
```javascript
{
  type: string,        // File MIME type
  size: number,        // File size in bytes
  clientPayload: string // JSON stringified metadata + accessToken
}
```

**Client Payload Structure**:
```typescript
{
  title: string,
  description: string | null,
  tags: string,
  price: string,                      // String representation of decimal
  photographerAddress: string,        // Wallet address (0x...)
  width: number,
  height: number,
  type: 'original' | 'watermarked',  // Which file is being uploaded
  accessToken: string                 // Privy JWT token
}
```

**Validation Steps**:
1. Parse `clientPayload` JSON
2. Validate with `metadataSchema` (Zod):
   - `title`: non-empty string
   - `description`: nullable string
   - `tags`: string
   - `price`: parseable number > 0
   - `photographerAddress`: valid Ethereum address (`/^0x[a-fA-F0-9]{40}$/`)
   - `width`, `height`: positive integers
   - `type`: `'original'` or `'watermarked'`
   - `accessToken`: non-empty string
3. Verify JWT token via `verifyAccessToken(accessToken)` using Privy
4. Extract wallet address from verified token
5. Verify `photographerAddress` matches authenticated wallet (case-insensitive)

**Success Response**:
```typescript
{
  allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maximumSizeInBytes: 52428800,  // 50MB
  addRandomSuffix: true           // Prevents filename guessing
}
```

**Error Responses**:
- `400 Bad Request` - Invalid metadata, token verification failed, wallet mismatch
- `500 Internal Server Error` - Unexpected server error (details hidden)

**Security**:
- JWT verification ensures only authenticated users can upload
- Wallet matching prevents users from uploading as others
- File type and size enforcement at token generation
- Random suffix prevents URL guessing attacks

---

### POST /api/upload/complete

**Purpose**: Save image metadata to database after successful Blob upload

**Authentication**: Bearer token in `Authorization` header (Privy JWT)

**Request Body**:
```typescript
{
  originalUrl: string,           // Vercel Blob URL for full-res image
  watermarkedUrl: string,        // Vercel Blob URL for preview
  title: string,
  description: string | null,
  tags: string,                  // Comma-separated tags
  price: string,                 // Decimal as string (e.g., "9.99")
  photographerAddress: string,   // Wallet address
  width: number,
  height: number
}
```

**Processing Steps**:
1. Middleware: Extract and verify Bearer token via `withAuth()` HOC
2. Validate request body with `completeUploadSchema` (Zod)
3. Verify `photographerAddress` matches authenticated wallet
4. Lookup username from `usernames` table (if exists)
5. Insert into `images` table:
   ```sql
   INSERT INTO images (
     original_blob_url, watermarked_blob_url,
     photographer_address, photographer_username,
     title, description, tags, price_usdc, width, height
   ) VALUES (...)
   ```
6. Return image ID

**Success Response**:
```typescript
{
  id: string  // UUID of created image
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - `photographerAddress` doesn't match authenticated wallet
- `400 Bad Request` - Invalid request body or database error

---

### POST /api/username/check-user

**Purpose**: Check if a wallet address has claimed a username

**Authentication**: None required

**Request Body**:
```typescript
{
  userAddress: string  // Wallet address (0x...)
}
```

**Response**:
```typescript
{
  hasUsername: boolean
}
```

**Usage**: Called by upload form before first upload to determine if username claim modal should be shown.

---

### POST /api/username/claim

**Purpose**: Claim a username for a wallet address

**Authentication**: Bearer token in `Authorization` header (Privy JWT)

**Request Body**:
```typescript
{
  username: string,     // Desired username (3-63 chars, alphanumeric + underscore)
  userAddress: string   // Wallet address
}
```

**Validation**:
1. Verify JWT token
2. Check `userAddress` matches authenticated wallet
3. Validate username format: `/^[a-zA-Z0-9_]{3,63}$/`
4. Check username availability (UNIQUE constraint)
5. Check address hasn't already claimed username

**Success Response**:
```typescript
{
  success: true,
  username: string
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid JWT
- `400 Bad Request` - Invalid format, username taken, address already has username
- `403 Forbidden` - Wallet address mismatch

---

### GET /api/images

**Purpose**: List all images for homepage gallery

**Authentication**: None required

**Query Parameters**: None (pagination not implemented)

**Response**:
```typescript
{
  images: Array<{
    id: string,
    watermarkedBlobUrl: string,
    photographerAddress: string,
    photographerUsername: string | null,
    title: string,
    description: string | null,
    tags: string[],
    priceUsdc: string,  // Decimal as string
    width: number,
    height: number,
    createdAt: string   // ISO 8601 timestamp
  }>
}
```

**Query**:
```sql
SELECT * FROM images
ORDER BY created_at DESC
```

---

## Client-Side Image Processing

All image processing happens in the browser before upload. This reduces server costs and provides instant feedback to users.

### getImageDimensions(file: File): Promise<ImageDimensions>

**Purpose**: Extract width and height from image file

**Process**:
1. Use `createImageBitmap(file, { imageOrientation: 'from-image' })`
2. Read `bitmap.width` and `bitmap.height`
3. Close bitmap to free memory
4. Return `{ width, height }`

**EXIF Handling**: `imageOrientation: 'from-image'` respects EXIF orientation metadata, ensuring dimensions match visual appearance.

**Error Handling**: Throws descriptive error if image loading fails

---

### createWatermarkedPreview(file: File, dimensions: ImageDimensions): Promise<File>

**Purpose**: Generate watermarked, compressed preview for public display

**Processing Pipeline**:

1. **Dimension Calculation**:
   - Calculate 40% scaled dimensions: `width * 0.4`, `height * 0.4`
   - Calculate max-dimension-limited size (800px max on largest side)
   - Use **whichever is smaller** (ensures preview never > 800px)

2. **Load Image**:
   - `createImageBitmap(file, { imageOrientation: 'from-image' })`
   - Handles EXIF orientation automatically

3. **Create Canvas**:
   ```javascript
   const canvas = document.createElement('canvas')
   canvas.width = targetWidth
   canvas.height = targetHeight
   const ctx = canvas.getContext('2d')
   ```

4. **Draw Resized Image**:
   ```javascript
   ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight)
   ```

5. **Apply Watermark**:
   - Font size: `4% of preview width` (e.g., 32px for 800px width)
   - Font: `Arial` (universally available)
   - Color: `rgba(255, 255, 255, 0.5)` (50% transparent white)
   - Pattern: Grid with diagonal rotation
   - Rotation angle: `-30 degrees`
   - Text: `"© Lens Llama"`
   - Spacing: `1.5x text width` or minimum 150px

   ```javascript
   const fontSize = Math.round(targetWidth * 0.04)
   ctx.font = `${fontSize}px Arial`
   ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
   ctx.textAlign = 'center'
   ctx.textBaseline = 'middle'

   const angle = -30 * (Math.PI / 180)
   for (let y = spacing / 2; y < targetHeight; y += spacing) {
     for (let x = spacing / 2; x < targetWidth; x += spacing) {
       ctx.save()
       ctx.translate(x, y)
       ctx.rotate(angle)
       ctx.fillText('© Lens Llama', 0, 0)
       ctx.restore()
     }
   }
   ```

6. **Compression**:
   ```javascript
   canvas.toBlob(callback, file.type, 0.7)  // 70% quality
   ```

7. **Create File**:
   - Filename: Original name with `-watermarked` suffix
   - Example: `photo.jpg` → `photo-watermarked.jpg`

**Constants**:
- `PREVIEW_SCALE = 0.4` (40% of original)
- `MAX_DIMENSION = 800` (max width or height)
- `PREVIEW_QUALITY = 0.7` (70% JPEG quality)
- `WATERMARK_FONT_SIZE_RATIO = 0.04` (4% of width)

**File Size**: Typically < 200KB for average images (aggressive compression + scaling)

---

## Authentication Flow

### Privy Integration

**Server-Side** (`lib/auth.ts`):
```typescript
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function verifyAccessToken(token: string): Promise<VerifiedUser> {
  const { userId } = await privy.verifyAuthToken(token)
  const user = await privy.getUser(userId)

  // Extract wallet address from linked accounts
  const wallet = user.linkedAccounts.find(
    account => account.type === 'wallet' || account.type === 'smart_wallet'
  )

  if (!wallet) throw new Error('No wallet linked to user')

  return {
    userId: user.id,
    walletAddress: wallet.address
  }
}
```

**Client-Side** (`lib/hooks/use-auth.ts`):
```typescript
import { usePrivy } from '@privy-io/react-auth'

export function useAuth() {
  const { user, getAccessToken, login, logout } = usePrivy()

  const walletAddress = user?.linkedAccounts?.find(
    account => account.type === 'wallet' || account.type === 'smart_wallet'
  )?.address

  return { walletAddress, getAccessToken, login, logout }
}
```

### Token Flow

1. User logs in via Privy (email/Google/wallet)
2. Privy creates embedded wallet (email/Google) or connects external wallet
3. Client receives JWT token via `getAccessToken()`
4. Token included in upload requests (clientPayload and Authorization header)
5. Server verifies token via `verifyAccessToken()`
6. Server extracts wallet address from verified user
7. Server validates wallet address matches request

**Security**:
- Tokens signed by Privy (cannot be forged)
- Server validates signature using `PRIVY_APP_SECRET`
- Tokens expire after 1 hour (Privy default)
- Wallet address extracted server-side (cannot be tampered)

---

## Upload Flow (Detailed)

### Step-by-Step Process

1. **File Selection**
   ```typescript
   handleFileSelect(file: File) {
     const error = validateFile(file)
     if (error) return showError(error)

     setIsProcessingImage(true)
     const dims = await getImageDimensions(file)
     const watermarked = await createWatermarkedPreview(file, dims)

     setFile(file)
     setWatermarkedFile(watermarked)
     setDimensions(dims)
   }
   ```

2. **Form Validation**
   ```typescript
   const uploadSchema = z.object({
     title: z.string().min(1, 'Title is required'),
     description: z.string().optional(),
     tags: z.string().optional(),
     price: z.string().refine(val => parseFloat(val) > 0)
   })
   ```

3. **Username Check** (first upload only)
   ```typescript
   const { hasUsername } = await fetch('/api/username/check-user', {
     method: 'POST',
     body: JSON.stringify({ userAddress: walletAddress })
   })

   if (!hasUsername) {
     showUsernameModal()
     return  // Wait for username claim
   }
   ```

4. **Token Acquisition**
   ```typescript
   const accessToken = await getAccessToken()
   ```

5. **Metadata Preparation**
   ```typescript
   const metadata = {
     title, description, tags, price,
     photographerAddress: walletAddress,
     width: dimensions.width,
     height: dimensions.height
   }
   ```

6. **Dual Upload** (parallel)
   ```typescript
   const [originalBlob, watermarkedBlob] = await Promise.all([
     upload(file.name, file, {
       access: 'public',
       handleUploadUrl: '/api/upload',
       clientPayload: JSON.stringify({ ...metadata, type: 'original', accessToken })
     }),
     upload(watermarkedFile.name, watermarkedFile, {
       access: 'public',
       handleUploadUrl: '/api/upload',
       clientPayload: JSON.stringify({ ...metadata, type: 'watermarked', accessToken })
     })
   ])
   ```

7. **Complete Upload**
   ```typescript
   const response = await fetch('/api/upload/complete', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${accessToken}`
     },
     body: JSON.stringify({
       ...metadata,
       originalUrl: originalBlob.url,
       watermarkedUrl: watermarkedBlob.url
     })
   })
   ```

8. **Redirect**
   ```typescript
   router.push('/')
   ```

---

## Security Patterns

### JWT Verification
- All authenticated endpoints use `withAuth()` HOC
- Extracts `Authorization: Bearer <token>` header
- Verifies signature with Privy
- Injects `VerifiedUser` into handler
- Returns `401 Unauthorized` if invalid/missing

### Wallet Address Matching
```typescript
function doWalletAddressesMatch(user: VerifiedUser, address: string): boolean {
  return user.walletAddress.toLowerCase() === address.toLowerCase()
}
```
- Prevents users from uploading/claiming as other wallets
- Case-insensitive comparison (Ethereum addresses)

### Metadata Validation
- All inputs validated with Zod schemas
- Type coercion and transformation
- Custom refinements (e.g., price > 0)
- Ethereum address format: `/^0x[a-fA-F0-9]{40}$/`

### File Type Enforcement
- Client: `ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']`
- Server: Enforced via `allowedContentTypes` in upload token
- Vercel Blob validates MIME type at upload

### Size Limits
- Client: `MAX_FILE_SIZE = 50 * 1024 * 1024` (50MB)
- Server: Enforced via `maximumSizeInBytes` in upload token
- Vercel Blob rejects oversized uploads

### Filename Sanitization
- Server: `addRandomSuffix: true` in upload token config
- Prevents directory traversal attacks
- Prevents URL guessing (unpredictable blob paths)
- Example: `photo.jpg` → `photo-a1b2c3d4.jpg`

---

## Environment Variables

### Required

```bash
# Database (NeonDB)
POSTGRES_URL=postgresql://user:pass@host/database?sslmode=require

# Authentication (Privy)
NEXT_PUBLIC_PRIVY_APP_ID=clxxx...
PRIVY_APP_SECRET=xxx...

# Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx...

# Blockchain (Base)
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
```

### Optional (Future Use)

```bash
# x402 Payment Flow
FACILITATOR_URL=https://facilitator.example.com
FACILITATOR_PRIVATE_KEY=0x...

# Smart Contract
NEXT_PUBLIC_REVENUE_DISTRIBUTOR_ADDRESS=0x...
PLATFORM_TREASURY_ADDRESS=0x...
```

---

## Future Implementation: x402 Payment Flow

### Overview
Users will purchase image licenses via x402 protocol (HTTP 402 Payment Required) with USDC on Base blockchain.

### Flow
1. `GET /api/images/[id]` returns `402 Payment Required`
2. Response includes x402 headers with payment details
3. Client signs EIP-712 message with Privy wallet
4. Client retries with payment proof header
5. Server verifies signature with facilitator
6. Facilitator executes USDC transfer on Base
7. Server calls `RevenueDistributor.distributePayment()` (90/10 split)
8. Server creates license record in database
9. Server returns full-resolution image

### New Database Table
```sql
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES images(id) NOT NULL,
  buyer_address VARCHAR(42) NOT NULL,
  photographer_address VARCHAR(42) NOT NULL,
  price_usdc DECIMAL(10,2) NOT NULL,
  payment_tx_hash VARCHAR(66) NOT NULL,  -- Base transaction hash
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(image_id, buyer_address)  -- One license per user per image
);

CREATE INDEX license_buyer_idx ON licenses(buyer_address);
CREATE INDEX license_payment_tx_idx ON licenses(payment_tx_hash);
```

### Smart Contract
```solidity
// RevenueDistributor.sol
contract RevenueDistributor {
    IERC20 public usdc;
    address public treasury;

    function distributePayment(
        address photographer,
        uint256 amount
    ) external {
        uint256 photographerShare = (amount * 90) / 100;
        uint256 treasuryShare = amount - photographerShare;

        require(usdc.transferFrom(msg.sender, photographer, photographerShare));
        require(usdc.transferFrom(msg.sender, treasury, treasuryShare));

        emit PaymentDistributed(photographer, photographerShare, treasuryShare);
    }
}
```

---

## Testing Strategy

### Unit Tests
- Image processing functions (watermark, dimensions)
- Validation schemas (Zod)
- Utility functions (wallet matching, token extraction)

### Integration Tests
- API endpoints with database
- Upload flow (mock Vercel Blob)
- Authentication (mock Privy)

### E2E Tests (Future)
- Complete upload flow
- Purchase flow
- Username claim flow

**Test Location**: Colocated with source files (e.g., `upload-form.test.tsx`)

---

## Performance Considerations

### Client-Side Processing
- Offloads image processing to user's device
- Reduces server compute costs
- Provides instant preview feedback

### Parallel Uploads
- Original and watermarked files upload simultaneously
- Reduces total upload time by ~50%

### Database Indexes
- `photographer_idx`: Fast lookup of photographer's images
- `created_at_idx`: Fast homepage query (ORDER BY created_at DESC)

### CDN Delivery
- Vercel Blob provides global CDN
- Images served from edge locations
- Low latency worldwide

---

## Known Limitations (MVP)

1. **No Pagination**: Homepage loads all images (will add when > 100 images)
2. **No Search**: Browse only (full-text search planned)
3. **No Payments**: x402 integration pending
4. **No License System**: Database schema ready, flow not implemented
5. **No Image Editing**: Photographers must prepare images externally
6. **Single Price Point**: No license tiers (commercial vs personal)

---

## Deployment Notes

### Vercel
- Automatic deployments from `main` branch
- Preview deployments for PRs
- Environment variables configured in dashboard
- Serverless functions (API routes) auto-scaled

### NeonDB
- Serverless PostgreSQL (auto-scales to zero)
- Connection pooling enabled
- SSL required for connections

### Base Blockchain
- Testnet: Base Sepolia
- Mainnet: Base (pending production deployment)

---

## Development Workflow

1. **Local Development**: `pnpm dev` starts Next.js dev server
2. **Database Changes**: Update Drizzle schema → `pnpm db:push`
3. **Testing**: `pnpm test` runs Vitest suite
4. **Linting**: `pnpm lint` (ESLint + Prettier)
5. **Preview Deploy**: Push to branch → automatic Vercel preview
6. **Production Deploy**: Merge to `main` → automatic Vercel production deploy

---

## References

- **Privy Docs**: https://docs.privy.io
- **Vercel Blob Docs**: https://vercel.com/docs/storage/vercel-blob
- **Drizzle ORM**: https://orm.drizzle.team
- **Base Network**: https://docs.base.org
- **x402 Protocol**: https://github.com/coinbase/x402
