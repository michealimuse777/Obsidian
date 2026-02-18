/**
 * Register Arcium computation definitions on devnet.
 * Uses raw @solana/web3.js — no @arcium-hq/client ESM dependency.
 *
 * PDA derivations extracted from arcium-anchor v0.8.4 source:
 *   MXE_PDA_SEED        = b"MXEAccount"
 *   COMP_DEF_PDA_SEED   = b"ComputationDefinitionAccount"
 *   LUT                 = derive_lookup_table_address(mxe_pda, lut_offset_slot)
 *
 * Usage: node scripts/init-comp-defs.cjs
 */
const {
    Connection, Keypair, PublicKey,
    TransactionInstruction, Transaction,
    sendAndConfirmTransaction, AddressLookupTableProgram,
} = require("@solana/web3.js");
const { createHash } = require("crypto");
const fs = require("fs");
const os = require("os");

// ─── Config ───────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("8nkjktP5dWDYCkwR3fJFSuQANB1vyw5g5LTHCrxnf3CE");
const ARCIUM_PROGRAM_ID = new PublicKey("Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ");
const LUT_PROGRAM_ID = new PublicKey("AddressLookupTab1e1111111111111111111111111");
const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");
const RPC_URL = "https://api.devnet.solana.com";

// ─── Load wallet ──────────────────────────────────────────────────
const keypairPath = `${os.homedir()}/.config/solana/id.json`;
const rawKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
const payer = Keypair.fromSecretKey(Uint8Array.from(rawKey));
console.log("Payer:", payer.publicKey.toBase58());

const connection = new Connection(RPC_URL, "confirmed");

// ─── PDA Seeds (from arcium-anchor v0.8.4) ────────────────────────
const MXE_PDA_SEED = Buffer.from("MXEAccount");
const COMP_DEF_PDA_SEED = Buffer.from("ComputationDefinitionAccount");

// ─── Helpers ──────────────────────────────────────────────────────
function anchorDiscriminator(name) {
    return createHash("sha256").update(`global:${name}`).digest().slice(0, 8);
}

function deriveMxePda(programId) {
    return PublicKey.findProgramAddressSync(
        [MXE_PDA_SEED, programId.toBuffer()],
        ARCIUM_PROGRAM_ID
    )[0];
}

function compDefOffset(circuitName) {
    const hash = createHash("sha256").update(circuitName).digest();
    return hash.readUInt32LE(0);
}

function deriveCompDefPda(programId, offset) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(offset);
    return PublicKey.findProgramAddressSync(
        [COMP_DEF_PDA_SEED, programId.toBuffer(), buf],
        ARCIUM_PROGRAM_ID
    )[0];
}

async function findMxeLutAddress(mxePda) {
    const info = await connection.getAccountInfo(mxePda);
    if (!info) throw new Error("MXE account not found — run 'arcium deploy --skip-deploy' first");
    const data = info.data;

    // lut_offset_slot is a u64 at byte offset 261 in the MXE account data
    // (discovered via hex dump analysis of the on-chain account)
    const LUT_OFFSET_BYTE = 261;
    const slot = data.readBigUInt64LE(LUT_OFFSET_BYTE);
    console.log(`  LUT offset slot: ${slot} (at byte ${LUT_OFFSET_BYTE})`);

    // Solana's derive_lookup_table_address: seeds=[authority, slot_le_bytes] owner=LUT_PROGRAM
    const slotBuf = Buffer.alloc(8);
    slotBuf.writeBigUInt64LE(slot);
    const [lutAddr] = PublicKey.findProgramAddressSync(
        [mxePda.toBuffer(), slotBuf],
        LUT_PROGRAM_ID
    );

    const lutInfo = await connection.getAccountInfo(lutAddr);
    if (!lutInfo) throw new Error(`LUT account ${lutAddr.toBase58()} not found on-chain`);
    console.log(`  LUT: ${lutAddr.toBase58()}`);
    return lutAddr;
}

// ─── Build & send init_comp_def tx ────────────────────────────────
async function initCompDef(ixName, circuitName) {
    console.log(`\n=== Initializing "${circuitName}" comp def ===`);

    const disc = anchorDiscriminator(ixName);
    const mxe = deriveMxePda(PROGRAM_ID);
    const offset = compDefOffset(circuitName);
    const compDef = deriveCompDefPda(PROGRAM_ID, offset);

    console.log("  Disc:     ", disc.toString("hex"));
    console.log("  MXE:      ", mxe.toBase58());
    console.log("  CompDef:  ", compDef.toBase58());
    console.log("  Offset:   ", offset);

    // Check if comp def already exists
    const existing = await connection.getAccountInfo(compDef);
    if (existing) {
        console.log("  ⚠️  Already initialized, skipping.");
        return;
    }

    const lut = await findMxeLutAddress(mxe);

    const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: payer.publicKey, isSigner: true, isWritable: true },  // payer
            { pubkey: mxe, isSigner: false, isWritable: true },  // mxe_account
            { pubkey: compDef, isSigner: false, isWritable: true },  // comp_def_account
            { pubkey: lut, isSigner: false, isWritable: true },  // address_lookup_table
            { pubkey: LUT_PROGRAM_ID, isSigner: false, isWritable: false }, // lut_program
            { pubkey: ARCIUM_PROGRAM_ID, isSigner: false, isWritable: false }, // arcium_program
            { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }, // system_program
        ],
        data: disc,
    });

    const tx = new Transaction().add(ix);
    try {
        const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
            commitment: "confirmed",
            maxRetries: 5,
        });
        console.log("  ✅ Success:", sig);
        console.log("  Explorer: https://explorer.solana.com/tx/" + sig + "?cluster=devnet");
    } catch (err) {
        console.error("  ❌ Failed:", err.message);
        if (err.logs) console.error("  Logs:\n  " + err.logs.slice(-10).join("\n  "));
        throw err;
    }
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
    const bal = await connection.getBalance(payer.publicKey);
    console.log("Balance:", (bal / 1e9).toFixed(4), "SOL\n");

    // Verify MXE account exists
    const mxe = deriveMxePda(PROGRAM_ID);
    const mxeInfo = await connection.getAccountInfo(mxe);
    if (!mxeInfo) {
        console.error("ERROR: MXE account", mxe.toBase58(), "does not exist on devnet.");
        console.error("Run: arcium deploy --cluster-offset 456 --recovery-set-size 4 --keypair-path ~/.config/solana/id.json -u d --skip-deploy");
        process.exit(1);
    }
    console.log("MXE account confirmed:", mxe.toBase58(), `(${mxeInfo.data.length} bytes)`);

    await initCompDef("init_winner_comp_def", "compute_winner");
    await initCompDef("init_allocation_comp_def", "compute_allocation");

    console.log("\n🎉 Both computation definitions registered on devnet!");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
