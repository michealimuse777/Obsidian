
import anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    const recipient = new PublicKey("3Vyn8g2avGj3EaWDv1mCfo5Qd72XttvTHWCmgcH7EWSw");
    const mint = new PublicKey("ijFB6GApaz4WwyJ729kSjPsCKuxyA2k9vP5HTo7eS7W");

    console.log(`Minting 1,000 tokens to ${recipient.toBase58()}...`);

    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
    const deployerKeyPath = path.resolve(__dirname, "../win_keypair.json");
    const payer = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(deployerKeyPath, "utf-8")))
    );

    const recipientAta = await getAssociatedTokenAddress(mint, recipient);
    console.log(`Target ATA: ${recipientAta.toBase58()}`);

    const tx = new Transaction();

    // Check if account exists
    try {
        const accountInfo = await connection.getAccountInfo(recipientAta);
        if (!accountInfo) {
            console.log("Adding instruction to create recipient's token account...");
            tx.add(
                createAssociatedTokenAccountInstruction(
                    payer.publicKey,
                    recipientAta,
                    recipient,
                    mint
                )
            );
        } else {
            console.log("Recipient's token account already exists.");
        }
    } catch (e) {
        console.log("Error checking account, assuming it needs creation...");
        tx.add(
            createAssociatedTokenAccountInstruction(
                payer.publicKey,
                recipientAta,
                recipient,
                mint
            )
        );
    }

    console.log("Adding mint instruction...");
    const amount = 1000 * 1_000_000; // 1,000 tokens with 6 decimals
    tx.add(
        createMintToInstruction(
            mint,
            recipientAta,
            payer.publicKey,
            amount
        )
    );

    console.log("Sending and confirming transaction...");
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);

    console.log(`\n✅ Success! Minted 1,000 tokens.`);
    console.log(`Transaction ID: ${sig}`);
    console.log(`View on Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch(console.error);
