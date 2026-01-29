import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * simulated-arcium-sdk
 * 
 * This mimics the interface of the Arcium Confidential Computing SDK.
 * In a production environment, this would establish a secure channel with the Arcium Network (MXE).
 * For this implementation, we use standard Curve25519 encryption (nacl.box) to simulate 
 * encrypting data for a specific Enclave/Cypher Node.
 */

// Ephemeral keypair for the client (browser) for this session
// In reality, this might be derived from the wallet or a session key
const clientKeypair = nacl.box.keyPair();

export const arcium = {
    /**
     * Encrypts a message for the Arcium Confidential Cluster.
     * @param data The plaintext data (e.g., "5000" or JSON)
     * @param clusterPublicKeyBase64 The Public Key of the Cypher Node/Cluster
     * @returns The encrypted ciphertext as a Uint8Array
     */
    encrypt: (data: string, clusterPublicKeyBase64: string): Uint8Array => {
        const nonce = nacl.randomBytes(nacl.box.nonceLength);
        const messageUint8 = new TextEncoder().encode(data);
        const receiverPublicKey = decodeBase64(clusterPublicKeyBase64);

        const encrypted = nacl.box(
            messageUint8,
            nonce,
            receiverPublicKey,
            clientKeypair.secretKey
        );

        // Pack nonce + ephemeralPubKey + ciphertext
        // This allows the receiver to reconstruct and decrypt
        // Format: [Nonce (24)] [ClientPubKey (32)] [Ciphertext (...)]
        const fullPayload = new Uint8Array(nonce.length + clientKeypair.publicKey.length + encrypted.length);
        fullPayload.set(nonce);
        fullPayload.set(clientKeypair.publicKey, nonce.length);
        fullPayload.set(encrypted, nonce.length + clientKeypair.publicKey.length);

        return fullPayload;
    },

    /**
     * Decrypts a message from the client.
     * intended for use by the Cypher Node (Backend), not the frontend.
     */
    decrypt: (
        fullPayload: Uint8Array,
        nodeSecretKey: Uint8Array
    ): string | null => {
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
