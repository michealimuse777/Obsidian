
#!/bin/bash
set -e
export PATH=/home/imuse/.local/share/solana/install/active_release/bin:$PATH

echo "1. Creating temp dir..."
mkdir -p /tmp/deploy
mkdir -p target/deploy

echo "2. Building to /tmp/deploy..."
cargo-build-sbf --manifest-path programs/obsidian/Cargo.toml --sbf-out-dir /tmp/deploy

echo "3. Copying binary..."
cp /tmp/deploy/obsidian.so target/deploy/obsidian.so
ls -la target/deploy/obsidian.so

echo "4. Deploying..."
anchor deploy --provider.cluster devnet

echo "5. Initializing..."
npx ts-node scripts/initialize-devnet.ts
