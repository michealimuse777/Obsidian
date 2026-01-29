const anchor = require("@coral-xyz/anchor");
const { BN } = anchor;
const { PublicKey } = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount, mintTo } = require("@solana/spl-token");
const fs = require("fs");

async function main() {
    // 1. Setup Provider from local wallet (win_keypair.json is usually default if ANCHOR_WALLET is set)
    // If ANCHOR_WALLET is not set, we might need to load it manually. 
    // Usually anchor.AnchorProvider.env() looks for ANCHOR_WALLET env var.
    process.env.ANCHOR_WALLET = "./win_keypair.json";
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";

    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Load IDL
    const idl = JSON.parse(fs.readFileSync("./src/utils/obsidian-idl.json", "utf8"));
    const programId = new PublicKey("BRGaXJJS6oHN1pBPnMhZQHtSfBLmVyYk75xqetsRfib9");
    const program = new anchor.Program(idl, provider);

    console.log("Funding User on Devnet...");

    // 2. Fetch Launch Account to find the correct Mint
    const [launchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("launch")],
        program.programId
    );

    const launchAccount = await program.account.launch.fetch(launchPda);
    const mint = launchAccount.mint;
    console.log("Found Mint:", mint.toBase58());

    // 3. User Address
    const recipient = new PublicKey("3Vyn8g2avGj3EaWDv1mCfo5Qd72XttvTHWCmgcH7EWSw");
    console.log("Recipient:", recipient.toBase58());

    // 4. Check Payer Balance & Airdrop if needed
    const payer = provider.wallet.payer;
    const balance = await provider.connection.getBalance(payer.publicKey);
    console.log(`Payer Balance: ${balance / 1e9} SOL`);

    if (balance < 1 * 1e9) {
        console.log("Requesting Airdrop for Payer...");
        try {
            const sig = await provider.connection.requestAirdrop(payer.publicKey, 2 * 1e9);
            await provider.connection.confirmTransaction(sig);
            console.log("Airdrop confirmed.");
        } catch (e) {
            console.log("Airdrop failed (rate limit?) - proceeding anyway.");
        }
    }

    // We need to use SPL Token library to create ATA
    // The provider connection is available
    const recipientAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        mint,
        recipient
    );
    console.log("Recipient ATA:", recipientAta.address.toBase58());

    // 5. Mint Tokens
    // Mint 5,000 USDC (6 decimals)
    const amount = 5000 * 1000000;

    await mintTo(
        provider.connection,
        payer, // Authority
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
