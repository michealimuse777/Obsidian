import { getCompDefAccAddress, getCompDefAccOffset, getMXEAccAddress } from "@arcium-hq/client";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";

const OLD_PROGRAM = new anchor.web3.PublicKey("8nkjktP5dWDYCkwR3fJFSuQANB1vyw5g5LTHCrxnf3CE");
const NEW_PROGRAM = new anchor.web3.PublicKey("6XDoHizZE4avqDJbtdM8oqZinHSVP13LpMYhuivrmdoy");

async function main() {
    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

    for (const [label, pid] of [["OLD", OLD_PROGRAM], ["NEW", NEW_PROGRAM]] as const) {
        console.log(`\n=== ${label} Program: ${pid.toBase58()} ===`);

        const mxeAddr = getMXEAccAddress(pid);
        const mxeInfo = await connection.getAccountInfo(mxeAddr);
        console.log(`  MXE Account: ${mxeAddr.toBase58()} — ${mxeInfo ? `EXISTS (${mxeInfo.data.length} bytes)` : "NOT FOUND"}`);

        for (const name of ["compute_winner", "compute_allocation"]) {
            const offset = Buffer.from(getCompDefAccOffset(name)).readUInt32LE();
            const addr = getCompDefAccAddress(pid, offset);
            const info = await connection.getAccountInfo(addr);
            console.log(`  ${name}: ${addr.toBase58()} — ${info ? `EXISTS (${info.data.length} bytes, owner: ${info.owner.toBase58()})` : "NOT FOUND"}`);
        }
    }
}

main().catch(console.error);
