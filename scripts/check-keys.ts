
import { Keypair } from "@solana/web3.js";
import * as fs from "fs";

const PROGRAM_ID = "BRGaXJJS6oHN1pBPnMhZQHtSfBLmVyYk75xqetsRfib9";
const files = [
    "win_keypair.json",
    "arcium_keypair.json",
    "target/deploy/obsidian-keypair.json"
];

console.log(`Checking against Program ID: ${PROGRAM_ID}\n`);

files.forEach(f => {
    try {
        if (fs.existsSync(f)) {
            const raw = fs.readFileSync(f, 'utf-8');
            const arr = JSON.parse(raw);
            const kp = Keypair.fromSecretKey(new Uint8Array(arr));
            const match = kp.publicKey.toBase58() === PROGRAM_ID ? "✅ MATCH!" : "❌ No match";
            console.log(`${f}: ${kp.publicKey.toBase58()} | ${match}`);
        } else {
            console.log(`${f}: Not found`);
        }
    } catch (e) {
        console.log(`${f}: Error reading/parsing`);
    }
});
