# Security Audit Plan

This document outlines the security audit requirements for the Obsidian smart contract before mainnet deployment.

## Audit Scope

### Smart Contract (`programs/obsidian/src/lib.rs`)

| Component | Priority | Risk Level |
|-----------|----------|------------|
| `initialize_launch` | High | Medium |
| `submit_encrypted_bid` | Critical | High |
| `finalize_and_distribute` | Critical | High |
| PDA Derivation Logic | High | High |
| Token Transfer CPIs | Critical | High |

### Known Issues to Address

1. **Bump Seed Not Stored**: The `initialize_launch` instruction does not persist the PDA bump, causing `ConstraintSeeds` failures in `finalize_and_distribute`.
   - **Fix**: Add `launch.bump = ctx.bumps.get("launch").unwrap();` to `initialize_launch`.

2. **Recipient Validation**: `finalize_and_distribute` expects `remaining_accounts` to match `recipients` array exactly. No validation that these are actually Token Accounts.

3. **Encryption Payload Size**: No on-chain validation of encrypted payload structure.

## Recommended Audit Firms

| Firm | Specialization | Estimated Timeline |
|------|----------------|-------------------|
| OtterSec | Solana Programs | 2-4 weeks |
| Sec3 | Anchor Programs | 2-3 weeks |
| Neodyme | Rust Security | 3-4 weeks |
| Trail of Bits | General Smart Contracts | 4-6 weeks |

## Pre-Audit Checklist

- [ ] Fix bump seed storage issue
- [ ] Add comprehensive Anchor tests for all edge cases
- [ ] Add reentrancy guards (if applicable)
- [ ] Review all arithmetic for overflow/underflow
- [ ] Verify all account ownership checks
- [ ] Document all trust assumptions

## Estimated Cost

Smart contract audits for Solana programs typically range from **$15,000 - $50,000** depending on complexity and urgency.
