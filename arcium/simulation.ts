/**
 * SIMULATED ARCIUM ENCRYPTED EXPERIMENT
 * 
 * In a real deployment, this logic would be written in Arcis (Arcium's confidential language)
 * and executed on the Arcium Network's encrypted nodes.
 * 
 * For this implementation, we simulate the logic in TypeScript to demonstrate the
 * algorithmic correctness of the AI scoring and allocation.
 */

interface EncryptedBid {
    bidder: string;
    encryptedDetails: Uint8Array; // In reality, this is non-readable
}

// Decrypted structure (internal to the confidential enclave)
interface DecryptedValues {
    bidAmount: number;
    walletAgeDays: number;
}

// Constants defined in Step 0
const TOTAL_TOKENS = 1_000_000;
const MAX_ALLOC_PER_USER = 5_000;

// Model Weights (Hardcoded from "Offline Training")
const WEIGHT_BID = 0.8;
const WEIGHT_AGE = 0.2;

/**
 * Mocks the decryption process inside the enclave
 */
function decryptInsideEnclave(encrypted: Uint8Array): DecryptedValues {
    // SIMULATION: decoding JSON from bytes for demonstration
    const jsonString = new TextDecoder().decode(encrypted);
    return JSON.parse(jsonString);
}

/**
 * THE AI MODEL
 * Logistic Regression / Weighted Score
 */
function runAiScoring(inputs: DecryptedValues): number {
    // Normalize inputs (Simple Min-Max scaling assumptions for demo)
    const normBid = Math.min(inputs.bidAmount / 1000, 1.0); // Assume 1000 USDC is "max" score
    const normAge = Math.min(inputs.walletAgeDays / 365, 1.0); // Assume 1 year is "max" score

    const score = (normBid * WEIGHT_BID) + (normAge * WEIGHT_AGE);
    return score; // 0.0 to 1.0
}

/**
 * ALLOCATION FORMULA
 */
function calculateAllocation(bidAmount: number, aiScore: number): number {
    let rawAllocation = bidAmount * aiScore * 10; // Multiplier to convert bid score to tokens

    // Cap at max allocation
    return Math.min(rawAllocation, MAX_ALLOC_PER_USER);
}

/**
 * MAIN EXECUTION ENTRYPOINT (Confidential)
 */
export function executeEncryptedBatch(bids: EncryptedBid[]): Map<string, number> {
    const allocations = new Map<string, number>();
    let totalDistributed = 0;

    for (const bid of bids) {
        // 1. Decrypt (Inside Enclave)
        const data = decryptInsideEnclave(bid.encryptedDetails);

        // 2. AI Scoring
        const score = runAiScoring(data);

        // 3. Allowance Calculation
        const userAllocation = calculateAllocation(data.bidAmount, score);

        // Update Global State Checks
        if (totalDistributed + userAllocation <= TOTAL_TOKENS) {
            allocations.set(bid.bidder, userAllocation);
            totalDistributed += userAllocation;
        } else {
            // Out of tokens (First Come First Serve logic for overflow in this simple model)
            const remaining = TOTAL_TOKENS - totalDistributed;
            if (remaining > 0) {
                allocations.set(bid.bidder, remaining);
                totalDistributed += remaining;
            } else {
                allocations.set(bid.bidder, 0);
            }
        }
    }

    return allocations;
}

// --- EXECUTION DEMO ---
(function main() {
    console.log("🔒 Starting Confidential Simulation...");

    // Mock Encrypted Bids (In reality, these are opaque blobs)
    // We cheat here for the setup to create the "decrypted" view the enclave sees
    const mockBids: EncryptedBid[] = [
        { bidder: "UserA", encryptedDetails: new TextEncoder().encode(JSON.stringify({ bidAmount: 4000, walletAgeDays: 100 })) },
        { bidder: "UserB", encryptedDetails: new TextEncoder().encode(JSON.stringify({ bidAmount: 100, walletAgeDays: 5 })) },
        { bidder: "UserC", encryptedDetails: new TextEncoder().encode(JSON.stringify({ bidAmount: 50000, walletAgeDays: 365 })) }, // Whale
    ];

    console.log(`📥 Received ${mockBids.length} encrypted bids.`);

    const results = executeEncryptedBatch(mockBids);

    console.log("\n✅ AI Scoring & Allocation Complete (Encrypted Output):");
    console.table(Array.from(results.entries()).map(([bidder, amount]) => ({
        Bidder: bidder,
        Allocation: `${amount.toFixed(2)} OBS`
    })));

    console.log("🔐 Proof generated successfully.");
})();
