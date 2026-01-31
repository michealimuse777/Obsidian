const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");

async function main() {
    console.log("Checking V3 Account...");
    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
    const programId = new PublicKey("8nkjktP5dWDYCkwR3fJFSuQANB1vyw5g5LTHCrxnf3CE");
    const [launchV3Pda] = PublicKey.findProgramAddressSync([Buffer.from("launch_v3")], programId);
    console.log("PDA:", launchV3Pda.toBase58());

    const info = await connection.getAccountInfo(launchV3Pda);
    if (info) {
        console.log("✅ V3 ACCOUNT EXISTS!");
        console.log("   Size:", info.data.length);
    } else {
        console.log("❌ V3 ACCOUNT NOT FOUND");
    }
}
main().catch(console.error);
