import anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    const recipient = new PublicKey("3Vyn8g2avGj3EaWDv1mCfo5Qd72XttvTHWCmgcH7EWSw");

    console.log(`Sending tokens to ${recipient.toBase58()}...`);

    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
    const deployerKeyPath = path.resolve(__dirname, "../win_keypair.json");
    const payer = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(deployerKeyPath, "utf-8")))
    );

    // Load IDL and fetch launch state to get the mint
    const idlPath = path.resolve(__dirname, "../src/utils/obsidian-idl.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {});
    anchor.setProvider(provider);
    const program = new anchor.Program(idl, provider) as any;

    const [launchPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("launch_v2")],
        program.programId
    );

    const launchState = await program.account.launch.fetch(launchPDA);
    const mint = launchState.mint as PublicKey;
    console.log(`Payment Mint: ${mint.toBase58()}`);

    // Check which token program the mint uses
    const mintInfo = await connection.getAccountInfo(mint);
    if (!mintInfo) {
        throw new Error("Mint account not found on chain!");
    }
    const tokenProgramId = mintInfo.owner;
    console.log(`Token Program: ${tokenProgramId.toBase58()}`);

    const recipientAta = await getAssociatedTokenAddress(
        mint,
        recipient,
        false,
        tokenProgramId
    );
    console.log(`Recipient ATA: ${recipientAta.toBase58()}`);

    const tx = new Transaction();

    // Check if ATA exists
    const ataInfo = await connection.getAccountInfo(recipientAta);
    if (!ataInfo) {
        console.log("Creating recipient's token account...");
        tx.add(
            createAssociatedTokenAccountInstruction(
                payer.publicKey,
                recipientAta,
                recipient,
                mint,
                tokenProgramId
            )
        );
    } else {
        console.log("Recipient's token account already exists.");
    }

    // Mint 1000 tokens (6 decimals)
    const amount = 1000 * 1_000_000;
    console.log(`Minting ${amount / 1_000_000} tokens...`);
    tx.add(
        createMintToInstruction(
            mint,
            recipientAta,
            payer.publicKey,
            amount,
            [],
            tokenProgramId
        )
    );

    console.log("Sending transaction...");
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);

    console.log(`\n✅ Success! Sent 1,000 tokens.`);
    console.log(`Transaction: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
