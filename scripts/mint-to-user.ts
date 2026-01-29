import { Connection, PublicKey, Keypair, clusterApiUrl } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import * as fs from "fs";

async function main() {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    // User's wallet address
    const userWallet = new PublicKey("3Vyn8g2avGj3EaWDv1mCfo5Qd72XttvTHWCmgcH7EWSw");

    // Test Mint Address (from constants.ts)
    const testMint = new PublicKey("Ankn2F9vZvhM8jJhcFaijU2jMHTeRnHS8uGGf2xG9LpE");

    // Load the mint authority keypair - try local file first
    const possiblePaths = [
        "./win_keypair.json",
        "./arcium_keypair.json",
        `${process.env.HOME || process.env.USERPROFILE}/.config/solana/id.json`,
    ];

    let payer: Keypair | null = null;
    let usedPath = "";

    for (const kpPath of possiblePaths) {
        try {
            const keypairData = JSON.parse(fs.readFileSync(kpPath, "utf8"));
            payer = Keypair.fromSecretKey(Uint8Array.from(keypairData));
            usedPath = kpPath;
            break;
        } catch (e) {
            // Try next path
        }
    }

    if (!payer) {
        console.error("Could not load keypair from any known location.");
        console.error("Tried:", possiblePaths);
        process.exit(1);
    }

    console.log("Loaded keypair from:", usedPath);
    console.log("Payer (Mint Authority):", payer.publicKey.toBase58());
    console.log("User Wallet:", userWallet.toBase58());
    console.log("Test Mint:", testMint.toBase58());

    // 1. Get or Create Associated Token Account for the user
    console.log("\nCreating/Finding ATA for user...");
    const userAta = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        testMint,
        userWallet
    );
    console.log("User ATA:", userAta.address.toBase58());

    // 2. Mint 10,000 tokens (with 6 decimals = 10,000,000,000 base units)
    const amountToMint = 10_000 * 1_000_000; // 10,000 USDC
    console.log(`\nMinting ${amountToMint / 1_000_000} tokens to user...`);

    const txSig = await mintTo(
        connection,
        payer,
        testMint,
        userAta.address,
        payer, // Mint authority
        amountToMint
    );

    console.log("\n✅ Minting successful!");
    console.log("Transaction:", txSig);
    console.log(`\nUser now has ${amountToMint / 1_000_000} Test USDC in their wallet.`);
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
