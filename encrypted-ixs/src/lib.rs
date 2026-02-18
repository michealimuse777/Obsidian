use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub struct BidInput {
        pub amount: u64,
    }

    #[instruction]
    pub fn compute_winner(
        bid_a: Enc<Mxe, BidInput>,
        bid_b: Enc<Mxe, BidInput>,
    ) -> Enc<Mxe, u64> {
        let a = bid_a.to_arcis();
        let b = bid_b.to_arcis();

        let winner = if a.amount > b.amount {
            a.amount
        } else {
            b.amount
        };

        bid_a.owner.from_arcis(winner)
    }

    #[instruction]
    pub fn compute_allocation(
        bid_amount: Enc<Mxe, u64>,
        total_pool: Enc<Mxe, u64>,
    ) -> Enc<Mxe, u64> {
        let b = bid_amount.to_arcis();
        let p = total_pool.to_arcis();

        // Simple ratio: (bid * 100) / pool gives percentage
        let pct = if p > 0 { b * 100 / p } else { 0u64 };

        bid_amount.owner.from_arcis(pct)
    }
}
