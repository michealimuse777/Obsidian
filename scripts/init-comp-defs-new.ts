/**
 * Force-initialize computation definitions for the NEW program on devnet.
 * Usage: node --import tsx scripts/init-comp-defs-new.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ObsidianAuction } from "../target/types/obsidian_auction.ts";
import {
    getCompDefAccAddress,
    getCompDefAccOffset,
    getMXEAccAddress,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as path from "path";

async function main() {
    // Load wallet
    const winKp = path.resolve(process.cwd(), "win_keypair.json");
    const defaultKp = `${require("os").homedir()}/.config/solana/id.json`;
    const kpPath = fs.existsSync(winKp) ? winKp : defaultKp;
    const raw = JSON.parse(fs.readFileSync(kpPath, "utf-8"));
    const owner = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(raw));

    console.log("Wallet:", owner.publicKey.toBase58());

    // Setup provider
    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
    const wallet = new anchor.Wallet(owner);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    anchor.setProvider(provider);

    // Load program
    const idl = JSON.parse(fs.readFileSync("target/idl/obsidian_auction.json", "utf-8"));
    const programId = new anchor.web3.PublicKey("6XDoHizZE4avqDJbtdM8oqZinHSVP13LpMYhuivrmdoy");
    const program = new Program<ObsidianAuction>(idl as any, provider);

    console.log("Program ID:", program.programId.toBase58());

    const mxeAddr = getMXEAccAddress(program.programId);
    console.log("MXE Address:", mxeAddr.toBase58());

    // Check MXE exists
    const mxeInfo = await connection.getAccountInfo(mxeAddr);
    if (!mxeInfo) {
        console.log("ERROR: MXE account not found! Deploy with arcium deploy first.");
        return;
    }
    console.log("MXE Account: EXISTS (" + mxeInfo.data.length + " bytes)");

    // Check and init compute_winner
    const winnerOffset = Buffer.from(getCompDefAccOffset("compute_winner")).readUInt32LE();
    const winnerAddr = getCompDefAccAddress(program.programId, winnerOffset);
    console.log("\ncompute_winner CompDef:", winnerAddr.toBase58());

    const winnerInfo = await connection.getAccountInfo(winnerAddr);
    if (winnerInfo) {
        console.log("  Already initialized, skipping.");
    } else {
        console.log("  NOT FOUND - initializing...");
        try {
            const sig = await program.methods
                .initWinnerCompDef()
                .accountsPartial({
                    payer: owner.publicKey,
                    mxeAccount: mxeAddr,
                })
                .signers([owner])
                .rpc();
            console.log("  ✅ Initialized! Sig:", sig);
        } catch (e: any) {
            console.log("  ❌ Error:", e.message?.substring(0, 300));
            if (e.logs) console.log("  Logs:", e.logs.slice(-5).join("\n  "));
        }
    }

    // Check and init compute_allocation
    const allocOffset = Buffer.from(getCompDefAccOffset("compute_allocation")).readUInt32LE();
    const allocAddr = getCompDefAccAddress(program.programId, allocOffset);
    console.log("\ncompute_allocation CompDef:", allocAddr.toBase58());

    const allocInfo = await connection.getAccountInfo(allocAddr);
    if (allocInfo) {
        console.log("  Already initialized, skipping.");
    } else {
        console.log("  NOT FOUND - initializing...");
        try {
            const sig = await program.methods
                .initAllocationCompDef()
                .accountsPartial({
                    payer: owner.publicKey,
                    mxeAccount: mxeAddr,
                })
                .signers([owner])
                .rpc();
            console.log("  ✅ Initialized! Sig:", sig);
        } catch (e: any) {
            console.log("  ❌ Error:", e.message?.substring(0, 300));
            if (e.logs) console.log("  Logs:", e.logs.slice(-5).join("\n  "));
        }
    }

    // Now finalize both
    console.log("\n=== Finalizing comp defs ===");
    const { buildFinalizeCompDefTx } = await import("@arcium-hq/client");

    for (const [name, offset] of [["compute_winner", winnerOffset], ["compute_allocation", allocOffset]] as const) {
        console.log(`\nFinalizing ${name} (offset: ${offset})...`);
        try {
            const tx = await buildFinalizeCompDefTx(provider, offset, program.programId);
            const sig = await provider.sendAndConfirm(tx, [owner]);
            console.log(`  ✅ Finalized! Sig: ${sig}`);
        } catch (e: any) {
            console.log(`  ❌ Error: ${e.message?.substring(0, 400)}`);
            if (e.logs) console.log("  Logs:", e.logs.slice(-5).join("\n  "));
        }
    }

    console.log("\nDone!");
}

main().catch(console.error);
