/**
 * Arcium SDK Integration — Obsidian
 *
 * Real Arcium v0.7.0 encryption using x25519 key exchange and RescueCipher.
 * Replaces the previous NaCl simulation.
 *
 * NOTE: @arcium-hq/client depends on Node.js `fs` module, so we use
 * dynamic imports and lazy initialization to avoid SSR/browser bundle issues.
 * The encryption primitives (x25519 + RescueCipher) work in the browser.
 * The account derivation helpers are imported dynamically when needed.
 */

import type { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

/**
 * Lazily loads the Arcium client module.
 * This avoids bundling Node.js-only code into the client-side bundle at compile time.
 */
async function getArciumClient() {
    const client = await import("@arcium-hq/client");
    return client;
}

/**
 * Encrypts a bid amount for submission to the Arcium MPC network.
 *
 * @param amount - Bid amount as BigInt (in token base units)
 * @param provider - Anchor provider with RPC connection
 * @param programId - Obsidian program public key
 * @returns Encrypted bid data ready for on-chain submission
 */
export async function encryptBid(
    amount: bigint,
    provider: AnchorProvider,
    programId: PublicKey
) {
    const { x25519, RescueCipher, getMXEPublicKey } = await getArciumClient();

    // Generate ephemeral x25519 keypair for this bid
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    // Fetch the MXE's x25519 public key from on-chain
    const mxePublicKey = await getMXEPublicKey(provider, programId);

    // Derive shared secret via ECDH
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey as any);
    if (!sharedSecret) {
        throw new Error("Failed to derive shared secret — invalid MXE public key");
    }

    // Initialize RescueCipher with the shared secret
    const cipher = new RescueCipher(sharedSecret as any);

    // Generate random nonce (16 bytes)
    const nonce = new Uint8Array(16);
    crypto.getRandomValues(nonce);

    // Encrypt the bid amount
    const ciphertext = cipher.encrypt([amount], nonce);

    return {
        ciphertext: ciphertext[0],
        publicKey: Array.from(publicKey) as number[],
        nonce,
        cipher,
        privateKey,
    };
}

/**
 * Derives all Arcium-required account addresses for a computation.
 *
 * @param programId - Obsidian program ID
 * @param computationOffset - Random offset for this computation (8 bytes)
 * @param compDefName - Name of the encrypted instruction (e.g., "compute_winner")
 * @returns Object with all derived account addresses
 */
export async function deriveArciumAccounts(
    programId: PublicKey,
    computationOffset: Buffer,
    compDefName: string
) {
    const {
        getArciumEnv,
        getCompDefAccAddress,
        getCompDefAccOffset,
        getComputationAccAddress,
        getClusterAccAddress,
        getMXEAccAddress,
        getMempoolAccAddress,
        getExecutingPoolAccAddress,
        getFeePoolAccAddress,
        getClockAccAddress,
    } = await getArciumClient();

    const arciumEnv = getArciumEnv();

    const compDefOffset = getCompDefAccOffset(compDefName);
    const compDefOffsetNum = Buffer.from(compDefOffset as any).readUInt32LE();

    return {
        computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            computationOffset as any
        ),
        clusterAccount: getClusterAccAddress(arciumEnv.arciumClusterOffset),
        mxeAccount: getMXEAccAddress(programId),
        mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
        compDefAccount: getCompDefAccAddress(
            programId,
            compDefOffsetNum
        ),
        poolAccount: getFeePoolAccAddress(),
        clockAccount: getClockAccAddress(),
    };
}

/**
 * Waits for an Arcium MPC computation to finalize on-chain.
 *
 * @param provider - Anchor provider
 * @param computationOffset - The computation offset used during submission
 * @param programId - Obsidian program ID
 * @returns Finalization transaction signature
 */
export async function waitForComputation(
    provider: AnchorProvider,
    computationOffset: Uint8Array | Buffer,
    programId: PublicKey
): Promise<string> {
    const { awaitComputationFinalization } = await getArciumClient();

    return await awaitComputationFinalization(
        provider,
        computationOffset as any,
        programId,
        "confirmed"
    );
}
