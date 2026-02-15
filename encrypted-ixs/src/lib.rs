use arcis::*;

/// Obsidian Blind Auction — Confidential Computation Definitions
///
/// This code runs INSIDE the Arcium MPC cluster, NOT on Solana.
/// It defines the encrypted instruction logic that MPC nodes jointly execute
/// without any single node learning the plaintext bid values.
///
/// Rules enforced by Arcis:
///   - No logs, no networking, no randomness
///   - Must be deterministic and pure computation
///   - All inputs/outputs are encrypted types

#[encrypted]
mod circuits {
    use arcis::*;

    /// Represents an encrypted bid from a single user.
    /// The `amount` field is the bid value in lamports/token units.
    pub struct BidInput {
        pub amount: u64,
    }

    /// Pairwise comparison of two encrypted bids.
    ///
    /// Arcis requires fixed-size circuits, so we compare two bids at a time
    /// rather than operating on a variable-length vector. For auctions with
    /// N bidders, the orchestrator chains multiple pairwise comparisons
    /// (tournament-style bracket) to determine the final winner.
    ///
    /// Uses `Enc<Mxe, T>` — only the MXE can decrypt these values.
    /// Individual bidders never see each other's bids, and the client
    /// cannot decrypt MXE-encrypted data.
    ///
    /// Returns the winning (higher) bid amount, encrypted for MXE storage.
    #[instruction]
    pub fn compute_winner(
        bid_a: Enc<Mxe, BidInput>,
        bid_b: Enc<Mxe, BidInput>,
    ) -> Enc<Mxe, u64> {
        let a = bid_a.to_arcis();
        let b = bid_b.to_arcis();

        // Determine winner: higher bid wins
        let winner_amount = if a.amount > b.amount {
            a.amount
        } else {
            b.amount
        };

        bid_a.owner.from_arcis(winner_amount)
    }

    /// Computes fair allocation for a single bid based on the total pool.
    ///
    /// Given a user's bid amount and the total bid pool size, this computes
    /// the proportional token allocation without revealing individual bids.
    ///
    /// allocation = (bid_amount * total_tokens) / total_bid_pool
    /// Capped at max_allocation_per_user.
    #[instruction]
    pub fn compute_allocation(
        bid: Enc<Mxe, BidInput>,
        pool_info: Enc<Mxe, PoolInfo>,
    ) -> Enc<Mxe, u64> {
        let b = bid.to_arcis();
        let p = pool_info.to_arcis();

        // Proportional allocation: (bid / total_bids) * total_tokens
        let allocation = if p.total_bid_pool > 0 {
            (b.amount as u128 * p.total_tokens as u128 / p.total_bid_pool as u128) as u64
        } else {
            0u64
        };

        // Cap at maximum allocation per user
        let capped = if allocation > p.max_per_user {
            p.max_per_user
        } else {
            allocation
        };

        bid.owner.from_arcis(capped)
    }

    /// Pool information for allocation computation.
    pub struct PoolInfo {
        pub total_tokens: u64,
        pub total_bid_pool: u64,
        pub max_per_user: u64,
    }
}
