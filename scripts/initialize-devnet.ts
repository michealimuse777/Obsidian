import anchor from "@coral-xyz/anchor";
const { BN } = anchor;
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, getAssociatedTokenAddress } from "@solana/spl-token";
import * as fs from "fs";
const idl = JSON.parse(fs.readFileSync("./src/utils/obsidian-idl.json", "utf8"));

async function main() {
    // Configure the client to use the local cluster.
    // Manual Provider Setup (bypass env vars)
    const connection = new anchor.web3.Connection("https://api.devnet.solana.com");
    const rawKey = JSON.parse(fs.readFileSync("./win_keypair.json", "utf8"));
    const keypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(rawKey));
    const wallet = new anchor.Wallet(keypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {});

    anchor.setProvider(provider);

    const programId = new PublicKey("8nkjktP5dWDYCkwR3fJFSuQANB1vyw5g5LTHCrxnf3CE");
    const program = new anchor.Program(idl as any, provider) as any;

    console.log("Initializing Launch on Devnet...");

    // 1. Derive PDAs
    const [launchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("launch_v2")],
        program.programId
    );

    console.log("Launch PDA:", launchPda.toBase58());

    // Check if already initialized
    const account = await program.account.launch.fetchNullable(launchPda);
    if (account) {
        console.log("Launch already initialized:", account);
        return;
    }

    // 2. Create a Mint (Payment Token) for testing
    // In a real scenario, this would be an existing USDC mint.
    // We'll create a fresh one for this devnet launch.
    const mint = await createMint(
        provider.connection,
        (provider.wallet as any).payer, // Access underlying signer
        provider.publicKey,
        null,
        6 // 6 decimals like USDC
    );

    console.log("Created Test Mint:", mint.toBase58());

    // Wait for Mint to be confirmed
    console.log("Waiting for Mint to be available...");
    let retries = 10;
    while (retries > 0) {
        const info = await provider.connection.getAccountInfo(mint);
        if (info) {
            console.log("Mint Found on-chain!");
            break;
        }
        console.log("Waiting...");
        await new Promise(r => setTimeout(r, 2000));
        retries--;
    }

    // 3. Derive Launch Pool ATA
    const launchPool = await getAssociatedTokenAddress(
        mint,
        launchPda,
        true // allowOwnerOffCurve = true for PDAs
    );
    console.log("Launch Pool ATA:", launchPool.toBase58());

    // 4. Initialize Launch
    // Total Tokens: 1,000,000
    // Max Allocation: 1,000
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
