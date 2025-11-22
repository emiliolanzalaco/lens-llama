# Quick Reference Guide

Essential commands and information for working with the eth-global monorepo.

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/tboot-0510/eth-global.git
cd eth-global
pnpm install

# Start development
pnpm dev
```

## 📦 Common Commands

### Root Level

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm dev              # Start all dev servers
pnpm lint             # Lint all packages
pnpm test             # Run all tests
pnpm clean            # Clean all build artifacts
```

### Workspace-Specific

```bash
# Run command in specific workspace
pnpm --filter @eth-global/web build
pnpm --filter @eth-global/facilitator dev
pnpm --filter @eth-global/contracts test
pnpm --filter @eth-global/database generate
```

## 🏗️ Package Details

### apps/web
```bash
cd apps/web
pnpm dev              # http://localhost:3000
pnpm build            # Production build
pnpm test             # Run all tests
pnpm test:unit        # Unit tests only
pnpm test:e2e         # E2E tests with Playwright
```

### apps/facilitator
```bash
cd apps/facilitator
pnpm dev              # http://localhost:3001
pnpm build            # TypeScript compilation
pnpm start            # Production server
pnpm test             # Run tests
```

### packages/contracts
```bash
cd packages/contracts
pnpm compile          # Compile contracts
pnpm test             # Run all tests
pnpm test:hardhat     # Hardhat tests only
pnpm test:forge       # Foundry tests only
pnpm deploy           # Deploy contracts
```

### packages/database
```bash
cd packages/database
pnpm generate         # Generate migrations
pnpm migrate          # Run migrations
pnpm studio           # Open Drizzle Studio
```

## 🔧 Environment Setup

### Required Files

```bash
apps/web/.env.local
apps/facilitator/.env
packages/database/.env
```

### Copy Examples

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/facilitator/.env.example apps/facilitator/.env
cp packages/database/.env.example packages/database/.env
```

## 🌐 Default Ports

| Service | Port | URL |
|---------|------|-----|
| Web App | 3000 | http://localhost:3000 |
| Facilitator | 3001 | http://localhost:3001 |

## 📡 API Endpoints

### Web App (http://localhost:3000)
```
GET  /api/users              # List users
POST /api/users              # Create user
GET  /api/payments           # List payments
POST /api/payments           # Create payment
GET  /api/transactions       # List transactions
POST /api/transactions       # Create transaction
```

### Facilitator (http://localhost:3001)
```
GET  /health                 # Health check
POST /verify                 # Verify signature
POST /settle                 # Settle payment
GET  /settle/:paymentId      # Settlement status
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Test specific package
pnpm --filter @eth-global/web test

# E2E tests
cd apps/web && pnpm test:e2e

# Contract tests
cd packages/contracts && pnpm test
```

## 📝 Code Style

```bash
# Lint all
pnpm lint

# Lint specific package
pnpm --filter @eth-global/web lint

# Auto-fix (if configured)
pnpm --filter @eth-global/web lint --fix
```

## 🔑 Key Technologies

| Package | Framework | Language | Testing |
|---------|-----------|----------|---------|
| apps/web | Next.js 14 | TypeScript | Jest + Playwright |
| apps/facilitator | Express | TypeScript | Jest |
| packages/contracts | Hardhat 3 | Solidity | Hardhat + Foundry |
| packages/database | Drizzle | TypeScript | - |

## 🎯 Common Tasks

### Add New Dependency

```bash
# Add to specific package
cd apps/web
pnpm add package-name

# Add dev dependency
pnpm add -D package-name

# Add to root (build tools)
pnpm add -w package-name
```

### Create New Component

```bash
# Web app
touch apps/web/components/MyComponent.tsx

# API route
touch apps/web/app/api/my-route/route.ts

# Facilitator route
touch apps/facilitator/src/routes/my-route.ts
```

### Deploy Smart Contracts

```bash
cd packages/contracts
# Update hardhat.config.ts with network settings
pnpm deploy --network sepolia
```

### Database Operations

```bash
cd packages/database

# Make schema changes in src/schema.ts
# Generate migration
pnpm generate

# Apply migration
pnpm migrate

# View database
pnpm studio
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Clear Cache
```bash
# Clear turbo cache
rm -rf .turbo

# Clear Next.js cache
rm -rf apps/web/.next

# Clear all node_modules
pnpm clean
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

### Build Issues
```bash
# Rebuild from scratch
pnpm clean
pnpm install
pnpm build
```

## 📚 Documentation

- [README.md](README.md) - Project overview and setup
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development notes
- [apps/facilitator/API.md](apps/facilitator/API.md) - Facilitator API docs
- [SETUP_VERIFICATION.md](SETUP_VERIFICATION.md) - Setup checklist

## 🔗 Useful Links

- [Turborepo Docs](https://turbo.build/repo/docs)
- [PNPM Workspaces](https://pnpm.io/workspaces)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Hardhat Docs](https://hardhat.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Viem Docs](https://viem.sh/)
- [Privy Docs](https://docs.privy.io/)

## 💡 Tips

1. **Use Turbo for speed**: Commands like `pnpm build` use Turbo's caching
2. **Filter workspaces**: Use `--filter` to run commands in specific packages
3. **Parallel execution**: Turbo runs independent tasks in parallel
4. **Check logs**: Use `pnpm --filter @eth-global/web dev` to see specific package logs
5. **Environment variables**: Remember to set them up before running apps
