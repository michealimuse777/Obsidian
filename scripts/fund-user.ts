import anchor from "@coral-xyz/anchor";
const { BN } = anchor;
import { PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import * as fs from "fs";

// Load IDL
const idl = JSON.parse(fs.readFileSync("./src/utils/obsidian-idl.json", "utf8"));

async function main() {
    // 1. Setup Provider from local wallet
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const programId = new PublicKey("BRGaXJJS6oHN1pBPnMhZQHtSfBLmVyYk75xqetsRfib9");
    const program = new anchor.Program(idl as any, provider) as any;

    console.log("Funding User on Devnet...");

    // 2. Fetch Launch Account to find the correct Mint
    const [launchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("launch")], // Make sure this matches lib.rs seeds
        program.programId
    );

    const launchAccount = await program.account.launch.fetch(launchPda);
    const mint = launchAccount.mint;
    console.log("Found Mint:", mint.toBase58());

    // 3. User Address
    const recipient = new PublicKey("3Vyn8g2avGj3EaWDv1mCfo5Qd72XttvTHWCmgcH7EWSw");
    console.log("Recipient:", recipient.toBase58());

    // 4. Get/Create User ATA
    const recipientAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        (provider.wallet as any).payer,
        mint,
        recipient
    );
    console.log("Recipient ATA:", recipientAta.address.toBase58());

    // 5. Mint Tokens
    // Mint 5,000 USDC (6 decimals)
    const amount = 5000 * 1_000_000;

    await mintTo(
        provider.connection,
        (provider.wallet as any).payer, // Authority
        mint,
        recipientAta.address,
        provider.publicKey, // Mint Authority
        amount
    );

    console.log(`✅ Successfully minted 5,000 USDC to ${recipient.toBase58()}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
