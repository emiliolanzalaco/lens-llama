# LensLlama Long-Term Strategic Roadmap

## Overview

This document outlines the strategic evolution from MVP to a production-ready, Web2-friendly stock photography platform with optional Web3 features. The focus is on making the platform accessible to mainstream users while maintaining technical differentiation.

---

## Phase 1: Web2 Focus (Months 1-6)
**Goal:** Launch with familiar UX, prove product-market fit

### 1.1 Storage Migration: Filecoin → S3/R2
**Status:** High Priority - Architecture Change

#### Tasks
- [ ] Set up AWS S3 or Cloudflare R2 bucket
- [ ] Configure CDN (CloudFront or Cloudflare CDN)
- [ ] Create storage abstraction layer (`lib/storage/interface.ts`)
- [ ] Implement S3/R2 upload adapter
- [ ] Implement S3/R2 download with signed URLs
- [ ] Keep Filecoin adapter as optional backend
- [ ] Update upload API to use new storage interface
- [ ] Update image detail API to serve from CDN
- [ ] Write tests for storage abstraction layer
- [ ] Migrate existing Filecoin CIDs to S3 (if any)
- [ ] Update environment variables (AWS_ACCESS_KEY, S3_BUCKET, etc.)

**Why:** CDN delivery is 10-100x faster than Filecoin gateways. Users expect instant image loads.

**Architecture:**
```typescript
// lib/storage/interface.ts
export interface StorageProvider {
  upload(buffer: Buffer, metadata: ImageMetadata): Promise<StorageResult>
  download(id: string): Promise<Buffer>
  getPublicUrl(id: string): string
}

// lib/storage/s3-adapter.ts
export class S3StorageAdapter implements StorageProvider {
  async upload(buffer: Buffer, metadata: ImageMetadata) {
    const key = `images/${uuid()}.jpg`
    await s3Client.putObject({ Bucket, Key: key, Body: buffer })
    return { storageId: key, url: getCdnUrl(key) }
  }
}

// lib/storage/filecoin-adapter.ts (keep for future archival)
export class FilecoinStorageAdapter implements StorageProvider {
  // Existing Synapse SDK logic
}
```

---

### 1.2 Payment Integration: Add Stripe
**Status:** High Priority - User Onboarding

#### Tasks
- [ ] Install `stripe` package
- [ ] Set up Stripe account and get API keys
- [ ] Create POST /api/checkout/create-session endpoint
- [ ] Create payment success webhook handler
- [ ] Update image detail page: add "Pay with Card" button
- [ ] Show payment method choice: "Pay with Crypto (instant)" vs "Pay with Card"
- [ ] Handle Stripe webhooks to create license records
- [ ] Convert Stripe USD payments to USDC on backend (use Coinbase Commerce or Circle)
- [ ] Still distribute 90% USDC to photographer wallet
- [ ] Update database schema: add payment_method field to licenses table
- [ ] Write tests for Stripe integration
- [ ] Test webhook handling in development (Stripe CLI)

**Why:** Most users don't have crypto wallets. Credit cards = instant onboarding.

**User Flow:**
```
1. User clicks "Buy License"
2. Modal shows two options:
   - "Pay with Card - $5.00" (Stripe)
   - "Pay with Crypto - $5.00 (instant, lower fees)" (x402)
3. If Card: Redirect to Stripe Checkout
4. On success: Webhook creates license → user can download
5. Backend converts USD to USDC → pays photographer
```

**Backend Conversion:**
```typescript
// After Stripe payment succeeds
async function handleStripePayment(session: Stripe.Checkout.Session) {
  const { imageId, buyerAddress } = session.metadata

  // Convert USD to USDC (use Circle or Coinbase Commerce API)
  const usdcAmount = await convertToUSDC(session.amount_total / 100)

  // Transfer USDC to photographer (90%) and treasury (10%)
  await distributeRevenue(imageId, usdcAmount, buyerAddress)

  // Create license record
  await createLicense({ imageId, buyerAddress, paymentMethod: 'stripe' })
}
```

---

### 1.3 C2PA Metadata Integration
**Status:** High Priority - Killer Feature

#### Tasks
- [ ] Research C2PA libraries (Adobe's `c2pa-node` or Truepic SDK)
- [ ] Install chosen C2PA library
- [ ] Create signing certificate (self-signed for dev, CA-signed for prod)
- [ ] Create metadata embedding utility (`lib/c2pa/embed.ts`)
- [ ] Embed C2PA manifest during upload:
  - [ ] Creator wallet address
  - [ ] Upload timestamp
  - [ ] License acquisition URL
  - [ ] LensLlama signature
- [ ] Update watermark/preview generation to preserve C2PA data
- [ ] Add C2PA verification endpoint: GET /api/images/[id]/verify
- [ ] Create UI badge: "C2PA Verified" on licensed images
- [ ] Write tests for C2PA embedding and verification
- [ ] Document metadata schema in technical spec

**Why:** Proves authenticity, enables attribution tracking, differentiates from competitors.

**C2PA Manifest Structure:**
```json
{
  "claim_generator": "LensLlama Platform v1.0",
  "assertions": [
    {
      "label": "c2pa.creative-work",
      "data": {
        "author": [{
          "@type": "Person",
          "name": "alice.lensllama.eth",
          "identifier": "ethereum:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        }],
        "dateCreated": "2024-01-15T10:30:00Z",
        "license": "https://lensllama.com/api/images/abc123",
        "acquireLicensePage": "https://lensllama.com/api/images/abc123/license"
      }
    },
    {
      "label": "c2pa.actions",
      "data": {
        "actions": [
          {
            "action": "c2pa.created",
            "when": "2024-01-15T10:30:00Z",
            "softwareAgent": "LensLlama Upload Service"
          }
        ]
      }
    }
  ],
  "signature": {
    "issuer": "LensLlama Platform",
    "cert_serial": "..."
  }
}
```

---

### 1.4 Smart Watermarking
**Status:** Medium Priority - UX Improvement

#### Tasks
- [ ] Enhance watermark utility to be configurable:
  - [ ] Position (center, diagonal, bottom-right)
  - [ ] Opacity (50%, 70%)
  - [ ] Text ("LensLlama" vs "Unlicensed Preview")
- [ ] Update preview endpoint to always serve watermarked version
- [ ] Add "Licensed by LensLlama" badge to purchased images (bottom corner)
- [ ] Ensure C2PA data persists after watermark application
- [ ] Make watermark subtle enough to see image quality, obvious enough to prevent use
- [ ] Write tests for different watermark styles
- [ ] A/B test watermark styles with users

**Why:** Balance preview value (users need to see the image) with protection (prevent unauthorized use).

---

### 1.5 UI/UX Polish
**Status:** Medium Priority

#### Tasks
- [ ] Redesign homepage: hero section with value prop
- [ ] Add filtering UI: categories, price range
- [ ] Improve image card design: hover effects, quick preview
- [ ] Add "How it works" page explaining licensing
- [ ] Create photographer onboarding tutorial
- [ ] Add image upload progress with percentage
- [ ] Improve error messages (user-friendly language)
- [ ] Add success animations for purchases
- [ ] Mobile responsiveness audit and fixes
- [ ] Accessibility audit (WCAG 2.1 AA compliance)

---

### 1.6 Marketing Site Content
**Status:** Medium Priority

#### Tasks
- [ ] Create landing page copy focused on Web2 benefits:
  - [ ] "Verifiable stock photos with built-in copyright protection"
  - [ ] "90% revenue to photographers, instant payouts"
  - [ ] "License images in seconds, not minutes"
- [ ] Add comparison table: LensLlama vs Shutterstock vs Getty
- [ ] Create photographer sign-up flow with value props
- [ ] Add FAQ section (licensing, payments, usage rights)
- [ ] Create demo video (30-60 seconds)
- [ ] Set up blog for content marketing
- [ ] Add social proof: testimonials, usage stats

---

## Phase 2: Hybrid Model (Months 6-12)
**Goal:** Offer x402 as premium tier, optimize costs

### 2.1 Dual Storage Architecture
**Status:** Strategic - Cost Optimization

#### Tasks
- [ ] Implement automatic archival logic:
  - [ ] Track image access frequency (add view_count, last_accessed_at to images table)
  - [ ] Identify cold images (no views in 90 days)
  - [ ] Create background job to migrate cold images to Filecoin
  - [ ] Update database: add storage_tier field ('hot' | 'cold')
  - [ ] Serve hot images from CDN, cold images from Filecoin gateway
- [ ] Implement lazy migration on access:
  - [ ] If cold image requested, migrate back to S3
  - [ ] Cache in CDN for future requests
- [ ] Add admin dashboard to monitor storage costs
- [ ] Write tests for archival logic
- [ ] Set up monitoring/alerts for failed migrations

**Why:** S3 costs ~$0.023/GB/month. Filecoin costs ~$0.0001/GB/month for long-term storage. 99% of traffic goes to 1% of images.

**Cost Savings Example:**
```
Portfolio: 100,000 images (10TB total)
Hot tier (5TB, 30 days): $115/month (S3)
Cold tier (5TB, archived): $0.50/month (Filecoin)
Total: $115.50/month vs $230/month (all S3)
Savings: ~50% on storage costs
```

---

### 2.2 x402 as "Pro Tier"
**Status:** Strategic - Revenue Optimization

#### Tasks
- [ ] Create pricing tiers:
  - [ ] Standard: Credit card, $5 + processing fee (~$0.30)
  - [ ] Pro: x402 crypto, $5 flat (no extra fees)
- [ ] Add tier selection UI on payment modal
- [ ] Market x402 benefits:
  - [ ] "Instant download (no waiting for transaction confirmation)"
  - [ ] "Lower fees (save $0.30 per purchase)"
  - [ ] "Bulk licensing API (pay programmatically)"
- [ ] Add x402 onboarding tutorial for first-time crypto users
- [ ] Track adoption metrics: x402 vs Stripe usage ratio
- [ ] Offer discounts for x402 users (e.g., 10% off)

**Why:** x402 is genuinely better UX for crypto users. Don't force it, offer it as upgrade.

---

### 2.3 Photographer Crypto Payouts
**Status:** Medium Priority

#### Tasks
- [ ] Add payment preference settings for photographers:
  - [ ] USDC to wallet (instant)
  - [ ] Bank transfer (weekly batch, via Stripe Connect)
- [ ] Implement Stripe Connect for bank payouts
- [ ] Show payout history in photographer dashboard
- [ ] Add tax reporting (1099 generation for US photographers)
- [ ] Write tests for payout logic
- [ ] Handle payout failures gracefully (retry, notify)

**Why:** Some photographers prefer fiat. Give them choice while defaulting to crypto (better economics).

---

### 2.4 API for Programmatic Access
**Status:** High Priority - AI Agent Enablement

#### Tasks
- [ ] Design REST API:
  - [ ] GET /api/v1/images (search, filter)
  - [ ] GET /api/v1/images/[id] (with x402 headers)
  - [ ] POST /api/v1/licenses (submit payment proof)
- [ ] Add API key authentication
- [ ] Create developer documentation (OpenAPI spec)
- [ ] Build API playground (interactive docs)
- [ ] Add rate limiting (per API key)
- [ ] Create pricing tiers:
  - [ ] Free: 10 requests/day
  - [ ] Pro: 1,000 requests/day, $49/month
  - [ ] Enterprise: Unlimited, custom pricing
- [ ] Write SDK examples (Python, JavaScript)
- [ ] Monitor API usage and popular endpoints

**Why:** AI agents can't use credit card checkouts. They need programmatic x402 payments.

---

## Phase 3: AI Agent Focus (Year 2+)
**Goal:** Become the API for AI-generated content licensing

### 3.1 MCP Server Integration
**Status:** Future - AI Platform Integration

#### Tasks
- [ ] Build Model Context Protocol (MCP) server
- [ ] Create tools:
  - [ ] `search_stock_photos(query, max_price)`
  - [ ] `license_image(image_id, budget)`
  - [ ] `get_license_proof(image_id)`
- [ ] Integrate with Claude Desktop (via MCP registry)
- [ ] Submit to MCP registry for discovery
- [ ] Write documentation for AI platforms
- [ ] Partner with Anthropic, OpenAI for official integration
- [ ] Track usage: % of purchases from AI agents vs humans

**Example MCP Tool:**
```json
{
  "name": "license_image",
  "description": "License a stock photo via x402 payment",
  "parameters": {
    "image_id": "abc123",
    "max_budget_usdc": "10.00"
  },
  "returns": {
    "license_url": "https://lensllama.com/download/abc123?token=...",
    "cost_usdc": "5.00",
    "photographer": "alice.lensllama.eth"
  }
}
```

---

### 3.2 Bulk Licensing & Budget Controls
**Status:** Future - Enterprise Feature

#### Tasks
- [ ] Create bulk licensing API:
  - [ ] POST /api/v1/licenses/bulk (array of image IDs)
  - [ ] Single x402 payment for multiple images
  - [ ] Discounts for bulk purchases (10+ images)
- [ ] Add budget controls for API keys:
  - [ ] Set spending limit per day/month
  - [ ] Alert when 80% of budget used
  - [ ] Auto-pause when limit reached
- [ ] Create organization accounts (multi-user API keys)
- [ ] Add usage analytics dashboard
- [ ] Write tests for bulk operations

**Why:** AI content pipelines need to license hundreds of images daily. Make it easy.

---

### 3.3 Advanced Search & Discovery
**Status:** Future - User Retention

#### Tasks
- [ ] Implement full-text search (Elasticsearch or Typesense)
- [ ] Add semantic search (image embeddings via CLIP)
- [ ] Create recommendation engine (similar images)
- [ ] Add reverse image search (upload image, find similar)
- [ ] Track search queries for SEO insights
- [ ] Write tests for search relevance

**Why:** Better discovery = more sales. AI agents need semantic search.

---

### 3.4 Platform Integrations
**Status:** Future - Distribution

#### Tasks
- [ ] Build Adobe Creative Cloud plugin
  - [ ] Search LensLlama from Photoshop/Illustrator
  - [ ] Validate licenses before export
  - [ ] One-click x402 payment
- [ ] Build Canva app
  - [ ] Search and license images in Canva editor
- [ ] Build Figma plugin
  - [ ] Drag-and-drop licensed images into designs
- [ ] Partner with AI platforms:
  - [ ] ChatGPT plugin
  - [ ] Claude integration (via MCP)
  - [ ] Midjourney/DALL-E metadata embedding

**Why:** Meet users where they work. Make licensing invisible.

---

## Infrastructure & Operations

### I.1 Monitoring & Observability
**Status:** Ongoing

#### Tasks
- [ ] Set up error tracking (Sentry)
- [ ] Add performance monitoring (Vercel Analytics)
- [ ] Create custom dashboards:
  - [ ] Daily sales volume
  - [ ] Payment method breakdown (x402 vs Stripe)
  - [ ] Storage costs (S3 vs Filecoin)
  - [ ] API usage metrics
- [ ] Set up alerts:
  - [ ] Payment failures
  - [ ] Storage migration failures
  - [ ] API rate limit breaches
- [ ] Add user analytics (PostHog or Mixpanel)

---

### I.2 Security Hardening
**Status:** Ongoing

#### Tasks
- [ ] Implement rate limiting (per IP, per user)
- [ ] Add CAPTCHA to upload form (prevent spam)
- [ ] Set up WAF (Cloudflare or AWS WAF)
- [ ] Regular security audits (smart contracts, backend)
- [ ] Implement image hash deduplication (prevent piracy)
- [ ] Add DMCA takedown process
- [ ] Set up bug bounty program
- [ ] Conduct penetration testing

---

### I.3 Database Optimization
**Status:** As Needed

#### Tasks
- [ ] Add database indexes for common queries
- [ ] Set up read replicas (for high traffic)
- [ ] Implement query caching (Redis)
- [ ] Optimize image metadata queries
- [ ] Archive old license records (>1 year)
- [ ] Monitor slow queries and optimize

---

## Deprecation & Removal

### D.1 Simplify Filecoin (Phase 1)
**Status:** High Priority

#### Tasks
- [ ] Remove Filecoin as primary storage
- [ ] Keep Filecoin adapter for archival only
- [ ] Update documentation to reflect S3-first approach
- [ ] Remove `@filoz/synapse-sdk` from critical path
- [ ] Update environment variable documentation
- [ ] Remove Filecoin from marketing materials (move to "under the hood")

**Why:** Simplify operations. Filecoin becomes implementation detail, not selling point.

---

### D.2 Optional Crypto Wallet (Phase 1)
**Status:** High Priority

#### Tasks
- [ ] Make Privy wallet creation optional
- [ ] Allow guest checkout with email only (via Stripe)
- [ ] Create wallet only when user wants x402 benefits
- [ ] Update onboarding flow to de-emphasize crypto
- [ ] Marketing shift: "Pay with credit card or crypto"

**Why:** Reduce onboarding friction. Wallet should be upgrade, not requirement.

---

### D.3 Retire ERC-6492 Facilitator Fork (Phase 2)
**Status:** Conditional - Depends on Upstream

#### Tasks
- [ ] Monitor coinbase/x402 for ERC-6492 support
- [ ] If merged upstream: switch back to official package
- [ ] If not merged: maintain fork or switch to alternative

**Why:** Reduce maintenance burden. Only fork if necessary.

---

## Success Metrics

### Phase 1 Targets (Months 1-6)
- [ ] 500+ images uploaded
- [ ] 100+ paying customers
- [ ] 80%+ payments via Stripe (credit card)
- [ ] <2s average image load time (CDN)
- [ ] 50%+ photographer retention (2+ uploads)

### Phase 2 Targets (Months 6-12)
- [ ] 5,000+ images in catalog
- [ ] 1,000+ licenses sold
- [ ] 20%+ payments via x402 (crypto adoption)
- [ ] 50%+ storage cost reduction (archival)
- [ ] 10+ API customers (developer signups)

### Phase 3 Targets (Year 2+)
- [ ] 50,000+ images
- [ ] 10,000+ monthly active users
- [ ] 30%+ purchases from AI agents
- [ ] $100k+ monthly GMV (gross merchandise value)
- [ ] Partnerships with 3+ major platforms (Adobe, Canva, etc.)

---

## Quick Reference: Technology Decisions

| Component | Current (MVP) | Phase 1 (Web2) | Phase 2+ (Hybrid) |
|-----------|--------------|----------------|-------------------|
| Storage | Filecoin | S3/R2 | S3 (hot) + Filecoin (cold) |
| Payments | x402 only | Stripe + x402 | Stripe (default), x402 (pro) |
| Auth | Privy (wallet required) | Email + optional wallet | Same |
| Metadata | Basic EXIF | C2PA signed | C2PA + on-chain registry |
| API | None | REST (basic) | REST + MCP + SDKs |

---

## Questions & Decisions Needed

1. **Stripe vs Circle for USD→USDC conversion?**
   - Stripe Connect (easier) vs Circle (crypto-native)

2. **C2PA certificate authority?**
   - Self-signed (free, lower trust) vs CA-signed (costly, higher trust)

3. **Hosting for archival worker?**
   - Vercel Cron (simple) vs separate service (Fly.io, Railway)

4. **Open-source the platform?**
   - Could attract contributors, but exposes architecture

5. **Photographer KYC for payouts?**
   - Required for bank transfers, not for crypto. When to require?

---

## Notes

_Track important context, decisions, and blockers here as development progresses._
