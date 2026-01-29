import anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    createMintToInstruction,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    console.log("💰 Funding Launch Pool...");

    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
    const deployerKeyPath = path.resolve(__dirname, "../win_keypair.json");
    const payer = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(deployerKeyPath, "utf-8")))
    );

    // Load IDL and fetch launch state
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
    const launchPool = launchState.launchPool as PublicKey;

    console.log(`Payment Mint: ${mint.toBase58()}`);
    console.log(`Launch Pool: ${launchPool.toBase58()}`);

    // Check current balance
    const balanceInfo = await connection.getTokenAccountBalance(launchPool);
    console.log(`Current Pool Balance: ${balanceInfo.value.uiAmount}`);

    // Mint 1,000,000 tokens to the launch pool (enough for claims)
    const amount = 1_000_000 * 1_000_000; // 1M tokens with 6 decimals
    console.log(`Minting ${amount / 1_000_000} tokens to launch pool...`);

    const tx = new Transaction();
    tx.add(
        createMintToInstruction(
            mint,
            launchPool,
            payer.publicKey, // mint authority
            amount,
            [],
            TOKEN_PROGRAM_ID
        )
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);

    console.log(`\n✅ Launch Pool Funded!`);
    console.log(`Transaction: https://explorer.solana.com/tx/${sig}?cluster=devnet`);

    // Verify new balance
    const newBalance = await connection.getTokenAccountBalance(launchPool);
    console.log(`New Pool Balance: ${newBalance.value.uiAmount}`);
}

main().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
