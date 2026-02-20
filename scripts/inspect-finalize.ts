// Inspect buildFinalizeCompDefTx signature and try with explicit account passing
import {
    buildFinalizeCompDefTx,
    getArciumEnv,
    getCompDefAccAddress,
    getCompDefAccOffset,
    getMXEAccAddress,
    getRawCircuitAccAddress,
    getArciumProgramId,
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

    console.log("=== buildFinalizeCompDefTx function info ===");
    console.log("Function source length:", buildFinalizeCompDefTx.toString().length);
    console.log("Function params:", buildFinalizeCompDefTx.length);
    console.log("\nFunction source (first 2000 chars):");
    console.log(buildFinalizeCompDefTx.toString().substring(0, 2000));

    console.log("\n\n=== getRawCircuitAccAddress ===");
    console.log("Params:", getRawCircuitAccAddress.length);
    console.log("Source:", getRawCircuitAccAddress.toString().substring(0, 500));

    console.log("\n\n=== getArciumProgramId ===");
    console.log("Result:", getArciumProgramId().toBase58());
}

main().catch(console.error);
