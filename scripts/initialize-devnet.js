const anchor = require("@coral-xyz/anchor");
const { BN } = anchor;
const { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair } = require("@solana/web3.js");
const {
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createMint,
    getAssociatedTokenAddress
} = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

const idl = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../src/utils/obsidian-idl.json"), "utf8"));
const WALLET_PATH = path.resolve(__dirname, "../win_keypair.json");

async function main() {
    // Configure the client
    process.env.ANCHOR_WALLET = WALLET_PATH;
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";

    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8")))
    );
    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    anchor.setProvider(provider);

    const programId = new PublicKey("BRGaXJJS6oHN1pBPnMhZQHtSfBLmVyYk75xqetsRfib9");
    const program = new anchor.Program(idl, provider);

    console.log("=== Initializing Launch on Devnet ===");
    console.log("Program ID:", programId.toBase58());
    console.log("Authority:", provider.publicKey.toBase58());

    // 1. Derive PDAs
    const [launchPda, launchBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("launch")],
        programId
    );

    console.log("Launch PDA:", launchPda.toBase58());
    console.log("Launch Bump:", launchBump);

    // Check if already initialized
    try {
        const account = await program.account.launch.fetchNullable(launchPda);
        if (account) {
            console.log("\n✅ Launch already initialized!");
            console.log("- isFinalized:", account.isFinalized);
            console.log("- totalTokens:", account.totalTokens.toString());
            console.log("- mint:", account.mint.toBase58());
            return;
        }
    } catch (e) {
        console.log("Account check error (probably doesn't exist):", e.message);
    }

    // 2. Create a Mint (Payment Token) for testing using Token-2022
    console.log("\nCreating Test Mint (Token-2022)...");
    const mint = await createMint(
        provider.connection,
        walletKeypair,           // payer
        provider.publicKey,      // mint authority
        null,                    // freeze authority
        6,                       // decimals (like USDC)
        undefined,               // keypair (generate new)
        undefined,               // confirmOptions
        TOKEN_2022_PROGRAM_ID    // Use Token-2022!
    );
    console.log("Created Test Mint:", mint.toBase58());

    // 3. Derive Launch Pool ATA (for Token-2022)
    const launchPool = await getAssociatedTokenAddress(
        mint,
        launchPda,
        true,                    // allowOwnerOffCurve = true for PDAs
        TOKEN_2022_PROGRAM_ID,   // Token-2022
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("Launch Pool ATA:", launchPool.toBase58());

    // 4. Initialize Launch
    console.log("\nSending Initialize Transaction...");
    try {
        const txSig = await program.methods
            .initializeLaunch(new BN(1_000_000 * 1e6), new BN(1_000 * 1e6))
            .accounts({
                launch: launchPda,
                mint: mint,
                launchPool: launchPool,
                authority: provider.publicKey,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .rpc();

        console.log("\n✅ Launch Initialized Successfully!");
        console.log("Transaction Signature:", txSig);
        console.log("Mint Address:", mint.toBase58());
        console.log("Launch PDA:", launchPda.toBase58());

        // Verify
        const launch = await program.account.launch.fetch(launchPda);
        console.log("\n=== Verification ===");
        console.log("- authority:", launch.authority.toBase58());
        console.log("- mint:", launch.mint.toBase58());
        console.log("- totalTokens:", launch.totalTokens.toString());
        console.log("- isFinalized:", launch.isFinalized);
    } catch (err) {
        console.error("\n❌ Transaction Failed!");
        console.error("Error:", err.message);
        if (err.logs) {
            console.error("\nProgram Logs:");
            err.logs.forEach(log => console.error(log));
        }
        throw err;
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
