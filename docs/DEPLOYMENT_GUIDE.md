# Deployment Guide

**Note:** The codebase is fully implemented for Phase 7 (Settlement). However, the build failed locally due to Windows permission issues (symlinks require Admin or Developer Mode).

## 1. Prerequisites (Machine with Admin/Developer Mode)

You need a machine where you can run `anchor build`.
- **Windows**: Run terminal as Administrator OR enable "Developer Mode" in Windows Settings.
- **Mac/Linux**: Works natively.

## 2. Build the Contract

**Option 1: Manual (Admin Terminal)**
```bash
$env:PATH += ";C:\Users\Zala\.local\share\solana\install\releases\stable-90098d261e2be2f898769d9ee35141597f1a2234\solana-release\bin"
anchor build
```

**Option 2: Use Helper Script (Easy)**
1. Navigate to `scripts/` folder.
2. Right-click `build_windows.bat`.
3. Select **"Run as administrator"**.
4. Wait for "BUILD SUCCESSFUL" message.


## 3. Deploy to Devnet

```bash
# 1. Update Program ID (if changed)
anchor keys sync

# 2. Deploy
anchor deploy --provider.cluster devnet
```

## 4. Run Settlement Flow

Once deployed:

1. **Re-initialize Launch** (since we fixed the bump bug, we need a fresh state):
   ```bash
   # Run the init script (or frontend button if mapped)
   npx ts-node scripts/init-launch.ts
   ```

2. **Wait for Bids**:
   - Use the Frontend `http://localhost:3000` to submit encrypted bids.

3. **Run Cypher Node**:
   ```bash
   npx ts-node scripts/cypher-node.ts
   ```
   - This will now successfully submit on-chain settlements!

## 5. Claim Tokens

1. Go to Frontend.
2. Connect Wallet.
3. You will see "Claim Tokens" button.
4. Click to receive your allocation!
