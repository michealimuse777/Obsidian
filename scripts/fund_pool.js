const anchor = require("@coral-xyz/anchor");
const { Program } = anchor;
const { PublicKey, Keypair } = require("@solana/web3.js");
const { mintTo, getAssociatedTokenAddress } = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

const IDL_PATH = path.resolve(__dirname, "../src/utils/obsidian-idl.json");
const DEPLOYER_KEY_PATH = path.resolve(__dirname, "../win_keypair.json");

async function main() {
    process.env.ANCHOR_WALLET = DEPLOYER_KEY_PATH;
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";

    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(DEPLOYER_KEY_PATH, "utf-8")))
    );
    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    anchor.setProvider(provider);

    const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));
    const program = new Program(idl, provider);
    const programId = new PublicKey("BRGaXJJS6oHN1pBPnMhZQHtSfBLmVyYk75xqetsRfib9");

    console.log("Fetching Launch State to find Mint...");
    const [launchPda] = PublicKey.findProgramAddressSync([Buffer.from("launch")], programId);
    const launchState = await program.account.launch.fetch(launchPda);

    const mint = launchState.mint;
    const launchPool = launchState.launchPool;

    console.log(`Mint: ${mint.toBase58()}`);
    console.log(`Pool: ${launchPool.toBase58()}`);

    // Mint 1 Billion tokens to the pool to cover all claims
    console.log("Funding Pool with 1,000,000,000 tokens...");

    try {
        const signature = await mintTo(
            connection,
            walletKeypair, // payer & authority
            mint,
            launchPool,
            walletKeypair, // authority
            1_000_000_000 * 1_000_000 // Amount * Decimals (assuming 6)
        );
        console.log(`✅ Success! Fund Tx: ${signature}`);
    } catch (e) {
        console.error("Funding Failed:", e);
    }
}

main().catch(console.error);
