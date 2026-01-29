
import { Keypair } from "@solana/web3.js";
import * as fs from "fs";

const PROGRAM_ID = "BRGaXJJS6oHN1pBPnMhZQHtSfBLmVyYk75xqetsRfib9";
const files = [
    "win_keypair.json",
    "arcium_keypair.json",
    "target/deploy/obsidian-keypair.json"
];

let output = `Checking against Program ID: ${PROGRAM_ID}\n\n`;

files.forEach(f => {
    try {
        if (fs.existsSync(f)) {
            const raw = fs.readFileSync(f, 'utf-8');
            const arr = JSON.parse(raw);
            const kp = Keypair.fromSecretKey(new Uint8Array(arr));
            const match = kp.publicKey.toBase58() === PROGRAM_ID ? "✅ MATCH!" : "❌ No match";
            output += `${f}:\n  Pubkey: ${kp.publicKey.toBase58()}\n  Result: ${match}\n\n`;
        } else {
            output += `${f}: Not found\n\n`;
        }
    } catch (e) {
        output += `${f}: Error reading/parsing - ${e}\n\n`;
    }
});

fs.writeFileSync("key-check-results.txt", output);
console.log("Done writing results.");
