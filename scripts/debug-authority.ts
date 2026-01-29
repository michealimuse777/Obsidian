/**
 * DEBUG AUTHORITY MISMATCH
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
    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

    // Load win_keypair
    const winKeyPath = path.resolve(__dirname, "../win_keypair.json");
    const winKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(winKeyPath, "utf-8")))
    );

    console.log("═".repeat(50));
    console.log("🔍 AUTHORITY CHECK");
    console.log("═".repeat(50));
    console.log(`\nwin_keypair.json pubkey: ${winKeypair.publicKey.toBase58()}`);

    const wallet = new anchor.Wallet(winKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    anchor.setProvider(provider);

    const idlPath = path.resolve(__dirname, "../src/utils/obsidian-idl.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const program = new Program(idl, provider) as any;
    const programId = new PublicKey("5U9cUS7pKPqfwdMWg9sXy5wtZseDbrmH3poZtAVVaoVp");

    const [launchPda] = PublicKey.findProgramAddressSync([Buffer.from("launch")], programId);
    const launchState = await program.account.launch.fetchNullable(launchPda);

    console.log(`Launch authority:      ${launchState?.authority?.toBase58()}`);
    console.log(`\nMatch: ${winKeypair.publicKey.toBase58() === launchState?.authority?.toBase58() ? "✅ YES" : "❌ NO"}`);

    if (winKeypair.publicKey.toBase58() !== launchState?.authority?.toBase58()) {
        console.log("\n⚠️  MISMATCH! You need to use the WSL keypair that deployed the program.");
    }
}

main().catch(console.error);
