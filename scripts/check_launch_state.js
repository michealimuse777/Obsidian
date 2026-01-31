const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

async function main() {
    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
    const programId = new PublicKey("8nkjktP5dWDYCkwR3fJFSuQANB1vyw5g5LTHCrxnf3CE");

    const [launchV3Pda] = PublicKey.findProgramAddressSync([Buffer.from("launch_v3")], programId);
    const [launchV2Pda] = PublicKey.findProgramAddressSync([Buffer.from("launch_v2")], programId);

    console.log("launch_v3 PDA:", launchV3Pda.toBase58());
    console.log("launch_v2 PDA:", launchV2Pda.toBase58());

    const idlPath = path.resolve(__dirname, "../src/utils/obsidian-idl.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const program = new anchor.Program(idl, provider);

    console.log("\n--- Checking V3 State ---");
    try {
        const v3State = await program.account.launch.fetch(launchV3Pda);
        console.log("V3 EXISTS!");
        console.log("  isFinalized:", v3State.isFinalized);
        console.log("  mint:", v3State.mint.toBase58());
    } catch (e) {
        console.log("V3 NOT FOUND:", e.message.slice(0, 100));
    }

    console.log("\n--- Checking V2 State ---");
    try {
        const v2State = await program.account.launch.fetch(launchV2Pda);
        console.log("V2 EXISTS!");
        console.log("  isFinalized:", v2State.isFinalized);
    } catch (e) {
        console.log("V2 NOT FOUND:", e.message.slice(0, 100));
    }
}

main().catch(console.error);
