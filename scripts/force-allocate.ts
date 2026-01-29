/**
 * FORCE RECORD ALLOCATION
 * Directly records allocation for a specific bidder
 */

import anchor from "@coral-xyz/anchor";
const { Program, BN } = anchor;
import { PublicKey, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    const BIDDER_WALLET = "3Vyn8g2avGj3EaWDv1mCfo5Qd72XttvTHWCmgcH7EWSw";
    const ALLOCATION_AMOUNT = 50000; // 50,000 OBS tokens

    console.log("═".repeat(50));
    console.log("📝 FORCE RECORD ALLOCATION");
    console.log("═".repeat(50));

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
    const programId = new PublicKey("5U9cUS7pKPqfwdMWg9sXy5wtZseDbrmH3poZtAVVaoVp");

    console.log(`\nBidder: ${BIDDER_WALLET}`);
    console.log(`Allocation: ${ALLOCATION_AMOUNT} OBS`);

    // Derive PDAs
    const [launchPda] = PublicKey.findProgramAddressSync([Buffer.from("launch")], programId);
    const bidderPubkey = new PublicKey(BIDDER_WALLET);
    const [bidPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bid"), bidderPubkey.toBuffer()],
        programId
    );

    console.log(`\nLaunch PDA: ${launchPda.toBase58()}`);
    console.log(`Bid PDA: ${bidPda.toBase58()}`);

    // Check current bid state
    const bidAccount = await program.account.bid.fetchNullable(bidPda);
    if (!bidAccount) {
        console.error("❌ Bid account not found!");
        return;
    }

    console.log(`\nCurrent Bid State:`);
    console.log(`  - Allocation: ${bidAccount.allocation?.toString() || "0"}`);
    console.log(`  - Is Processed: ${bidAccount.isProcessed}`);

    // Record allocation
    console.log(`\n⏳ Recording allocation...`);

    try {
        const allocationBN = new BN(ALLOCATION_AMOUNT * 1_000_000); // Add 6 decimals

        const tx = await (program.methods as any)
            .recordAllocation(allocationBN)
            .accounts({
                bid: bidPda,
                launch: launchPda,
                authority: provider.wallet.publicKey,
            })
            .rpc();

        console.log(`✅ Allocation Recorded! Tx: ${tx}`);
    } catch (e: any) {
        console.error(`❌ Error: ${e.message}`);

        // Try to get more details
        if (e.logs) {
            console.log("\nProgram Logs:");
            e.logs.forEach((log: string) => console.log(`  ${log}`));
        }
    }

    // Verify
    const updatedBid = await program.account.bid.fetchNullable(bidPda);
    console.log(`\nUpdated Bid State:`);
    console.log(`  - Allocation: ${updatedBid?.allocation?.toString() || "0"}`);
    console.log(`  - Is Processed: ${updatedBid?.isProcessed}`);

    // Also finalize the launch if not already
    const launchState = await program.account.launch.fetchNullable(launchPda);
    if (!launchState?.isFinalized) {
        console.log(`\n⏳ Finalizing launch...`);
        try {
            const finalizeTx = await (program.methods as any)
                .finalizeLaunch()
                .accounts({
                    launch: launchPda,
                    authority: provider.wallet.publicKey,
                })
                .rpc();
            console.log(`✅ Launch Finalized! Tx: ${finalizeTx}`);
        } catch (e: any) {
            console.log(`⚠️  Finalize: ${e.message?.slice(0, 80)}`);
        }
    } else {
        console.log(`\nℹ️  Launch already finalized.`);
    }

    console.log("\n" + "═".repeat(50));
    console.log("✅ DONE - Refresh frontend to see allocation!");
    console.log("═".repeat(50));
}

main().catch(console.error);
