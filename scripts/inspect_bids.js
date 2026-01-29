const anchor = require("@coral-xyz/anchor");
const { Program } = anchor;
const { PublicKey, Keypair } = require("@solana/web3.js");
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

    console.log("Fetching all bids...");
    const allBids = await program.account.bid.all();
    console.log(`Found ${allBids.length} bids.`);

    for (const record of allBids) {
        const bid = record.account;
        console.log("---------------------------------------------------");
        console.log(`Bidder:      ${bid.bidder.toBase58()}`);
        console.log(`PDA:         ${record.publicKey.toBase58()}`);
        console.log(`Is Processed:${bid.isProcessed}`);
        console.log(`Allocation:  ${bid.allocation.toString()}`);
        console.log(`Is Claimed:  ${bid.isClaimed}`);
        console.log(`Encrypted Data Len: ${bid.encryptedData ? bid.encryptedData.length : 0}`);
    }
    console.log("---------------------------------------------------");
}

main().catch(console.error);
