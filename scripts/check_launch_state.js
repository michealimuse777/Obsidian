const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

async function main() {
    // 1. Setup Connection
    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
    const programId = new PublicKey("8nkjktP5dWDYCkwR3fJFSuQANB1vyw5g5LTHCrxnf3CE");

    console.log("--- CHECKING ONLY V3 ---");

    // 2. Derive PDA
    const [launchV3Pda] = PublicKey.findProgramAddressSync([Buffer.from("launch_v3")], programId);
    console.log("PDA:", launchV3Pda.toBase58());

    // 3. Check Account Info (Raw)
    const info = await connection.getAccountInfo(launchV3Pda);
    if (info) {
        console.log("✅ V3 ACCOUNT EXISTS ON CHAIN!");
        console.log("   Owner:", info.owner.toBase58());
        console.log("   Data Len:", info.data.length);
    } else {
        console.log("❌ V3 ACCOUNT NOT FOUND ON CHAIN");
        console.log("   (This means initialization failed or didn't run)");
    }
}

main().catch(console.error);
