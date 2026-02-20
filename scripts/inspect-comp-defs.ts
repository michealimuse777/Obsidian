import {
    getCompDefAccAddress,
    getCompDefAccOffset,
    getArciumProgramId,
    uploadCircuit,
    buildFinalizeCompDefTx,
    getCircuitState,
} from "@arcium-hq/client";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";

const PROGRAM_ID = new anchor.web3.PublicKey("8nkjktP5dWDYCkwR3fJFSuQANB1vyw5g5LTHCrxnf3CE");

async function main() {
    const walletPath = `${os.homedir()}/.config/solana/id.json`;
    const raw = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
    const kp = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(raw));

    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
    const wallet = new anchor.Wallet(kp);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

    console.log("Wallet:", kp.publicKey.toBase58());
    console.log("Arcium Program:", getArciumProgramId().toBase58());

    // === 1. Check comp def state ===
    const compDefs = ["compute_winner", "compute_allocation"];
    for (const name of compDefs) {
        const offsetBuf = getCompDefAccOffset(name);
        const offset = Buffer.from(offsetBuf).readUInt32LE();
        const address = getCompDefAccAddress(PROGRAM_ID, offset);

        console.log(`\n=== ${name} ===`);
        console.log(`  Address: ${address.toBase58()}`);
        console.log(`  Offset: ${offset}`);

        try {
            const state = await getCircuitState(provider, PROGRAM_ID, offset);
            console.log("  Circuit state:", JSON.stringify(state, null, 2));
        } catch (e: any) {
            console.log("  Circuit state error:", e.message?.substring(0, 200));
        }

        // Read raw account data
        const accInfo = await connection.getAccountInfo(address);
        if (accInfo) {
            console.log(`  Account data length: ${accInfo.data.length} bytes`);
            console.log(`  Owner: ${accInfo.owner.toBase58()}`);
            // Try to read some fields from the data
            if (accInfo.data.length > 8) {
                // Anchor discriminator is first 8 bytes
                const disc = accInfo.data.slice(0, 8);
                console.log(`  Discriminator: ${Buffer.from(disc).toString('hex')}`);
                // Try to read is_completed field (likely a bool somewhere)
                console.log(`  Data preview (hex): ${Buffer.from(accInfo.data.slice(8, Math.min(80, accInfo.data.length))).toString('hex')}`);
            }
        }
    }

    // === 2. Check uploadCircuit signature ===
    console.log("\n\n=== uploadCircuit function ===");
    console.log("Params:", uploadCircuit.length);
    console.log("Source (first 1000 chars):", uploadCircuit.toString().substring(0, 1000));

    // === 3. Check compiled circuit files ===
    console.log("\n\n=== Compiled circuit files ===");
    const circuitDir = "/mnt/c/Users/Zala/.gemini/antigravity/scratch/obsidian/encrypted-ixs/target";
    try {
        const files = fs.readdirSync(circuitDir, { recursive: true });
        for (const f of files) {
            const fullPath = `${circuitDir}/${f}`;
            try {
                const stat = fs.statSync(fullPath);
                if (stat.isFile()) {
                    console.log(`  ${f} (${stat.size} bytes)`);
                }
            } catch { }
        }
    } catch (e: any) {
        console.log("  Dir not found:", e.message.substring(0, 100));
    }
}

main().catch(console.error);
