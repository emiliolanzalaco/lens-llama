# LensLlama Development Tasks

## Current Status

**✅ Core Platform Complete:**
- Privy authentication (email, Google, wallet)
- Upload flow with client-side watermarking
- Vercel Blob storage (original + watermarked)
- Image browsing and detail pages
- x402 payment integration (Base Sepolia testnet)
- Username system
- Database schema and migrations

**🎯 Launch Goal:** 4-6 week MVP with core photographer value prop

---

## Outstanding MVP Tasks

### Critical Path to Launch

#### 1. Base Mainnet Migration
**Priority:** P0 (blocks real transactions)

- [ ] Update network constants to Base mainnet
  - [ ] Change `NETWORK = 'base'` in `apps/web/lib/x402/constants.ts`
  - [ ] Update `USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'`
- [ ] Update viem chain imports
  - [ ] Replace `baseSepolia` with `base` in `use-x402-payment.ts`
  - [ ] Update chainId to `8453`
  - [ ] Update hardcoded `network: 'base-sepolia'` strings
- [ ] Configure facilitator for Base mainnet
  - [ ] Update facilitator RPC endpoint to `https://mainnet.base.org`
  - [ ] Fund facilitator wallet with mainnet ETH for gas
  - [ ] Test facilitator /verify and /settle endpoints
- [ ] Update environment variables
  - [ ] `NEXT_PUBLIC_BASE_RPC_URL` → mainnet RPC
  - [ ] Verify all Base-related configs
- [ ] Testing
  - [ ] Test full payment flow on mainnet
  - [ ] Verify USDC transfers on Basescan
  - [ ] Test with small amounts first ($1-5)

**Branch:** `feature/base-mainnet-migration`

---

#### 2. C2PA Credentialing
**Priority:** P0 (core value prop - proof of ownership)

- [ ] Research C2PA implementation options
  - [ ] Evaluate `c2pa-node` library
  - [ ] Determine client-side vs server-side approach
  - [ ] Decide on signing key management
- [ ] Implement C2PA manifest creation
  - [ ] Add photographer wallet address to credentials
  - [ ] Add x402 licensing URL
  - [ ] Add upload timestamp
  - [ ] Sign manifest with platform key
- [ ] Integrate into upload flow
  - [ ] Add C2PA manifest to original image before Blob upload
  - [ ] Preserve C2PA data in watermarked preview
  - [ ] Store C2PA signature in database (optional)
- [ ] Add C2PA verification endpoint
  - [ ] Create `/api/images/[id]/verify` route
  - [ ] Parse and validate C2PA manifest
  - [ ] Return credential details to UI
- [ ] UI indicators
  - [ ] Show "Verified" badge on images with valid C2PA
  - [ ] Display credential details on image page
  - [ ] Add "What is this?" explanation modal
- [ ] Testing
  - [ ] Test C2PA creation and verification
  - [ ] Verify credentials survive image processing
  - [ ] Test with multiple image formats

**Branch:** `feature/c2pa-credentials`

**Reference:** https://c2pa.org/specifications/specifications/1.0/specs/C2PA_Specification.html

---

#### 3. Infringement Search (The Hook)
**Priority:** P0 (acquisition engine)

- [ ] Research reverse image search APIs
  - [ ] Evaluate Google Vision API
  - [ ] Evaluate TinEye API
  - [ ] Compare pricing (~$0.02/search target)
  - [ ] Choose provider
- [ ] Implement search service
  - [ ] Create `/lib/infringement/search.ts` module
  - [ ] Implement API client for chosen provider
  - [ ] Add rate limiting
  - [ ] Add result caching (avoid duplicate searches)
- [ ] Create search API endpoint
  - [ ] POST `/api/infringement/search` route
  - [ ] Require authentication
  - [ ] Accept image ID or upload
  - [ ] Return list of URLs where image found
  - [ ] Track searches in database for monitoring unlock
- [ ] Search UI
  - [ ] Add "Check for theft" button on image detail page
  - [ ] Show search progress/loading state
  - [ ] Display results: URL, thumbnail, "Send DMCA" action
  - [ ] Show "No infringements found" success state
  - [ ] Track search history for photographer
- [ ] Free tier implementation
  - [ ] Allow 3 free searches per photographer
  - [ ] Show "X searches remaining" counter
  - [ ] Upsell to unlock more via sales
- [ ] Testing
  - [ ] Test with known infringing URLs
  - [ ] Test with clean images (no results)
  - [ ] Test rate limits and caching

**Branch:** `feature/infringement-search`

---

#### 4. DMCA Template Generator
**Priority:** P1 (conversion tool - turns anger into action)

- [ ] Create DMCA template service
  - [ ] Build `/lib/infringement/dmca-template.ts`
  - [ ] Template with photographer details, image URL, infringing URL
  - [ ] Include C2PA proof if available
  - [ ] Add platform contact info as service provider
- [ ] DMCA endpoint
  - [ ] POST `/api/infringement/dmca` route
  - [ ] Accept photographer info + infringement details
  - [ ] Generate filled template
  - [ ] Return as downloadable .txt or PDF
- [ ] UI integration
  - [ ] "Send DMCA" button next to each search result
  - [ ] Modal with form: photographer name, email, address (required for DMCA)
  - [ ] Show generated DMCA in preview
  - [ ] Copy to clipboard button
  - [ ] Download as file button
  - [ ] Instructions: "Send this to [platform]'s DMCA agent"
- [ ] "Convert to customer" flow
  - [ ] Alternative action: "Offer license" button
  - [ ] Pre-fill email template: "I found my photo on your site. License it here: [link]"
  - [ ] Track conversions (infringement → sale)
- [ ] Testing
  - [ ] Validate DMCA template against legal requirements
  - [ ] Test with various platforms (Medium, WordPress, etc.)
  - [ ] User test with photographers

**Branch:** `feature/dmca-generator`

**Legal Reference:** 17 U.S.C. § 512(c)(3)

---

#### 5. Photographer Storefronts
**Priority:** P1 (photographers bring their own traffic)

- [ ] Create storefront page
  - [ ] New route: `/photographer/[usernameOrAddress]`
  - [ ] Fetch all images by photographer
  - [ ] Display in grid (similar to homepage)
  - [ ] Show photographer name/username at top
  - [ ] Show total images count
  - [ ] Add shareable URL
- [ ] Storefront API
  - [ ] GET `/api/photographers/[id]/images` endpoint
  - [ ] Support lookup by username or wallet address
  - [ ] Return all public images
  - [ ] Include photographer metadata
- [ ] Shareable features
  - [ ] Meta tags for social sharing (Open Graph)
  - [ ] "Share storefront" button (copy link)
  - [ ] QR code generator for storefront URL
- [ ] Discovery
  - [ ] Add "Visit photographer" link on image detail pages
  - [ ] Link from username on homepage cards
- [ ] Testing
  - [ ] Test with photographers with 1, 10, 50+ images
  - [ ] Test username vs wallet address routing
  - [ ] Test social share previews

**Branch:** `feature/photographer-storefronts`

---

#### 6. Sales-Based Monitoring Tiers
**Priority:** P2 (retention mechanism)

- [ ] Add monitoring status to database
  - [ ] Add `total_sales_usdc` column to photographers table (or compute from licenses)
  - [ ] Add `monitoring_tier` enum: none, weekly, daily
  - [ ] Add `last_monitored_at` timestamp per image
- [ ] Tier calculation service
  - [ ] Create `/lib/monitoring/tier-calculator.ts`
  - [ ] $0-49: no monitoring
  - [ ] $50-199: weekly monitoring on sold images only
  - [ ] $200+: daily monitoring on full portfolio
- [ ] Monitoring job scheduler
  - [ ] Set up cron job or scheduled task
  - [ ] Query images due for monitoring based on tier
  - [ ] Run infringement search for each
  - [ ] Store results in database
  - [ ] Email photographer if new infringements found
- [ ] Monitoring dashboard
  - [ ] Add `/dashboard/monitoring` page
  - [ ] Show current tier and sales progress
  - [ ] Display tier unlock roadmap: "Sell $X more to unlock weekly monitoring"
  - [ ] Show monitoring history (scans performed, infringements found)
  - [ ] List active infringements with DMCA actions
- [ ] Email notifications
  - [ ] Set up email service (Resend/SendGrid)
  - [ ] Template: "New infringement detected"
  - [ ] Include infringing URL and DMCA action link
- [ ] Cost management
  - [ ] Track search API costs in database
  - [ ] Alert if costs exceed 20% of platform fee revenue
  - [ ] Add ability to pause monitoring if needed
- [ ] Testing
  - [ ] Test tier calculations
  - [ ] Test monitoring job execution
  - [ ] Test email delivery
  - [ ] Monitor API costs in production

**Branch:** `feature/sales-monitoring`

---

### Polish & Launch Prep

#### 7. Landing Page
**Priority:** P2 (acquisition)

- [ ] Create marketing landing page at `/`
  - [ ] Hero: "Your photos. Your income. Protected."
  - [ ] Value props: 90% revenue, x402 payments, infringement protection
  - [ ] "Upload your first photo" CTA
  - [ ] "See where your photos are stolen" free search CTA
  - [ ] Photographer testimonials (add after beta)
- [ ] Move image grid to `/browse` or `/marketplace`
- [ ] Add navigation
  - [ ] Header: Logo, Browse, Upload, Dashboard, Login
  - [ ] Footer: Docs, Contact, Terms, Privacy

**Branch:** `feature/landing-page`

---

#### 8. Photographer Dashboard
**Priority:** P2 (engagement)

- [ ] Create `/dashboard` page
  - [ ] Sales summary: total earnings, image count, license count
  - [ ] Revenue chart (sales over time)
  - [ ] Recent licenses table
  - [ ] Monitoring tier status
  - [ ] Quick actions: Upload, Check infringement
- [ ] Dashboard API
  - [ ] GET `/api/dashboard/stats` endpoint
  - [ ] Return sales totals, license count, monitoring status
  - [ ] Calculate from licenses table

**Branch:** `feature/dashboard`

---

#### 9. Error Handling & Polish
**Priority:** P2 (UX)

- [ ] Add error boundaries to key pages
- [ ] User-friendly error messages
  - [ ] Payment failures: "Transaction failed. Please try again."
  - [ ] Upload failures: "Upload failed. Check your connection."
  - [ ] Search failures: "Search unavailable. Try again later."
- [ ] Loading states for all async operations
- [ ] Toast notifications (Sonner)
  - [ ] Success: "Image uploaded successfully"
  - [ ] Error: "Payment failed"
  - [ ] Info: "Checking for infringements..."
- [ ] Empty states
  - [ ] No images: "Upload your first photo"
  - [ ] No infringements: "No theft detected!"
  - [ ] No sales: "Share your storefront to get started"

**Branch:** `polish/ux-improvements`

---

#### 10. Production Deployment
**Priority:** P0 (launch blocker)

- [ ] Environment setup
  - [ ] Configure production environment variables in Vercel
  - [ ] Set mainnet RPC URLs
  - [ ] Configure production database
  - [ ] Set up production facilitator
- [ ] Security audit
  - [ ] Review all API routes for auth checks
  - [ ] Verify payment verification logic
  - [ ] Check for SQL injection vulnerabilities
  - [ ] Rate limiting on expensive endpoints
- [ ] Monitoring
  - [ ] Set up Vercel Analytics
  - [ ] Add error tracking (Sentry)
  - [ ] Set up uptime monitoring
  - [ ] Alert on facilitator failures
- [ ] Deploy
  - [ ] Deploy to Vercel production
  - [ ] Verify all features work in production
  - [ ] Test payment flow end-to-end
  - [ ] Smoke test: upload, search, purchase, download
- [ ] Post-deploy
  - [ ] Monitor error rates
  - [ ] Check API costs (infringement search)
  - [ ] Watch facilitator gas usage

**Branch:** `deploy/production`

---

## Post-Launch (Phase 2)

### Revenue Split Smart Contract
- [ ] Deploy RevenueDistributor.sol to Base mainnet
- [ ] Implement 90/10 split: photographer/platform
- [ ] Integrate into payment flow (replace direct transfers)
- [ ] Update facilitator to call contract

### MCP Server (Agent Commerce)
- [ ] Create LensLlama MCP server
- [ ] Implement `search_stock_photos` tool
- [ ] Implement `license_image` tool
- [ ] Add x402 payment handling for agents
- [ ] Publish to MCP registry

### AI-Powered Features
- [ ] Automatic tagging on upload (Vision API)
- [ ] Smart search (semantic similarity)
- [ ] Suggested pricing based on image quality

---

## Testing Strategy

### Test Pyramid
```
      /\        E2E (few)
     /  \       - Full purchase flow
    /----\      - Upload → browse → purchase → download
   /      \
  /--------\    Integration (some)
 /          \   - API endpoints with database
/------------\  - Payment flow with facilitator
      ||
     ====       Unit (many)
                - Image processing
                - Utilities
                - Business logic
```

### Key Test Scenarios
1. **Happy path:** Upload → watermark → list → purchase → download
2. **Infringement flow:** Upload → search → find theft → generate DMCA
3. **Monitoring unlock:** Make sales → unlock tier → receive alerts
4. **Payment edge cases:** Insufficient funds, invalid signature, timeout

---

## Commands

```bash
pnpm dev                 # Start dev server
pnpm build               # Production build
pnpm test                # Run all tests
pnpm test:unit           # Unit tests only
pnpm test:integration    # Integration tests only
pnpm lint                # Run linter
pnpm db:migrate          # Run database migrations
pnpm db:studio           # Open Drizzle Studio
```

---

## Key Documentation

- **VALUE_PROPOSITION.md** - Business model and product vision
- **TECHNICAL_SPEC.md** - Architecture and implementation details
- **STYLE_GUIDE.md** - UI/UX design system
- **CLAUDE.md** - Code principles and guidelines

---

## Environment Variables

### Required for Production
```
# Database
POSTGRES_URL

# Auth
NEXT_PUBLIC_PRIVY_APP_ID
PRIVY_APP_SECRET

# Storage
BLOB_READ_WRITE_TOKEN

# x402 Payment
FACILITATOR_URL
NEXT_PUBLIC_BASE_RPC_URL

# Infringement Search
GOOGLE_VISION_API_KEY (or TinEye API key)

# Email (for monitoring alerts)
RESEND_API_KEY or SENDGRID_API_KEY

# Monitoring
SENTRY_DSN
```

---

## Notes & Blockers

### Open Questions
- Which reverse image search API? (Google Vision vs TinEye - cost vs accuracy tradeoff)
- C2PA signing key management? (Platform key vs photographer keys)
- Email service provider? (Resend vs SendGrid vs Loops)

### Dependencies
- Base mainnet migration blocks real transactions
- C2PA blocks credentialed uploads
- Infringement search blocks monitoring tiers
