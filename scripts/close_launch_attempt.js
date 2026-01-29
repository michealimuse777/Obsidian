const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const fs = require("fs");

const idl = JSON.parse(fs.readFileSync("./src/utils/obsidian-idl.json", "utf8"));

async function main() {
    process.env.ANCHOR_WALLET = "./win_keypair.json";
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = new anchor.Program(idl, provider);

    const [launchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("launch")],
        program.programId
    );

    console.log("Closing Launch Account:", launchPda.toBase58());

    // We don't have a 'close_launch' instruction in the contract to close it gracefully?
    // And standard `program close` is for the PROGRAM BUFFER, not the PDA.
    // To close a PDA, we need an instruction in the program that does `close = authority`.
    // Wait, the new contract DOES NOT have a close instruction.

    // Alternative: We can't close it if the contract doesn't allow it.
    // BUT: The bug was `launch.bump` was 0.
    // The new `initialize` code sets `launch.bump = ...`.
    // Can we call `initialize` again? No, `init` check fails if account exists.

    // CRITICAL PIVOT:
    // We cannot close the account without redeploying a contract with a close instruction.
    // OR... we deployment a "migration" contract? Too slow.

    // HACK: We change the SEED.
    // "launch" -> "launch_v2".
    // This creates a NEW PDA.
    // Requires updating:
    // 1. lib.rs (seeds = [b"launch_v2"])
    // 2. Client code

    // Actually, checking standard Anchor behavior.
    // If I deploy a new program to a NEW Program ID? No, we want to keep the ID.

    console.log("Cannot close PDA without contract support. Checking other options...");
}

// main();
