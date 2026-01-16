import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Obsidian } from "../target/types/obsidian";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, getAssociatedTokenAddress } from "@solana/spl-token";

async function main() {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Obsidian as Program<Obsidian>;

    console.log("Initializing Launch on Devnet...");

    // 1. Derive PDAs
    const [launchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("launch")],
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
        .initializeLaunch(new anchor.BN(1_000_000 * 1e6), new anchor.BN(1_000 * 1e6))
        .accounts({
            launch: launchPda,
            mint: mint,
            launchPool: launchPool,
            authority: provider.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

    console.log("Launch Initialized Successfully!");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
