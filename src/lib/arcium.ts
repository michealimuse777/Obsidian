/**
 * Arcium SDK Integration — Obsidian
 *
 * Real Arcium v0.7.0 encryption using x25519 key exchange and RescueCipher.
 * Replaces the previous NaCl simulation.
 *
 * Flow:
 *   1. Generate ephemeral x25519 keypair
 *   2. Fetch MXE's x25519 public key from on-chain
 *   3. Derive shared secret via ECDH
 *   4. Encrypt bid amount using RescueCipher
 *   5. Return ciphertext + pubkey + nonce for on-chain submission
 */

import { x25519 } from "@noble/curves/ed25519";
import {
    RescueCipher,
    getMXEPublicKeyWithRetry,
    getArciumEnv,
    getCompDefAccAddress,
    getCompDefAccOffset,
    getComputationAccAddress,
    getClusterAccAddress,
    getMXEAccAddress,
    getMempoolAccAddress,
    getExecutingPoolAccAddress,
    awaitComputationFinalization,
} from "@arcium-hq/client";
import type { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

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
    // Generate ephemeral x25519 keypair for this bid
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);

    // Fetch the MXE's x25519 public key from on-chain
    const mxePublicKey = await getMXEPublicKeyWithRetry(provider, programId);

    // Derive shared secret via ECDH
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);

    // Initialize RescueCipher with the shared secret
    const cipher = new RescueCipher(sharedSecret);

    // Generate random nonce (16 bytes)
    const nonce = new Uint8Array(16);
    crypto.getRandomValues(nonce);

    // Encrypt the bid amount
    const ciphertext = cipher.encrypt([amount], nonce);

    return {
        ciphertext: ciphertext[0],
        publicKey: Array.from(publicKey) as number[],
        nonce,
        cipher, // Keep cipher for decrypting results later
        privateKey, // Keep for result decryption
    };
}

/**
 * Derives all Arcium-required account addresses for a computation.
 *
 * @param programId - Obsidian program ID
 * @param computationOffset - Random offset for this computation
 * @param compDefName - Name of the encrypted instruction (e.g., "compute_winner")
 * @returns Object with all derived account addresses
 */
export function deriveArciumAccounts(
    programId: PublicKey,
    computationOffset: Buffer,
    compDefName: string
) {
    const arciumEnv = getArciumEnv();

    return {
        computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            computationOffset
        ),
        clusterAccount: getClusterAccAddress(arciumEnv.arciumClusterOffset),
        mxeAccount: getMXEAccAddress(programId),
        mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
        compDefAccount: getCompDefAccAddress(
            programId,
            Buffer.from(getCompDefAccOffset(compDefName)).readUInt32LE()
        ),
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
    computationOffset: Buffer,
    programId: PublicKey
): Promise<string> {
    return await awaitComputationFinalization(
        provider,
        computationOffset,
        programId,
        "confirmed"
    );
}
