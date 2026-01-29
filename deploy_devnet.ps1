# Deploy Obsidian to Solana Devnet

Write-Host "Starting Deployment Process..." -ForegroundColor Cyan

# 1. Build the Program
Write-Host "`n[1/3] Building Anchor Program..." -ForegroundColor Yellow
anchor build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed. Please check your Anchor installation."
    exit $LASTEXITCODE
}

# 2. Deploy to Devnet
Write-Host "`n[2/3] Deploying to Devnet (this might take a minute)..." -ForegroundColor Yellow
anchor deploy --provider.cluster devnet
if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment failed. Do you have enough Devnet SOL? (solana airdrop 2)"
    exit $LASTEXITCODE
}

# 3. Initialize State
Write-Host "`n[3/3] Initializing Launch State on-chain..." -ForegroundColor Yellow
npx ts-node scripts/initialize-devnet.ts

Write-Host "`nDeployment Complete!" -ForegroundColor Green
