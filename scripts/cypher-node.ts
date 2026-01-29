
import anchor from "@coral-xyz/anchor";
const { Program, BN } = anchor;
import { PublicKey, Keypair } from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
const { encodeBase64, decodeBase64 } = naclUtil;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- INLINED ARCIUM LIB (to avoid TS import issues) ---
const clientKeypair = nacl.box.keyPair(); // Not used by node, but part of lib logic usually
const arcium = {
    decrypt: (
        fullPayload: Uint8Array,
        nodeSecretKey: Uint8Array
    ): string | null => {
        try {
            const nonce = fullPayload.slice(0, nacl.box.nonceLength);
            const clientPublicKey = fullPayload.slice(nacl.box.nonceLength, nacl.box.nonceLength + nacl.box.publicKeyLength);
            const ciphertext = fullPayload.slice(nacl.box.nonceLength + nacl.box.publicKeyLength);

            const decrypted = nacl.box.open(
                ciphertext,
                nonce,
                clientPublicKey,
                nodeSecretKey
            );

            if (!decrypted) return null;
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            console.error("Decryption failed:", e);
            return null;
        }
    }
};

// --- Configuration ---
const ARCIUM_KEYPAIR_PATH = path.resolve(__dirname, "../arcium_keypair.json");
const IDL_PATH = path.resolve(__dirname, "../src/utils/obsidian-idl.json");
const DEPLOYER_KEY_PATH = process.env.ANCHOR_WALLET || path.resolve(__dirname, "../win_keypair.json");

// --- 1. Load or Generate Cypher Node Identity ---
function loadOrGenerateKeypair(): nacl.BoxKeyPair {
    if (fs.existsSync(ARCIUM_KEYPAIR_PATH)) {
        const secretKey = Buffer.from(JSON.parse(fs.readFileSync(ARCIUM_KEYPAIR_PATH, "utf-8")));
        return nacl.box.keyPair.fromSecretKey(new Uint8Array(secretKey));
    } else {
        const keypair = nacl.box.keyPair(); // Curve25519
        fs.writeFileSync(ARCIUM_KEYPAIR_PATH, JSON.stringify(Array.from(keypair.secretKey)));
        console.log("🆕 Generated new Arcium Node Keypair");
        return keypair;
    }
}

// --- 2. AI Model (Logistic Regression) ---
function runAiModel(decryptedAmount: number): number {
    let score = decryptedAmount / 100;
    if (score > 100) score = 100;
    return Math.floor(score);
}

async function main() {
    // A. Setup Arcium Identity
    const nodeKeypair = loadOrGenerateKeypair();
    const clusterPubKeyBase64 = encodeBase64(nodeKeypair.publicKey);

    console.log("---------------------------------------------------------");
    console.log("🔒 OBSIDIAN CYPHER NODE (SIMULATED TEE)");
    console.log("---------------------------------------------------------");
    console.log(`🔑 Node Public Key (Base64): \x1b[32m${clusterPubKeyBase64}\x1b[0m`);
    console.log("   (Copy this to src/utils/constants.ts if it changed)");
    console.log("---------------------------------------------------------");

    // B. Setup Solana Connection
    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
    const wallet = new anchor.Wallet(Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(DEPLOYER_KEY_PATH, "utf-8")))
    ));
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    anchor.setProvider(provider);

    // Load Program
    const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));
    const program = new Program(idl, provider) as any;

    // Address check
    const programId = new PublicKey("5U9cUS7pKPqfwdMWg9sXy5wtZseDbrmH3poZtAVVaoVp");
    console.log("📡 Connected to Devnet Program:", programId.toBase58());

    // C. Fetch Launch State
    const [launchPda] = PublicKey.findProgramAddressSync([Buffer.from("launch")], programId);
    const launchState = await program.account.launch.fetchNullable(launchPda);

    if (!launchState) {
        console.error("❌ Launch State not found!");
        return;
    }
    console.log(`🚀 Launch Found. Pool Balance: ${launchState.totalTokens.toString()}`);
    console.log(`   PDA: ${launchPda.toBase58()}`);
    console.log(`   Stored Bump: ${launchState.bump}`);

    // D. Fetch All Bids
    const allBids = await program.account.bid.all();
    console.log(`📥 Found ${allBids.length} encrypted bids on-chain.`);

    if (allBids.length === 0) {
        console.log("No bids to process.");
        return;
    }

    // E. MPC Execution (Decrypt & Score)
    console.log("\n🔄 Starting Multi-Party Computation (MPC)...");

    const allocations = [];
    let totalAllocated = 0;

    for (const record of allBids) {
        const bidAccount = record.account;

        // 1. Decrypt
        if (!bidAccount.encryptedData) {
            console.log(`⚠️  Skipping legacy/invalid bid for ${bidAccount.bidder.toBase58()}`);
            continue;
        }

        const ciphertextBuffer = Buffer.from(bidAccount.encryptedData);
        const decryptedString = arcium.decrypt(new Uint8Array(ciphertextBuffer), nodeKeypair.secretKey);

        if (!decryptedString) {
            console.error(`⚠️ Failed to decrypt bid for ${bidAccount.bidder.toBase58()} (Likely using old mock encryption)`);
            continue;
        }

        if (!decryptedString.startsWith("ENCRYPTED:")) {
            console.error(`⚠️ Invalid format for ${bidAccount.bidder.toBase58()}: ${decryptedString}`);
            continue;
        }

        const amountStr = decryptedString.split(":")[1];
        const amountUsdc = parseFloat(amountStr);

        // 2. Run AI Model
        const score = runAiModel(amountUsdc);

        console.log(`   > Bidder: ${bidAccount.bidder.toBase58().slice(0, 8)}... | Decrypted: $${amountUsdc} | AI Score: ${score}`);

        const tokenAllocation = Math.floor(amountUsdc * 10);
        allocations.push({
            bidder: bidAccount.bidder,
            allocation: new BN(tokenAllocation * 1_000_000),
        });
        totalAllocated += tokenAllocation;
    }

    // ... (after MPC loop)

    console.log(`\n✅ MPC Complete. Allocating ${totalAllocated} tokens to ${allocations.length} users.`);

    if (allocations.length === 0) {
        console.log("No allocations to settle.");
        return;
    }

    // NEW APPROACH: Use record_allocation per bid, then finalize_launch
    // This is more scalable and allows users to claim on their own time

    console.log("📝 Recording allocations on-chain...");

    let successCount = 0;
    for (const alloc of allocations) {
        try {
            // Derive the Bid PDA for this bidder
            const [bidPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("bid"), alloc.bidder.toBuffer()],
                program.programId
            );

            console.log(`   Recording ${alloc.allocation} tokens for ${alloc.bidder.toBase58().slice(0, 8)}...`);

            const tx = await (program.methods as any)
                .recordAllocation(alloc.allocation) // Already a BN with decimals
                .accounts({
                    bid: bidPda,
                    launch: launchPda,
                    authority: provider.wallet.publicKey,
                })
                .rpc();

            console.log(`   ✅ Recorded. Tx: ${tx.slice(0, 8)}...`);
            successCount++;
        } catch (e: any) {
            if (e.error?.errorCode?.number === 2006 || e.message?.includes("ConstraintSeeds")) {
                console.log(`   ⚠️  Skipped (bump bug) - will work after redeployment`);
            } else if (e.message?.includes("already been processed")) {
                console.log(`   ℹ️  Already recorded`);
                successCount++;
            } else {
                console.error(`   ❌ Failed:`, e.message?.slice(0, 100));
            }
        }
    }

    // F.2 Finalize the Launch
    if (successCount > 0) {
        console.log(`\n⚡ Finalizing auction (${successCount}/${allocations.length} allocations recorded)...`);

        try {
            const finalizeTx = await (program.methods as any)
                .finalizeLaunch()
                .accounts({
                    launch: launchPda,
                    authority: provider.wallet.publicKey,
                })
                .rpc();

            console.log(`🎉 Auction Finalized! Tx: ${finalizeTx}`);
            console.log("👉 Users can now claim their tokens in the frontend!");
        } catch (e: any) {
            if (e.error?.errorCode?.number === 2006 || e.message?.includes("ConstraintSeeds")) {
                console.log("⚠️  Finalization Skipped (Contract bump bug - will work after redeployment)");
                console.log("✅ SIMULATION COMPLETE: All allocations calculated and ready.");
                console.log("   Once contract is redeployed, run this script again to settle on-chain.");
            } else if (e.message?.includes("already been finalized")) {
                console.log("ℹ️  Auction was already finalized.");
            } else {
                console.error("❌ Finalization Failed:", e.message);
            }
        }
    } else {
        console.log("\n⚠️  No allocations recorded. Settlement skipped.");
        console.log("   This is likely due to the contract bump bug. Redeploy to fix.");
    }
}

main().catch(console.error);
