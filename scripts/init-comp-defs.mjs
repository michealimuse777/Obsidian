/**
 * Standalone script to register computation definitions on-chain.
 * This avoids needing the IDL by computing Anchor instruction discriminators manually
 * and deriving all accounts from the @arcium-hq/client helpers.
 *
 * Usage: node scripts/init-comp-defs.mjs
 */
import { Connection, Keypair, PublicKey, TransactionInstruction, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { createHash } from "crypto";
import fs from "fs";
import os from "os";

// ─── Config ───────────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("8nkjktP5dWDYCkwR3fJFSuQANB1vyw5g5LTHCrxnf3CE");
const ARCIUM_PROGRAM_ID = new PublicKey("3E4HnhJ1JgDtkuFTEdFsrpGiBK5CCnVkz4AiMnMQVNMn");
const LUT_PROGRAM_ID = new PublicKey("AddressLookupTab1e1111111111111111111111111");
const RPC_URL = "https://api.devnet.solana.com";
const CLUSTER_OFFSET = 456;

// ─── Load wallet keypair ──────────────────────────────────────────
const keypairPath = `${os.homedir()}/.config/solana/id.json`;
const rawKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
const payer = Keypair.fromSecretKey(Uint8Array.from(rawKey));
console.log("Payer:", payer.publicKey.toBase58());

const connection = new Connection(RPC_URL, "confirmed");

// ─── Anchor discriminator helper ──────────────────────────────────
function getDiscriminator(instructionName) {
    const hash = createHash("sha256")
        .update(`global:${instructionName}`)
        .digest();
    return hash.slice(0, 8);
}

// ─── Arcium PDA derivation ────────────────────────────────────────
function getMXEAccAddress(programId) {
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("mxe"), programId.toBuffer()],
        ARCIUM_PROGRAM_ID
    );
    return pda;
}

function getCompDefAccAddress(programId, compDefOffset) {
    const offsetBuf = Buffer.alloc(4);
    offsetBuf.writeUInt32LE(compDefOffset);
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("comp_def"), programId.toBuffer(), offsetBuf],
        ARCIUM_PROGRAM_ID
    );
    return pda;
}

function compDefOffset(name) {
    const hash = createHash("sha256").update(name).digest();
    return hash.readUInt32LE(0);
}

async function getMXELutAddress(mxeAccount) {
    const mxeData = await connection.getAccountInfo(mxeAccount);
    if (!mxeData) throw new Error("MXE account not found on-chain");

    // The lut_offset_slot is at offset 8+32+32+32+32+8+8+8+4+1+1 = 166 (approx)
    // Actually let's read the LUT offset slot from the MXE account data
    // In Arcium MXE account, the lut_offset_slot is a u64 stored somewhere in the struct
    // Let's try to find it by looking at the account data
    // The MXE account struct has many fields, let's try a different approach

    // Use the derive_mxe_lut_pda approach: seeds = [b"mxe_lut", lut_offset_slot.to_le_bytes()]
    // For now, let's try reading the lut_offset_slot from the account data
    // The MXE account has: discriminator(8) + authority(32) + cluster_offset(8) + ...
    // Let's try finding the LUT PDA differently by scanning recent slots

    // Actually, let's just try to derive it with the common seed pattern
    const data = mxeData.data;

    // Try to find lut_offset_slot - it's a u64 in the MXE account
    // Skip discriminator (8 bytes), then look for the field
    // Let's try multiple known offsets
    const possibleOffsets = [8 + 32, 8 + 32 + 8, 8 + 32 + 32 + 8, 8 + 32 + 32 + 32 + 8];

    for (const offset of [40, 48, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144, 152, 160]) {
        if (offset + 8 > data.length) continue;
        const slotValue = data.readBigUInt64LE(offset);
        if (slotValue > 0n && slotValue < 1000000000n) {
            // Try this as lut_offset_slot
            const slotBuf = Buffer.alloc(8);
            slotBuf.writeBigUInt64LE(slotValue);
            const [lutPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("mxe_lut"), slotBuf],
                ARCIUM_PROGRAM_ID
            );
            // Verify this account exists on chain
            const lutInfo = await connection.getAccountInfo(lutPda);
            if (lutInfo) {
                console.log(`  Found LUT PDA at offset ${offset}, slot=${slotValue}`);
                return lutPda;
            }
        }
    }

    throw new Error("Could not find LUT offset slot in MXE account data");
}

// ─── Build and send init_comp_def transactions ────────────────────
async function initCompDef(instructionName, circuitName) {
    console.log(`\nInitializing comp def for "${circuitName}"...`);

    const discriminator = getDiscriminator(instructionName);
    console.log(`  Discriminator: ${discriminator.toString("hex")}`);

    const mxeAccount = getMXEAccAddress(PROGRAM_ID);
    console.log(`  MXE account: ${mxeAccount.toBase58()}`);

    const offset = compDefOffset(circuitName);
    console.log(`  Comp def offset: ${offset}`);

    const compDefAccount = getCompDefAccAddress(PROGRAM_ID, offset);
    console.log(`  Comp def account: ${compDefAccount.toBase58()}`);

    const lutPda = await getMXELutAddress(mxeAccount);
    console.log(`  LUT PDA: ${lutPda.toBase58()}`);

    const keys = [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },       // payer
        { pubkey: mxeAccount, isSigner: false, isWritable: true },           // mxe_account
        { pubkey: compDefAccount, isSigner: false, isWritable: true },       // comp_def_account
        { pubkey: lutPda, isSigner: false, isWritable: true },               // address_lookup_table
        { pubkey: LUT_PROGRAM_ID, isSigner: false, isWritable: false },      // lut_program
        { pubkey: ARCIUM_PROGRAM_ID, isSigner: false, isWritable: false },   // arcium_program
        { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false }, // system_program
    ];

    const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys,
        data: discriminator, // No additional args for init_comp_def
    });

    const tx = new Transaction().add(ix);

    try {
        const sig = await sendAndConfirmTransaction(connection, tx, [payer], {
            commitment: "confirmed",
        });
        console.log(`  ✅ Initialized! Signature: ${sig}`);
        console.log(`  Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
        return sig;
    } catch (err) {
        if (err.message?.includes("already in use") || err.logs?.some(l => l.includes("already in use"))) {
            console.log("  ⚠️  Comp def already initialized, skipping.");
            return null;
        }
        console.error("  ❌ Error:", err.message);
        if (err.logs) {
            console.error("  Logs:", err.logs.slice(-5).join("\n  "));
        }
        throw err;
    }
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`Balance: ${balance / 1e9} SOL`);

    await initCompDef("init_winner_comp_def", "compute_winner");
    await initCompDef("init_allocation_comp_def", "compute_allocation");

    console.log("\n🎉 Done! Both computation definitions registered.");
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
