/**
 * CYPHER NODE - HACKATHON DEMO
 * 
 * This script demonstrates how the Arcium Cypher Node processes encrypted bids:
 * 1. Fetches all bids from chain
 * 2. Decrypts encrypted bid amounts
 * 3. Runs AI scoring model
 * 4. Records allocations on-chain
 * 5. Finalizes the auction
 * 
 * Run with: npx ts-node scripts/run-cypher-demo.ts
 */

import anchor from "@coral-xyz/anchor";
const { Program, BN } = anchor;
import { PublicKey, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
const { encodeBase64 } = naclUtil;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Arcium Decryption Logic ---
const arciumDecrypt = (
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
        return null;
    }
};

// --- AI Scoring Model ---
function runAiModel(bidAmountUsdc: number): { score: number; allocation: number } {
    // Simple model: score based on bid amount, capped allocation
    const score = Math.min(bidAmountUsdc / 100, 100);
    const allocation = Math.floor(bidAmountUsdc * 10); // 10x multiplier
    return { score, allocation };
}

async function main() {
    console.log("═".repeat(60));
    console.log("🔒 OBSIDIAN CYPHER NODE - HACKATHON DEMO");
    console.log("═".repeat(60));

    // 1. Load Cypher Node Identity
    const arciumKeypairPath = path.resolve(__dirname, "../arcium_keypair.json");
    const secretKey = Buffer.from(JSON.parse(fs.readFileSync(arciumKeypairPath, "utf-8")));
    const nodeKeypair = nacl.box.keyPair.fromSecretKey(new Uint8Array(secretKey));

    console.log(`\n🔑 Cypher Node Public Key: ${encodeBase64(nodeKeypair.publicKey)}`);

    // 2. Connect to Solana
    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

    const deployerKeyPath = path.resolve(__dirname, "../win_keypair.json");
    const wallet = new anchor.Wallet(Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(deployerKeyPath, "utf-8")))
    ));
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    anchor.setProvider(provider);

    const idlPath = path.resolve(__dirname, "../src/utils/obsidian-idl.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const program = new Program(idl, provider) as any;
    const programId = new PublicKey("8nkjktP5dWDYCkwR3fJFSuQANB1vyw5g5LTHCrxnf3CE");

    console.log(`📡 Connected to Program: ${programId.toBase58()}`);

    // 3. Fetch Launch State
    const [launchPda] = PublicKey.findProgramAddressSync([Buffer.from("launch_v2")], programId);
    const launchState = await program.account.launch.fetchNullable(launchPda);

    if (!launchState) {
        console.error("❌ Launch not found!");
        return;
    }
    console.log(`🚀 Launch Found | Total Tokens: ${launchState.totalTokens.toString()}`);

    // 4. Fetch All Bids
    const allBids = await program.account.bid.all();
    console.log(`\n📥 Found ${allBids.length} bids on-chain\n`);

    if (allBids.length === 0) {
        console.log("No bids to process.");
        return;
    }

    // 5. Decrypt and Score Each Bid
    console.log("─".repeat(60));
    console.log("🔄 MULTI-PARTY COMPUTATION (MPC) - DECRYPTING BIDS...");
    console.log("─".repeat(60));

    const results: { bidder: string; decrypted: string | null; score: number; allocation: number }[] = [];

    for (const record of allBids) {
        const bidAccount = record.account;
        const bidderShort = bidAccount.bidder.toBase58().slice(0, 12) + "...";

        let decryptedAmount: string | null = null;
        let score = 0;
        let allocation = 0;

        if (bidAccount.encryptedData && bidAccount.encryptedData.length > 0) {
            const ciphertext = new Uint8Array(Buffer.from(bidAccount.encryptedData));
            decryptedAmount = arciumDecrypt(ciphertext, nodeKeypair.secretKey);

            if (decryptedAmount && decryptedAmount.startsWith("ENCRYPTED:")) {
                const amountStr = decryptedAmount.split(":")[1];
                const amountUsdc = parseFloat(amountStr);
                const aiResult = runAiModel(amountUsdc);
                score = aiResult.score;
                allocation = aiResult.allocation;
            }
        }

        results.push({
            bidder: bidderShort,
            decrypted: decryptedAmount,
            score,
            allocation
        });
    }

    // Display Results
    console.log("\n📊 DECRYPTION & AI SCORING RESULTS:");
    console.log("─".repeat(60));
    console.log("Bidder         | Decrypted Bid | AI Score | Allocation");
    console.log("─".repeat(60));

    for (const r of results) {
        const bidStr = r.decrypted ? r.decrypted.replace("ENCRYPTED:", "$") : "FAILED";
        console.log(`${r.bidder} | ${bidStr.padEnd(13)} | ${r.score.toFixed(1).padStart(8)} | ${r.allocation} OBS`);
    }
    console.log("─".repeat(60));

    // 6. Record Allocations On-Chain
    console.log("\n📝 RECORDING ALLOCATIONS ON-CHAIN...\n");

    let successCount = 0;
    for (const record of allBids) {
        const bidAccount = record.account;

        // Find matching result
        const result = results.find(r => r.bidder === bidAccount.bidder.toBase58().slice(0, 12) + "...");
        if (!result || result.allocation === 0) continue;

        try {
            const [bidPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("bid_v2"), bidAccount.bidder.toBuffer()],
                program.programId
            );

            const allocationBN = new BN(result.allocation * 1_000_000); // Add decimals

            const tx = await (program.methods as any)
                .recordAllocation(allocationBN)
                .accounts({
                    bid: bidPda,
                    launch: launchPda,
                    authority: provider.wallet.publicKey,
                })
                .rpc();

            console.log(`✅ ${result.bidder}: ${result.allocation} OBS recorded | Tx: ${tx.slice(0, 12)}...`);
            successCount++;
        } catch (e: any) {
            const errMsg = e.message || "";
            if (errMsg.includes("already been processed") || errMsg.includes("custom program error")) {
                console.log(`ℹ️  ${result.bidder}: Already processed or constraint error`);
            } else {
                console.log(`❌ ${result.bidder}: ${errMsg.slice(0, 50)}`);
            }
        }
    }

    // 7. Finalize Auction
    if (successCount > 0 || results.length > 0) {
        console.log("\n⚡ FINALIZING AUCTION...");
        try {
            const finalizeTx = await (program.methods as any)
                .finalizeLaunch()
                .accounts({
                    launch: launchPda,
                    authority: provider.wallet.publicKey,
                })
                .rpc();
            console.log(`🎉 AUCTION FINALIZED! Tx: ${finalizeTx}`);
        } catch (e: any) {
            if (e.message?.includes("already been finalized")) {
                console.log("ℹ️  Auction was already finalized.");
            } else {
                console.log(`⚠️  Finalization: ${e.message?.slice(0, 60)}`);
            }
        }
    }

    console.log("\n" + "═".repeat(60));
    console.log("✅ CYPHER NODE PROCESSING COMPLETE");
    console.log("👉 Users can now claim tokens in the frontend!");
    console.log("═".repeat(60));
}

main().catch(console.error);
