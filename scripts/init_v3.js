
const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair, SystemProgram } = require("@solana/web3.js");
const { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Initializing Fresh Launch (V3) - JS Mode...");

    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

    // Load Wallet
    const deployerKeyPath = path.resolve(__dirname, "../win_keypair.json");
    const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(deployerKeyPath, "utf-8")));
    const payer = Keypair.fromSecretKey(secretKey);
    const wallet = new anchor.Wallet(payer);

    console.log("Using Wallet:", payer.publicKey.toBase58());

    // Load IDL
    const idlPath = path.resolve(__dirname, "../src/utils/obsidian-idl.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    anchor.setProvider(provider);

    const NEW_SEED = "launch_v3";

    // Program ID
    const programId = new PublicKey("8nkjktP5dWDYCkwR3fJFSuQANB1vyw5g5LTHCrxnf3CE");
    const program = new anchor.Program(idl, provider);

    console.log(`Program ID: ${programId.toBase58()}`);
    console.log(`Using Seed: "${NEW_SEED}"`);

    // 1. Create a New Mint for the Launch Pool (Obsidian Token)
    console.log("\n1. Creating new Token Mint...");
    const mint = await createMint(
        connection,
        payer,
        payer.publicKey,
        null,
        6 // 6 decimals
    );
    console.log(`Created Mint: ${mint.toBase58()}`);

    // Wait for mint to propogate
    console.log("Waiting for mint confirmation...");
    await new Promise(r => setTimeout(r, 6000));

    // 2. Derive PDA
    const [launchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(NEW_SEED)],
        programId
    );
    console.log(`Launch PDA: ${launchPda.toBase58()}`);

    // 3. Initialize Launch
    console.log("\n2. Initializing Launch...");
    // 3. Initialize Launch
    console.log("\n2. Initializing Launch...");
    // REMOVED TRY/CATCH to see actual error
    const tx = await program.methods
        .initializeLaunch(new anchor.BN(1_000_000_000), new anchor.BN(10_000))
        .accounts({
            launch: launchPda,
            authority: payer.publicKey,
            mint: mint,
            launchPool: await anchor.utils.token.associatedAddress({ mint, owner: launchPda }),
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

    console.log(`✅ Initialized! Tx: ${tx}`);

    // 4. Fund the Launch Pool (for future claims)
    console.log("\n3. Funding Launch Pool...");
    try {
        const launchState = await program.account.launch.fetch(launchPda);
        const launchPool = launchState.launchPool;

        console.log(`Launch Pool Address: ${launchPool.toBase58()}`);

        const amount = 1_000_000 * 1_000_000; // 1M tokens
        await mintTo(
            connection,
            payer,
            mint,
            launchPool,
            payer.publicKey,
            amount
        );
        console.log(`✅ Minted ${amount / 1_000_000} tokens to pool.`);
    } catch (e) {
        console.error("Funding Error:", e);
    }

    console.log("\n🎉 DONE! New Launch V3 is Ready.");
}

main().catch(console.error);
