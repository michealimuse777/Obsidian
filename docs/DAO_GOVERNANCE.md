# DAO Governance Architecture

This document outlines the governance mechanism for community control of Obsidian launchpad parameters.

## Overview

The Obsidian DAO will allow token holders to vote on critical parameters and decisions affecting the launchpad.

## Governance Token

| Property | Value |
|----------|-------|
| Symbol | OBS |
| Total Supply | 100,000,000 |
| Decimals | 9 |
| Distribution | Community (40%), Team (20%), Treasury (25%), Investors (15%) |

## Governable Parameters

### Launch Configuration
- `max_allocation` - Maximum tokens per user
- `min_bid` - Minimum bid amount
- `auction_duration` - Length of auction period

### Fee Structure
- `platform_fee` - Percentage taken by protocol
- `creator_fee` - Fee paid to launch creators

### Eligibility
- `kyc_required` - Whether KYC is mandatory
- `whitelist_enabled` - Enable/disable whitelisting

## Voting Mechanism

### Proposal Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Draft     │───▶│   Active    │───▶│   Passed    │───▶│  Executed   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
   [Cancelled]        [Failed]          [Vetoed]
```

### Voting Parameters

| Parameter | Value |
|-----------|-------|
| Proposal Threshold | 100,000 OBS (0.1%) |
| Quorum | 4% of total supply |
| Voting Period | 3 days |
| Timelock Delay | 24 hours |
| Veto Threshold | 33% against |

## Implementation Options

### 1. SPL Governance (Realms)
- Native Solana governance
- Battle-tested in production
- Supports token voting

### 2. Custom Anchor Program
- Full control over logic
- Higher development cost
- Requires audit

### 3. Hybrid Approach
- Use Realms for voting
- Custom executor for Obsidian-specific actions

## Smart Contract Architecture

```rust
#[account]
pub struct Proposal {
    pub id: u64,
    pub proposer: Pubkey,
    pub description_uri: String,
    pub votes_for: u64,
    pub votes_against: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub executed: bool,
    pub cancelled: bool,
}

#[account]
pub struct GovernanceConfig {
    pub voting_token: Pubkey,
    pub proposal_threshold: u64,
    pub quorum: u64,
    pub voting_period: i64,
    pub timelock_delay: i64,
}
```

## Frontend Integration

- Proposal creation form
- Voting interface with delegation support
- Historical proposals dashboard
- Treasury overview

## Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Token Design | 1 week |
| 2 | Governance Contract | 2 weeks |
| 3 | Frontend UI | 2 weeks |
| 4 | Testing | 1 week |
| 5 | Token Distribution | 1 week |
| 6 | Launch | - |

## References

- [Realms Documentation](https://docs.realms.today/)
- [SPL Governance](https://github.com/solana-labs/solana-program-library/tree/master/governance)
