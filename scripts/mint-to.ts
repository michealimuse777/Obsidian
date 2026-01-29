import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import * as fs from "fs";

// Configuration
const MINT_ADDRESS = new PublicKey("Ankn2F9vZvhM8jJhcFaijU2jMHTeRnHS8uGGf2xG9LpE");
const RPC_URL = "https://api.devnet.solana.com";

async function main() {
    // 1. Get Target User Address
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error("Usage: npx ts-node scripts/mint-to.ts <YOUR_WALLET_ADDRESS>");
        process.exit(1);
    }
    let targetPubkey: PublicKey;
    try {
        targetPubkey = new PublicKey(args[0]);
    } catch (e) {
        console.error("Invalid Public Key provided.");
        process.exit(1);
    }

    // 2. Load Deployer Wallet (Mint Authority)
    if (!fs.existsSync("win_keypair.json")) {
        console.error("Error: win_keypair.json not found. Cannot sign mint transaction.");
        process.exit(1);
    }
    const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync("win_keypair.json", "utf-8")));
    const deployer = Keypair.fromSecretKey(secretKey);

    const connection = new Connection(RPC_URL, "confirmed");

    console.log(`Minting 10,000 Test Tokens to ${targetPubkey.toBase58()}...`);
    console.log(`Authority: ${deployer.publicKey.toBase58()}`);

    try {
        // 3. Get or Create ATA for User
        const userAta = await getOrCreateAssociatedTokenAccount(
            connection,
            deployer, // Payer of the initialization fee
            MINT_ADDRESS,
            targetPubkey
        );

        console.log(`User ATA: ${userAta.address.toBase58()}`);

        // 4. Mint Tokens
        const tx = await mintTo(
            connection,
            deployer, // Payer
            MINT_ADDRESS,
            userAta.address, // Destination
            deployer, // Mint Authority
            10_000 * 1_000_000 // Amount (10k * 6 decimals)
        );

        console.log(`✅ Success! Transaction Signature: ${tx}`);
        console.log("You can now refresh the app and submit a bid.");

    } catch (err) {
        console.error("Minting failed:", err);
    }
}

main();
