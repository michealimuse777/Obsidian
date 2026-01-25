const anchor = require("@coral-xyz/anchor");
const { BN } = anchor;
const { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, getAssociatedTokenAddress } = require("@solana/spl-token");
const fs = require("fs");

const idl = JSON.parse(fs.readFileSync("./src/utils/obsidian-idl.json", "utf8"));

async function main() {
    // Configure the client to use the local cluster.
    process.env.ANCHOR_WALLET = "./win_keypair.json";
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const programId = new PublicKey("BRGaXJJS6oHN1pBPnMhZQHtSfBLmVyYk75xqetsRfib9");
    const program = new anchor.Program(idl, provider);

    console.log("Initializing Launch on Devnet...");

    // 1. Derive PDAs
    const [launchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("launch_v1")],
        program.programId
    );

    console.log("Launch PDA:", launchPda.toBase58());

    // Check if already initialized
    try {
        const account = await program.account.launch.fetchNullable(launchPda);
        if (account) {
            console.log("Launch already initialized:", account);
            return;
        }
    } catch (e) {
        console.log("Error fetching account (might not exist):", e.message);
    }

    // 2. Create a Mint (Payment Token) for testing
    console.log("Creating Test Mint...");
    const mint = await createMint(
        provider.connection,
        provider.wallet.payer,
        provider.publicKey,
        null,
        6 // 6 decimals like USDC
    );
    console.log("Created Test Mint:", mint.toBase58());

    // 3. Derive Launch Pool ATA
    const launchPool = await getAssociatedTokenAddress(
        mint,
        launchPda,
        true // allowOwnerOffCurve = true for PDAs
    );
    console.log("Launch Pool ATA:", launchPool.toBase58());

    // 4. Initialize Launch
    console.log("Sending Initialize Transaction...");
    await program.methods
        .initializeLaunch(new BN(1_000_000 * 1e6), new BN(1_000 * 1e6))
        .accounts({
            launch: launchPda,
            mint: mint,
            launchPool: launchPool,
            authority: provider.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

    console.log("Launch Initialized Successfully!");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
