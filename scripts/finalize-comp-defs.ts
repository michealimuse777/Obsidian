import {
    buildFinalizeCompDefTx,
    getCompDefAccOffset,
} from "@arcium-hq/client";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";

const PROGRAM_ID = new anchor.web3.PublicKey("CsS69vzRAZ4dJXFg68tTnP2ei4XCbYzPENdzQnBWU5Ua");

async function main() {
    const path = await import("path");
    const winKp = path.resolve(process.cwd(), "win_keypair.json");
    const defaultKp = `${os.homedir()}/.config/solana/id.json`;
    const walletPath = fs.existsSync(winKp) ? winKp : defaultKp;
    const raw = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
    const kp = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(raw));

    const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
    const wallet = new anchor.Wallet(kp);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

    console.log("Wallet:", kp.publicKey.toBase58());

    const compDefs = ["compute_winner", "compute_allocation"];

    for (const name of compDefs) {
        const offsetBuf = getCompDefAccOffset(name);
        const compDefOffset = Buffer.from(offsetBuf).readUInt32LE();

        console.log(`\nFinalizing ${name}...`);
        console.log(`  CompDef offset (u32): ${compDefOffset}`);

        try {
            const tx = await buildFinalizeCompDefTx(
                provider,
                compDefOffset,
                PROGRAM_ID
            );

            const sig = await provider.sendAndConfirm(tx, [kp]);
            console.log(`  ✅ ${name} finalized! Sig: ${sig}`);
        } catch (e: any) {
            const msg = e.message || e.toString();
            console.log(`  ❌ Error finalizing ${name}:`);
            console.log(`     ${msg.substring(0, 500)}`);
            if (e.logs) {
                console.log("  Logs:", e.logs.slice(-10).join("\n  "));
            }
        }
    }

    console.log("\nDone!");
}

main().catch(console.error);
