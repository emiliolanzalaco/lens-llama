# LensLlama Development Tasks

## How to Use

**For Engineers:**
- Claim a task by adding your name and creating the branch
- Update checkboxes as you progress: `[ ]` → `[x]`
- Commit this file to keep others updated
- Pull before starting to see latest assignments

**For AI Agents:**
- **TECHNICAL_SPEC is your primary reference** - it contains all architecture, schemas, and implementation details
- Use Context7 MCP for library documentation (Privy, Drizzle, Viem, Sharp, Next.js)
- Use Vercel MCP for deployment and debugging
- Do not reference AI/Claude in commits or PRs - author as the GitHub user

---

## Workflow

**Development cycle:** Write tests → Implement → Run tests → Build locally → Push PR

**Commits:** Use conventional commits (feat:, fix:, test:, docs:, refactor:). Keep messages concise and single-line.

**Authorship:** All commits authored by the engineer. No AI attribution.

---

## Testing Guidelines

### Test Pyramid

```
      /\        E2E (few)
     /  \       - Full purchase flow
    /----\      - Upload to download
   /      \
  /--------\    Integration (some)
 /          \   - API endpoints
/------------\  - Database operations
      ||
     ====       Unit (many)
                - Encryption/decryption
                - Image processing
                - Utilities
```

**Target coverage:** 70% unit, 20% integration, 10% E2E

### Black-Box Testing

Test inputs and outputs, not implementation details.

```typescript
// ✅ GOOD: Tests behavior
it('encrypts and decrypts back to original', async () => {
  const input = Buffer.from('test data')
  const key = generateKey()
  const encrypted = await encryptImage(input, key)
  const decrypted = await decryptImage(encrypted, key)
  expect(decrypted).toEqual(input)
})

// ❌ BAD: Tests implementation
it('uses AES-256-CBC cipher', async () => {
  const spy = jest.spyOn(crypto, 'createCipheriv')
  await encryptImage(input, key)
  expect(spy).toHaveBeenCalledWith('aes-256-cbc', ...)
})
```

**Key principles:**
- Test the contract, not the code
- Assert on outputs only (return values, HTTP responses, rendered UI)
- Avoid mocking internals
- Tests should survive refactoring

### Test File Location

**Colocate tests with the code they test.** Do not use a separate `__tests__` folder.

```
components/
  ImageCard.tsx
  ImageCard.test.tsx    ✅ colocated

lib/
  encryption.ts
  encryption.test.ts    ✅ colocated

app/api/images/
  route.ts
  route.test.ts         ✅ colocated
```

Naming: `[filename].test.ts` or `[filename].test.tsx`

---

## Phase 1: Foundation

### 1.1 Project Setup
- [x] Initialize Next.js 14 with App Router, TypeScript, TailwindCSS
- [x] Configure ESLint and Prettier
- [x] Set up Jest or Vitest for testing
- [x] Create folder structure: app/, lib/, components/, db/
- [x] Set up .env.example with all required variables
- [x] Configure GitHub Actions for CI (lint, types, tests, build)

**Branch:** `setup/project-init` | **Assigned:** _complete_

### 1.2 Database Schema
- [x] Install and configure Drizzle ORM
- [x] Create images table schema (see TECHNICAL_SPEC for fields including encryption_key)
- [x] Implement encryption-at-rest for encryption_key field using MASTER_ENCRYPTION_KEY
- [x] Create licenses table schema
- [x] Write migration files
- [x] Create required indexes (photographer lookup, license verification)
- [x] Write integration tests for database operations
- [x] Test connection to Neon Postgres

**Branch:** `setup/database` | **Assigned:** _complete_

### 1.3 Privy Authentication
- [x] Install Privy SDK (@privy-io/react-auth)
- [x] Create PrivyProvider wrapper component
- [x] Configure login methods: email, Google, external wallet
- [x] Enable embedded wallet creation for email/Google users
- [x] Simple UI using ShadcnCn/ui MCP components for authentication form
- [x] Create useAuth hook exposing user and wallet
- [x] Write tests for auth state management
- [x] Manually test login/logout flow

**Branch:** `feature/privy-auth` | **Assigned:** _in progress_

---

## Phase 2: Storage & Upload

### 2.1 Synapse SDK Integration
- [x] Install @filoz/synapse-sdk
- [x] Create Synapse client singleton with private key config
- [x] Implement upload function (see TECHNICAL_SPEC for encryption flow)
- [x] Implement download function with decryption
- [x] Add error handling and retry logic for network failures
- [x] Write unit tests for client configuration
- [ ] Test full upload → download round-trip with Filecoin testnet

**Branch:** `feature/synapse-storage` | **Assigned:** _in progress_

### 2.2 Image Processing
- [x] Install Sharp
- [x] Create watermark function: diagonal "LensLlama" text, semi-transparent
- [x] Create resize function: max 1200px width, maintain aspect ratio
- [x] Create AES-256-CBC encryption utility (see TECHNICAL_SPEC for code)
- [x] Create matching decryption utility
- [x] Write unit tests for each function
- [x] Test with JPEG, PNG, WebP formats
- [x] Test edge cases: very large images, small images

**Branch:** `feature/image-processing` | **Assigned:** _complete_

### 2.3 Upload API Endpoint
- [ ] Create POST /api/upload route handler
- [ ] Validate file: size (max 20MB), format (JPEG/PNG/WebP)
- [ ] Generate watermarked preview with Sharp
- [ ] Encrypt full resolution with AES-256
- [ ] Upload both to Filecoin via Synapse SDK
- [ ] Save to database: CIDs, encryption key, metadata
- [ ] Return encrypted_cid, watermarked_cid, id
- [ ] Write integration tests for success and error cases
- [ ] Add rate limiting

**Branch:** `feature/upload-api` | **Assigned:** _unclaimed_

### 2.4 Upload Page UI
- [ ] Create /upload page (protected - requires Privy auth)
- [ ] Build drag-and-drop file upload component
- [ ] Add form fields: title, description, tags (comma-separated), price (USDC)
- [ ] Client-side validation before submit
- [ ] Show upload progress indicator
- [ ] Handle success: redirect to homepage
- [ ] Handle errors: display user-friendly message
- [ ] Write component tests

**Branch:** `feature/upload-ui` | **Assigned:** _unclaimed_

---

## Phase 3: Browse & Display

### 3.1 Images List API
- [ ] Create GET /api/images route handler
- [ ] Query all images from database
- [ ] Return: watermarked_cid, title, price, photographer_address, id
- [ ] Order by created_at DESC
- [ ] Write integration tests
- [ ] Test empty database case

**Branch:** `feature/images-list-api` | **Assigned:** _unclaimed_

### 3.2 Homepage UI
- [ ] Create homepage with hero section
- [ ] Build responsive image grid (4 cols desktop, 2 cols mobile)
- [ ] Create ImageCard component: thumbnail from IPFS, title, price
- [ ] Fetch images from /api/images on load
- [ ] Link each card to /image/[id]
- [ ] Add loading skeleton state
- [ ] Write component tests

**Branch:** `feature/homepage` | **Assigned:** _unclaimed_

### 3.3 Image Detail API (x402)
- [ ] Create GET /api/images/[id] route handler
- [ ] Check for existing license in database (buyer + image)
- [ ] Check for x402 payment proof in request headers
- [ ] If no license and no payment: return 402 with x402 headers + watermarked preview
- [ ] If valid payment proof: verify → split revenue → create license → return decrypted image
- [ ] If license exists: return decrypted image (re-download)
- [ ] Write integration tests for all three paths
- [ ] Test invalid image ID, invalid payment proof

**Branch:** `feature/image-detail-api` | **Assigned:** _unclaimed_

### 3.4 Image Detail Page UI
- [ ] Create /image/[id] page
- [ ] Display large watermarked preview from IPFS
- [ ] Show title, photographer address (truncated), price
- [ ] Build "Buy License" button
- [ ] On click: trigger Privy login if needed
- [ ] Implement purchase flow: sign message → send payment proof → receive image
- [ ] Trigger download of decrypted image
- [ ] Handle loading and error states
- [ ] Write component tests
- [ ] E2E test for complete purchase flow

**Branch:** `feature/image-detail-ui` | **Assigned:** _unclaimed_

---

## Phase 4: Payments

### 4.1 Smart Contract
- [ ] Write RevenueDistributor.sol (see TECHNICAL_SPEC)
- [ ] Implement distributePayment(photographer, amount): 90% to photographer, 10% to treasury
- [ ] Emit PaymentDistributed event
- [ ] Write Hardhat unit tests
- [ ] Test edge cases: zero amount, same address for both parties
- [ ] Security review: access control, zero address validation, event emission
- [ ] Deploy to Base Sepolia testnet
- [ ] Verify contract on Basescan
- [ ] Test with real transactions on testnet
- [ ] Deploy to Base Mainnet
- [ ] Verify mainnet contract

**Branch:** `feature/smart-contract` | **Assigned:** _unclaimed_

### 4.2 x402 Facilitator
- [ ] Fork @standard/x402-facilitator repository
- [ ] Study existing /verify and /settle endpoints
- [ ] Implement ERC-6492 signature parsing (see TECHNICAL_SPEC for problem description)
- [ ] Update /verify to handle undeployed smart wallet signatures
- [ ] Write unit tests for signature parsing
- [ ] Test with EOA signatures
- [ ] Test with Coinbase Smart Wallet signatures
- [ ] Deploy facilitator service (Vercel/Railway)
- [ ] Fund facilitator wallet with ETH for gas
- [ ] Set up logging and monitoring

**Branch:** `feature/x402-facilitator` | **Assigned:** _unclaimed_

### 4.3 Payment Flow Integration
- [ ] Create EIP-712 typed data message builder for x402
- [ ] Integrate with Privy wallet for signing
- [ ] Send signed message as payment proof header
- [ ] Backend: call facilitator /verify endpoint
- [ ] Backend: call facilitator /settle endpoint
- [ ] Backend: call RevenueDistributor.distributePayment()
- [ ] Backend: create license record in database
- [ ] Backend: download, decrypt, return image
- [ ] Write integration tests
- [ ] E2E test: full payment with embedded wallet
- [ ] E2E test: full payment with MetaMask
- [ ] Test insufficient funds scenario

**Branch:** `feature/payment-flow` | **Assigned:** _unclaimed_

---

## Phase 5: Polish & Deploy

### 5.1 Error Handling
- [ ] Add React error boundaries
- [ ] Create user-friendly error messages (no technical jargon)
- [ ] Add loading states for all async operations
- [ ] Implement retry logic for Filecoin operations
- [ ] Add toast notifications for success/error feedback

**Branch:** `feature/error-handling` | **Assigned:** _unclaimed_

### 5.2 CI/CD Setup
- [ ] Configure GitHub Actions workflow
- [ ] On PR: run lint, typecheck, unit tests, integration tests, build
- [ ] On PR: create Vercel preview deployment
- [ ] On merge to main: run E2E tests
- [ ] On merge to main: auto-deploy to production
- [ ] Set up Slack/Discord notifications for deploy status

**Branch:** `setup/ci-cd` | **Assigned:** _unclaimed_

### 5.3 Deployment
- [ ] Configure Vercel project (use Vercel MCP)
- [ ] Set all environment variables in Vercel dashboard
- [ ] Connect GitHub repository
- [ ] Deploy to production
- [ ] Smoke test: upload, browse, purchase, download
- [ ] Verify transactions on Basescan

**Branch:** `deploy/production` | **Assigned:** _unclaimed_

### 5.4 Demo Prep
- [ ] Seed database with 15-20 high-quality sample images
- [ ] Create demo photographer wallet
- [ ] Fund demo buyer wallet with USDC
- [ ] Write demo script (step-by-step)
- [ ] Practice demo run-through
- [ ] Record backup video in case of technical issues

**Branch:** `demo/seed-data` | **Assigned:** _unclaimed_

---

## Stretch Goals

### S1. Search
- [ ] Add search bar component to homepage
- [ ] Create GET /api/images/search endpoint
- [ ] Implement LIKE query on title, description, tags
- [ ] Debounce search input
- [ ] Write tests

**Branch:** `stretch/search` | **Assigned:** _unclaimed_

### S2. Categories
- [ ] Add category field to images table (migration)
- [ ] Add category filter buttons to homepage
- [ ] Filter API results by category
- [ ] Write tests

**Branch:** `stretch/categories` | **Assigned:** _unclaimed_

### S3. Photographer Profiles
- [ ] Create photographers table with display_name
- [ ] Auto-register on first upload
- [ ] Display name instead of truncated wallet address
- [ ] Write tests

**Branch:** `stretch/profiles` | **Assigned:** _unclaimed_

---

## Notes & Blockers

_Add any blockers, questions, or dependencies here:_

-

---

## Quick Reference

### Environment Variables
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

### Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run all tests
npm run lint         # Run linter
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed demo data
```

### Key Documentation
- **TECHNICAL_SPEC** - Primary reference for all implementation details
- **Context7 MCP** - Use for up-to-date library docs
- **Vercel MCP** - Use for deployment operations
