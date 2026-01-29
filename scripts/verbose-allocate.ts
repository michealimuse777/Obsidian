/**
 * VERBOSE FORCE ALLOCATE - with detailed error logging
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
    const ALLOCATION_AMOUNT = 50000;

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

    const [launchPda] = PublicKey.findProgramAddressSync([Buffer.from("launch")], programId);
    const bidderPubkey = new PublicKey(BIDDER_WALLET);
    const [bidPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bid"), bidderPubkey.toBuffer()],
        programId
    );

    console.log("Bid PDA:", bidPda.toBase58());
    console.log("Launch PDA:", launchPda.toBase58());
    console.log("Authority:", wallet.publicKey.toBase58());

    const allocationBN = new BN(ALLOCATION_AMOUNT * 1_000_000);
    console.log("Allocation BN:", allocationBN.toString());

    try {
        const tx = await (program.methods as any)
            .recordAllocation(allocationBN)
            .accounts({
                bid: bidPda,
                launch: launchPda,
                authority: wallet.publicKey,
            })
            .rpc({ skipPreflight: false });

        console.log("✅ SUCCESS! Tx:", tx);
    } catch (e: any) {
        console.log("\n❌ FULL ERROR:");
        console.log(JSON.stringify(e, null, 2));

        if (e.logs) {
            console.log("\n📋 PROGRAM LOGS:");
            e.logs.forEach((log: string) => console.log(log));
        }

        if (e.error) {
            console.log("\n🔍 ERROR DETAILS:");
            console.log(e.error);
        }
    }
}

main().catch(console.error);
