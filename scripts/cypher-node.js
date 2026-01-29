const anchor = require("@coral-xyz/anchor");
const { Program, BN } = anchor;
const { PublicKey, Keypair } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");
const nacl = require("tweetnacl");
const naclUtil = require("tweetnacl-util");
const { encodeBase64 } = naclUtil;

const ARCIUM_KEYPAIR_PATH = path.resolve(__dirname, "../arcium_keypair.json");
const IDL_PATH = path.resolve(__dirname, "../src/utils/obsidian-idl.json");
const DEPLOYER_KEY_PATH = path.resolve(__dirname, "../win_keypair.json");

// --- INLINED ARCIUM LIB ---
const arcium = {
    decrypt: (fullPayload, nodeSecretKey) => {
        try {
            const nonce = fullPayload.slice(0, nacl.box.nonceLength);
            const clientPublicKey = fullPayload.slice(nacl.box.nonceLength, nacl.box.nonceLength + nacl.box.publicKeyLength);
            const ciphertext = fullPayload.slice(nacl.box.nonceLength + nacl.box.publicKeyLength);

            const decrypted = nacl.box.open(
                ciphertext,
                nonce,
                clientPublicKey,
                nodeSecretKey
            );

            if (!decrypted) return null;
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            console.error("Decryption failed:", e);
            return null;
        }
    }
};

function loadOrGenerateKeypair() {
    if (fs.existsSync(ARCIUM_KEYPAIR_PATH)) {
        const secretKey = Buffer.from(JSON.parse(fs.readFileSync(ARCIUM_KEYPAIR_PATH, "utf-8")));
        return nacl.box.keyPair.fromSecretKey(new Uint8Array(secretKey));
    } else {
        const keypair = nacl.box.keyPair();
        fs.writeFileSync(ARCIUM_KEYPAIR_PATH, JSON.stringify(Array.from(keypair.secretKey)));
        console.log("🆕 Generated new Arcium Node Keypair");
        return keypair;
    }
}

function runAiModel(decryptedAmount) {
    let score = decryptedAmount / 100;
    if (score > 100) score = 100;
    return Math.floor(score);
}

async function main() {
    process.env.ANCHOR_WALLET = DEPLOYER_KEY_PATH;
    process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";

    // A. Setup
    const nodeKeypair = loadOrGenerateKeypair();
    const clusterPubKeyBase64 = encodeBase64(nodeKeypair.publicKey);
    console.log(`🔑 Node Public Key: ${clusterPubKeyBase64}`);

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

    // B. Fetch Launch State
    // USE CORRECT V1 SEED
    const [launchPda] = PublicKey.findProgramAddressSync([Buffer.from("launch")], programId);

    console.log(`Checking Launch State at: ${launchPda.toBase58()}`);
    const launchState = await program.account.launch.fetchNullable(launchPda);

    if (!launchState) {
        console.error("❌ Launch State not found!");
        return;
    }
    console.log(`🚀 Launch Found! Stored Bump: ${launchState.bump}`);

    // C. Fetch Bids
    console.log("Fetching bids...");
    const allBids = await program.account.bid.all();
    console.log(`📥 Found ${allBids.length} bids.`);

    const allocations = [];
    let totalAllocated = 0;

    for (const record of allBids) {
        const bid = record.account;
        console.log(`   Processing bid from ${bid.bidder.toBase58()}...`);

        // Mock Decryption for now if real fails, or try real
        let amountUsdc = 0;
        if (bid.encryptedData) {
            const dec = arcium.decrypt(new Uint8Array(Buffer.from(bid.encryptedData)), nodeKeypair.secretKey);
            if (dec && dec.startsWith("ENCRYPTED:")) {
                amountUsdc = parseFloat(dec.split(":")[1]);
                console.log(`   🔓 Decrypted: ${amountUsdc} USDC`);
            } else {
                console.log(`   ⚠️ Decrypt failed. (Maybe keypair mismatch). using fallback 1000.`);
                amountUsdc = 1000;
            }
        }

        const tokenAllocation = Math.floor(amountUsdc * 10);
        allocations.push({
            bidder: bid.bidder,
            allocation: new BN(tokenAllocation * 1_000_000),
        });
        totalAllocated += tokenAllocation;
    }

    if (allocations.length === 0) { console.log("No allocations."); return; }

    // D. Record Allocations
    console.log("📝 Recording allocations...");
    for (const alloc of allocations) {
        const [bidPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("bid"), alloc.bidder.toBuffer()],
            programId
        );

        try {
            const tx = await program.methods
                .recordAllocation(alloc.allocation)
                .accounts({
                    bid: bidPda,
                    launch: launchPda,
                    authority: wallet.publicKey,
                })
                .rpc();
            console.log(`   ✅ Recorded. Tx: ${tx}`);
        } catch (e) {
            console.error(`   ❌ Failed: ${e.message}`);
            if (e.logs) console.log(e.logs); // PRINT LOGS
        }
    }

    // E. Finalize
    console.log("⚡ Finalizing...");
    try {
        const tx = await program.methods
            .finalizeLaunch()
            .accounts({
                launch: launchPda,
                authority: wallet.publicKey,
            })
            .rpc();
        console.log(`   ✅ Finalized. Tx: ${tx}`);
    } catch (e) {
        console.error(`   ❌ Finalize Failed: ${e.message}`);
    }
}

main().catch(console.error);
