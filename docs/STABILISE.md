# Stabilisation Plan: Production-Ready x402 Payments on Base

This document outlines the work required to stabilise lens-llama for production using the official x402 protocol on Base mainnet.

## Current State

- **Wallet type**: Privy embedded EOA wallets (not smart wallets)
- **Network**: Base Sepolia (testnet)
- **Payment protocol**: x402 with EIP-3009 (TransferWithAuthorization)
- **Status**: Working on testnet, needs mainnet migration

## Why EOA Wallets Work

Privy embedded wallets are EOAs by default. EOAs are fully compatible with x402/EIP-3009 because:

1. **Direct signature verification** - `ecrecover` works natively with ECDSA signatures
2. **No deployment needed** - EOAs exist immediately (no counterfactual address issues)
3. **No `isValidSignature()` call** - Unlike smart wallets, no on-chain code execution required

This avoids the smart wallet deployment issue documented in [x402 PR #672](https://github.com/coinbase/x402/pull/672) and [PR #675](https://github.com/coinbase/x402/pull/675).

---

## Phase 1: Base Mainnet Migration

**Goal**: Switch from Base Sepolia to Base mainnet

### Changes Required

| File | Change |
|------|--------|
| `apps/web/lib/hooks/use-x402-payment.ts` | Change `baseSepolia` → `base`, update USDC address |
| `apps/web/lib/x402/index.ts` | Update USDC address to mainnet |
| `apps/web/components/providers/privy-provider.tsx` | Already configured for `base` |

### USDC Addresses

| Network | Address |
|---------|---------|
| Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Base Mainnet | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

### EIP-712 Domain Update

```typescript
const USDC_DOMAIN = {
  name: 'USD Coin',  // Note: mainnet uses 'USD Coin', not 'USDC'
  version: '2',
  chainId: 8453,     // Base mainnet
  verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};
```

### x402 Network Identifier

```typescript
// Change from 'base-sepolia' to 'base'
network: 'base',
```

---

## Phase 2: Fiat On-Ramp

**Goal**: Allow users without crypto to purchase with card/bank

### Recommended: Coinbase Onramp

[Coinbase Onramp](https://www.coinbase.com/developer-platform/discover/launches/zero-fee-usdc) offers:

- **Zero fees** for USDC on Base
- Card, bank transfer, Apple Pay, Google Pay
- KYC handled by Coinbase
- Settlement in minutes

### Integration

```typescript
import { CoinbaseOnramp } from '@coinbase/onramp-sdk';

const onramp = new CoinbaseOnramp({
  appId: process.env.NEXT_PUBLIC_COINBASE_ONRAMP_APP_ID,
  destinationWalletAddress: userAddress,
  destinationAsset: 'USDC',
  destinationNetwork: 'base',
});

// Open when user clicks "Pay with Card"
await onramp.open({ amount: purchaseAmountUSD });
```

### User Flow

1. User clicks "Buy" on image
2. If insufficient USDC balance → show "Pay with Card" option
3. Coinbase Onramp widget opens
4. User completes card payment
5. USDC arrives in wallet (~1-3 min)
6. Proceed with x402 purchase

### Alternative: Transak

[Transak](https://transak.com/) for regions not supported by Coinbase:
- 1% transaction fee
- 100+ countries
- Direct to wallet delivery

---

## Phase 3: Fiat Off-Ramp

**Goal**: Allow sellers to withdraw earnings to bank account

### Recommended: Coinbase Offramp

[Coinbase Offramp](https://www.coinbase.com/developer-platform/discover/launches/introducing-offramp) offers:

- **Zero fees** for USDC on Base
- Bank transfer payouts
- Instant for Coinbase account holders

### Integration

```typescript
import { CoinbaseOfframp } from '@coinbase/offramp-sdk';

const offramp = new CoinbaseOfframp({
  appId: process.env.NEXT_PUBLIC_COINBASE_OFFRAMP_APP_ID,
  sourceWalletAddress: sellerAddress,
  sourceAsset: 'USDC',
  sourceNetwork: 'base',
});

// Open when seller clicks "Withdraw to Bank"
await offramp.open({ amount: withdrawalAmountUSD });
```

### UI Location

Add "Withdraw" button in seller earnings dashboard.

### Alternative: Transak Off-Ramp

[Transak Off-Ramp](https://transak.com/off-ramp):
- 1% fee
- Direct wallet to bank transfer
- 40+ cryptocurrencies

---

## Phase 4: EIP-7702 Upgrade Path (Future)

**Goal**: Add smart wallet features while keeping same addresses

### What is EIP-7702?

[EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) allows EOAs to delegate execution to smart contracts. Activated on Base mainnet via [Isthmus hardfork](https://x.com/buildonbase/status/1920949216870101391) (May 9, 2025).

### Benefits

| Feature | Description |
|---------|-------------|
| Gas sponsorship | App pays gas fees for users |
| Batch transactions | Multiple actions in one tx |
| Session keys | Delegated permissions |
| Same address | No migration needed |

### Privy Support

Privy supports EIP-7702 via [`useSign7702Authorization()`](https://docs.privy.io/recipes/react/eip-7702):

```typescript
import { useSign7702Authorization } from '@privy-io/react-auth';

const { signAuthorization } = useSign7702Authorization();

// Upgrade EOA to CoinbaseSmartWallet
const authorization = await signAuthorization({
  contractAddress: '0x000100abaad02f1cfC8Bbe32bD5a564817339E72', // CBSW on Base
  chainId: 8453,
  nonce: await getNonce(userAddress),
});
```

### When to Implement

Implement EIP-7702 upgrade when:
- Users request gasless transactions
- Need batch operations (e.g., approve + purchase in one tx)
- Want to sponsor gas for new users

### Detecting Delegation

```typescript
const code = await publicClient.getCode({ address: userAddress });
const isDelegated = code?.toLowerCase().startsWith('0xef0100');
```

---

## Implementation Checklist

### Phase 1: Mainnet
- [ ] Update USDC address to `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- [ ] Change chain from `baseSepolia` to `base`
- [ ] Update EIP-712 domain name to `'USD Coin'`
- [ ] Update x402 network to `'base'`
- [ ] Test with small amount on mainnet

### Phase 2: On-Ramp
- [ ] Register for Coinbase Developer Platform
- [ ] Get Onramp App ID
- [ ] Install `@coinbase/onramp-sdk`
- [ ] Add "Pay with Card" button to purchase flow
- [ ] Handle onramp completion (poll balance or webhook)
- [ ] Add Transak as fallback for unsupported regions

### Phase 3: Off-Ramp
- [ ] Get Offramp App ID from Coinbase
- [ ] Install `@coinbase/offramp-sdk`
- [ ] Add earnings dashboard for sellers
- [ ] Add "Withdraw to Bank" button
- [ ] Track withdrawal history

### Phase 4: EIP-7702 (Future)
- [ ] Add wallet upgrade prompt in settings
- [ ] Integrate with Alchemy/Pimlico for gas sponsorship
- [ ] Implement batch transactions for approve+purchase

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      BUYER FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────┐    ┌──────────────┐    ┌──────────────┐      │
│   │  Login   │───▶│   Browse     │───▶│   Purchase   │      │
│   │ (Privy)  │    │   Photos     │    │              │      │
│   └──────────┘    └──────────────┘    └──────┬───────┘      │
│                                              │               │
│                          ┌───────────────────┴────────────┐  │
│                          │                                │  │
│                          ▼                                ▼  │
│                   ┌──────────────┐              ┌──────────┐ │
│                   │ Has USDC?    │──── No ─────▶│ Coinbase │ │
│                   │              │              │ Onramp   │ │
│                   └──────┬───────┘              └────┬─────┘ │
│                          │ Yes                       │       │
│                          ▼                           │       │
│                   ┌──────────────┐                   │       │
│                   │    x402      │◀──────────────────┘       │
│                   │  Payment     │                           │
│                   └──────┬───────┘                           │
│                          │                                   │
│                          ▼                                   │
│                   ┌──────────────┐                           │
│                   │ USDC → Seller│                           │
│                   └──────────────┘                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      SELLER FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │   Receive    │───▶│    View      │───▶│   Withdraw   │  │
│   │    USDC      │    │   Earnings   │    │   to Bank    │  │
│   │  (from x402) │    │              │    │  (Offramp)   │  │
│   └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

```bash
# Existing
NEXT_PUBLIC_PRIVY_APP_ID=...

# New - Phase 2 & 3
NEXT_PUBLIC_COINBASE_ONRAMP_APP_ID=...
NEXT_PUBLIC_COINBASE_OFFRAMP_APP_ID=...

# Optional - Transak fallback
NEXT_PUBLIC_TRANSAK_API_KEY=...
```

---

## References

### x402 Protocol
- [x402 GitHub](https://github.com/coinbase/x402)
- [PR #672 - Smart wallet issue](https://github.com/coinbase/x402/pull/672)
- [PR #675 - Settlement fix](https://github.com/coinbase/x402/pull/675)

### EIP-7702
- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [Privy EIP-7702 Docs](https://docs.privy.io/recipes/react/eip-7702)
- [Privy EIP-7702 Blog](https://privy.io/blog/eip7702-support-with-privy)
- [Base Isthmus Hardfork](https://x.com/buildonbase/status/1920949216870101391)

### Fiat Ramps
- [Coinbase Zero-Fee USDC](https://www.coinbase.com/developer-platform/discover/launches/zero-fee-usdc)
- [Coinbase Offramp](https://www.coinbase.com/developer-platform/discover/launches/introducing-offramp)
- [Transak](https://transak.com/)
