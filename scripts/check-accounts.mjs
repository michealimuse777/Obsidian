import("@arcium-hq/client").then(async (c) => {
    const { Connection, PublicKey } = await import("@solana/web3.js");
    const conn = new Connection("https://api.devnet.solana.com", "confirmed");

    const PROGRAM_ID = new PublicKey("8nkjktP5dWDYCkwR3fJFSuQANB1vyw5g5LTHCrxnf3CE");
    const CLUSTER_OFFSET = 456;

    console.log("=== Checking all account PDAs for submitEncryptedBid ===\n");

    const checks = [
        ["MXE Account", c.getMXEAccAddress(PROGRAM_ID)],
        ["Cluster Account", c.getClusterAccAddress(CLUSTER_OFFSET)],
        ["Mempool Account", c.getMempoolAccAddress(CLUSTER_OFFSET)],
        ["Executing Pool", c.getExecutingPoolAccAddress(CLUSTER_OFFSET)],
        ["CompDef (compute_winner)", c.getCompDefAccAddress(
            PROGRAM_ID,
            Buffer.from(c.getCompDefAccOffset("compute_winner")).readUInt32LE()
        )],
        ["Fee Pool", new PublicKey("G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC")],
        ["Clock Account", new PublicKey("7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot")],
    ];

    for (const [name, address] of checks) {
        const info = await conn.getAccountInfo(address);
        const status = info ? `✅ exists (${info.data.length} bytes, owner: ${info.owner.toBase58().slice(0, 12)}...)` : "❌ NOT FOUND";
        console.log(`  ${name}: ${address.toBase58()}`);
        console.log(`    ${status}\n`);
    }
}).catch(e => console.error("Error:", e.message));
