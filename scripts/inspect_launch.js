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
    const programId = new PublicKey("BRGaXJJS6oHN1pBPnMhZQHtSfBLmVyYk75xqetsRfib9");

    const [launchPda] = PublicKey.findProgramAddressSync([Buffer.from("launch")], programId);
    console.log(`Fetching Launch at: ${launchPda.toBase58()}`);

    const launch = await program.account.launch.fetch(launchPda);
    const logs = [];
    logs.push(`Is Finalized: ${launch.isFinalized}`);
    logs.push(`Total Tokens: ${launch.totalTokens.toString()}`);
    logs.push(`Tokens Distr: ${launch.tokensDistributed.toString()}`);
    logs.push(`Bump:         ${launch.bump}`);
    console.log(logs.join("\n"));
    fs.writeFileSync("launch_dump_utf8.txt", logs.join("\n"), "utf8");
}

main().catch(console.error);
