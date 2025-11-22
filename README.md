# ETH Global - Web3 Payment Platform

A modern monorepo setup for a decentralized payment platform using Turborepo, PNPM, Next.js 14, and custom x402 payment protocol.

## 🏗️ Repository Structure

This is a Turborepo monorepo with PNPM workspaces containing:

```
eth-global/
├── apps/
│   ├── web/              # Next.js 14 frontend + API
│   └── facilitator/      # Custom x402 payment server
├── packages/
│   ├── contracts/        # Hardhat 3 + Foundry smart contracts
│   └── database/         # Shared Drizzle schema
├── package.json          # Root package.json
├── pnpm-workspace.yaml   # PNPM workspace configuration
└── turbo.json            # Turborepo configuration
```

## 📦 Packages

### apps/web

Next.js 14 application with:
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Authentication**: Privy (email + wallet login)
- **Database**: Drizzle ORM with PostgreSQL
- **Blockchain**: Viem for Ethereum interactions
- **Testing**: Jest (unit, integration) + Playwright (e2e)

**API Routes:**
- `/api/users` - User management
- `/api/payments` - Payment processing
- `/api/transactions` - Transaction tracking

**Scripts:**
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm test         # Run all tests
pnpm test:unit    # Run unit tests
pnpm test:e2e     # Run e2e tests with Playwright
```

### apps/facilitator

Custom x402 payment facilitator server with:
- **Framework**: Express.js
- **Signature Verification**: ERC-6492 support for smart contract wallets
- **Routes**:
  - `POST /verify` - Verify signatures (supports ERC-6492)
  - `POST /settle` - Settle payments
  - `GET /settle/:paymentId` - Get settlement status
  - `GET /health` - Health check

**Scripts:**
```bash
pnpm dev     # Start development server with watch mode
pnpm build   # Build TypeScript
pnpm start   # Start production server
pnpm test    # Run tests
```

### packages/contracts

Smart contracts with Hardhat 3 and Foundry:
- **Contracts**:
  - `PaymentToken.sol` - ERC20 payment token
  - `PaymentProcessor.sol` - Payment processing logic
- **Testing**: Foundry tests + Hardhat tests
- **Framework**: Hardhat 3 with TypeScript

**Scripts:**
```bash
pnpm compile        # Compile contracts with Hardhat
pnpm test           # Run all tests (Forge + Hardhat)
pnpm test:forge     # Run Foundry tests
pnpm test:hardhat   # Run Hardhat tests
pnpm deploy         # Deploy contracts
```

### packages/database

Shared Drizzle ORM schema:
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Tables**:
  - `users` - User accounts
  - `transactions` - Blockchain transactions
  - `payments` - Payment records

**Scripts:**
```bash
pnpm generate   # Generate migrations
pnpm migrate    # Run migrations
pnpm studio     # Open Drizzle Studio
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PNPM >= 8.0.0
- PostgreSQL (for database)
- Foundry (for contract testing)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/tboot-0510/eth-global.git
cd eth-global
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Copy example env files
cp apps/web/.env.example apps/web/.env.local
cp apps/facilitator/.env.example apps/facilitator/.env
cp packages/database/.env.example packages/database/.env

# Update with your values
```

4. Set up the database:
```bash
cd packages/database
pnpm generate
pnpm migrate
```

### Development

Run all apps in development mode:
```bash
pnpm dev
```

This will start:
- Next.js app at http://localhost:3000
- Facilitator server at http://localhost:3001

### Building

Build all packages:
```bash
pnpm build
```

### Testing

Run all tests:
```bash
pnpm test
```

## 🔑 Key Features

### Privy Integration
- Email and wallet authentication
- Easy onboarding for web2 and web3 users
- Secure session management

### Viem Integration
- Type-safe Ethereum interactions
- Support for multiple chains
- Transaction building and signing

### Drizzle ORM
- Type-safe database queries
- Automatic TypeScript types from schema
- Migration management

### x402 Protocol
- Custom payment facilitator
- ERC-6492 signature verification
- Support for smart contract wallets

### Testing Strategy
- **Unit tests**: Individual function testing
- **Integration tests**: API and database integration
- **E2E tests**: Full user flow testing with Playwright

## 📝 Environment Variables

### apps/web
```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_PRIVY_APP_ID=your_app_id
PRIVY_APP_SECRET=your_secret
NEXT_PUBLIC_CHAIN=sepolia
NEXT_PUBLIC_RPC_URL=https://...
```

### apps/facilitator
```env
PORT=3001
DATABASE_URL=postgresql://...
```

### packages/database
```env
DATABASE_URL=postgresql://...
```

## 🛠️ Technology Stack

- **Monorepo**: Turborepo + PNPM Workspaces
- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Authentication**: Privy
- **Database**: PostgreSQL, Drizzle ORM
- **Blockchain**: Viem, Hardhat 3, Foundry
- **Smart Contracts**: Solidity 0.8.23, OpenZeppelin
- **Testing**: Jest, Playwright, Foundry
- **TypeScript**: Full type safety across all packages

## 📄 License

MIT