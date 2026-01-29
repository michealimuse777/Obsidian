/**
 * CHECK ON-CHAIN STATE
 * Diagnoses the current state of the launch and bids
 */

import anchor from "@coral-xyz/anchor";
const { Program } = anchor;
import { PublicKey, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    console.log("🔍 CHECKING ON-CHAIN STATE...\n");

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

    // Check Launch State
    const [launchPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("launch_v2")],
        program.programId
    );
    const launchState = await program.account.launch.fetchNullable(launchPDA);

    console.log("═══ LAUNCH STATE ═══");
    console.log(`PDA: ${launchPDA.toBase58()}`);
    console.log(`Is Finalized: ${launchState?.isFinalized}`);
    console.log(`Total Tokens: ${launchState?.totalTokens?.toString()}`);
    console.log(`Tokens Distributed: ${launchState?.tokensDistributed?.toString()}`);
    console.log();

    // Check All Bids
    const allBids = await program.account.bid.all();
    console.log(`═══ BIDS (${allBids.length} total) ═══`);

    for (const record of allBids) {
        const bid = record.account;
        console.log(`Bidder: ${bid.bidder.toBase58()}`);
        console.log(`  - Is Processed: ${bid.isProcessed}`);
        console.log(`  - Allocation: ${bid.allocation?.toString() || "0"}`);
        console.log(`  - Is Claimed: ${bid.isClaimed}`);
        console.log();
    }
}

main().catch(console.error);
