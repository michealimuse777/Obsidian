/**
 * Upload circuits and finalize comp defs for the new program.
 * Follows the Arcium SDK flow: uploadCircuit() → buildFinalizeCompDefTx()
 */
import { uploadCircuit, buildFinalizeCompDefTx, getCompDefAccOffset } from "@arcium-hq/client";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new anchor.web3.PublicKey("CsS69vzRAZ4dJXFg68tTnP2ei4XCbYzPENdzQnBWU5Ua");
const RPC_URL = "https://devnet.helius-rpc.com/?api-key=f0d2c504-70d7-4e0a-9a16-ed251386301a";

async function main() {
    const winKp = path.resolve(process.cwd(), "win_keypair.json");
    const defaultKp = `${require("os").homedir()}/.config/solana/id.json`;
    const kpPath = fs.existsSync(winKp) ? winKp : defaultKp;
    const raw = JSON.parse(fs.readFileSync(kpPath, "utf-8"));
    const owner = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(raw));

    const connection = new anchor.web3.Connection(RPC_URL, "confirmed");
    const wallet = new anchor.Wallet(owner);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

    console.log("Wallet:", owner.publicKey.toBase58());
    console.log("Program:", PROGRAM_ID.toBase58());

    const circuits = [
        { name: "verify_bid", file: "build/verify_bid.arcis" },
        { name: "compute_winner", file: "build/compute_winner.arcis" },
        { name: "compute_allocation", file: "build/compute_allocation.arcis" },
    ];

    // Step 1: Upload circuits
    for (const circuit of circuits) {
        console.log(`\n=== Uploading circuit: ${circuit.name} ===`);
        const circuitData = fs.readFileSync(circuit.file);
        console.log(`  File: ${circuit.file} (${circuitData.length} bytes)`);

        try {
            await uploadCircuit(
                provider as anchor.AnchorProvider,
                circuit.name,
                PROGRAM_ID,
                circuitData,
                true // logging
            );
            console.log(`  ✅ Circuit uploaded!`);
        } catch (e: any) {
            console.log(`  ❌ Upload error: ${e.message?.substring(0, 300)}`);
            if (e.logs) console.log("  Logs:", e.logs.slice(-5).join("\n  "));
        }
    }

    // Step 2: Finalize comp defs
    for (const circuit of circuits) {
        console.log(`\n=== Finalizing: ${circuit.name} ===`);
        const offset = Buffer.from(getCompDefAccOffset(circuit.name)).readUInt32LE();

        try {
            const tx = await buildFinalizeCompDefTx(provider, offset, PROGRAM_ID);
            const latestBlockhash = await connection.getLatestBlockhash();
            tx.recentBlockhash = latestBlockhash.blockhash;
            tx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
            tx.sign(owner);
            const sig = await provider.sendAndConfirm(tx, [owner]);
            console.log(`  ✅ Finalized! Sig: ${sig}`);
        } catch (e: any) {
            console.log(`  ❌ Finalize error: ${e.message?.substring(0, 300)}`);
            if (e.logs) console.log("  Logs:", e.logs.slice(-5).join("\n  "));
        }
    }

    console.log("\nDone!");
}

main().catch(console.error);
