# Confidential SPL Tokens (Token-2022)

This document outlines the upgrade path from standard SPL tokens to Confidential Transfers using Token-2022.

## Current Implementation

Currently, Obsidian uses **standard SPL tokens** for bid payments. While the bid *amount* is encrypted using Arcium, the actual token transfer is visible on-chain.

## Token-2022 Confidential Transfers

Token-2022 introduces **Confidential Transfers** which hide the transfer amount using zero-knowledge proofs.

### Benefits

1. **Amount Privacy**: Transfer amounts are encrypted on-chain
2. **Sender/Receiver Privacy**: Partial privacy of participants
3. **Composability**: Works with existing SPL infrastructure
4. **Native Support**: Built into Solana runtime

### Implementation Steps

1. **Create Confidential Mint**
   ```rust
   // Enable confidential transfer extension on mint
   let mint_extensions = MintExtension::ConfidentialTransferMint {
       authority: Some(authority),
       auto_approve_new_accounts: true,
       auditor_elgamal_pubkey: None,
   };
   ```

2. **Configure User Accounts**
   ```rust
   // Users must configure their accounts for confidential transfers
   ConfidentialTransferAccount::configure(
       token_account,
       elgamal_keypair,
       aes_key,
   );
   ```

3. **Deposit (Public → Confidential)**
   ```rust
   // Convert public balance to confidential
   confidential_transfer_deposit(amount);
   ```

4. **Transfer (Confidential → Confidential)**
   ```rust
   // Transfer with ZK proof
   confidential_transfer(
       source,
       destination,
       amount,
       proof,
   );
   ```

5. **Withdraw (Confidential → Public)**
   ```rust
   // Convert confidential balance to public
   confidential_transfer_withdraw(amount, proof);
   ```

### Dependencies

```toml
[dependencies]
spl-token-2022 = "0.9"
spl-token-confidential-transfer-proof-generation = "0.1"
```

### Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Research & Design | 1 week |
| 2 | Mint Migration | 1 week |
| 3 | Frontend Integration | 2 weeks |
| 4 | Testing | 1 week |
| 5 | Audit | 2-3 weeks |

## Resources

- [Token-2022 Documentation](https://spl.solana.com/token-2022)
- [Confidential Transfers Guide](https://spl.solana.com/confidential-token)
- [Example Implementation](https://github.com/solana-labs/solana-program-library/tree/master/token/program-2022)
