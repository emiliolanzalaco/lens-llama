# Development Notes

## Network Restrictions

During development in restricted network environments, you may encounter issues downloading:
- Solidity compiler binaries (binaries.soliditylang.org)
- Foundry installation (foundry.paradigm.xyz)

### Workarounds

1. **For Solidity Compilation:**
   - Pre-download the compiler in an unrestricted environment
   - Or use a proxy/VPN if allowed
   - Or compile contracts locally and commit artifacts

2. **For Foundry Tests:**
   - Install Foundry locally: `curl -L https://foundry.paradigm.xyz | bash`
   - Hardhat tests are provided as an alternative
   - Run: `pnpm test:hardhat` instead of `pnpm test:forge`

## Testing in Restricted Networks

If you cannot access external resources:

```bash
# Test only the apps (which don't need external downloads)
cd apps/web && pnpm build
cd apps/facilitator && pnpm build

# Run facilitator server
cd apps/facilitator && pnpm dev

# In another terminal, test the API
curl http://localhost:3001/health
```

## Full Setup (Unrestricted Network)

```bash
# Install all dependencies
pnpm install

# Build everything (requires internet for solidity compiler)
pnpm build

# Run all tests
pnpm test

# Start development servers
pnpm dev
```
