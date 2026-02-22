use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use arcium_anchor::prelude::*;

declare_id!("CsS69vzRAZ4dJXFg68tTnP2ei4XCbYzPENdzQnBWU5Ua");

// Computation definition offsets — unique IDs for each encrypted instruction
const COMP_DEF_OFFSET_VERIFY_BID: u32 = comp_def_offset("verify_bid");
const COMP_DEF_OFFSET_COMPUTE_WINNER: u32 = comp_def_offset("compute_winner");
const COMP_DEF_OFFSET_COMPUTE_ALLOCATION: u32 = comp_def_offset("compute_allocation");

#[arcium_program]
pub mod obsidian_auction {
    use super::*;

    // ═══════════════════════════════════════════════════════════
    // STEP 1: Initialize Auction (Non-Confidential)
    // ═══════════════════════════════════════════════════════════

    pub fn initialize_launch(
        ctx: Context<InitializeLaunch>,
        total_tokens: u64,
        max_allocation: u64,
    ) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        launch.authority = ctx.accounts.authority.key();
        launch.mint = ctx.accounts.mint.key();
        launch.launch_pool = ctx.accounts.launch_pool.key();
        launch.total_tokens = total_tokens;
        launch.max_allocation = max_allocation;
        launch.tokens_distributed = 0;
        launch.bid_count = 0;
        launch.is_finalized = false;
        launch.winner = Pubkey::default();
        launch.winning_amount = 0;
        launch.bump = ctx.bumps.launch;
        Ok(())
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Initialize Computation Definitions (One-Time Setup)
    // ═══════════════════════════════════════════════════════════

    /// Registers the `verify_bid` encrypted instruction with Arcium.
    pub fn init_verify_bid_comp_def(ctx: Context<InitVerifyBidCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Registers the `compute_winner` encrypted instruction with Arcium.
    pub fn init_winner_comp_def(ctx: Context<InitWinnerCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Registers the `compute_allocation` encrypted instruction with Arcium.
    pub fn init_allocation_comp_def(ctx: Context<InitAllocationCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Submit Encrypted Bid (Queues MPC Computation)
    // ═══════════════════════════════════════════════════════════

    pub fn submit_encrypted_bid(
        ctx: Context<SubmitBid>,
        computation_offset: u64,
        encrypted_amount: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        // Check finalization first
        require!(!ctx.accounts.launch.is_finalized, ErrorCode::LaunchFinalized);

        // Save bidder key before any borrows
        let bidder_key = ctx.accounts.bidder.key();

        // Build encrypted arguments for the MPC computation
        // verify_bid circuit: Enc<Mxe, u64> — 1 nonce + 1 encrypted u64
        let args = ArgBuilder::new()
            .plaintext_u128(nonce)
            .encrypted_u64(encrypted_amount)
            .build();

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![VerifyBidCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        // Now mutably borrow after queue_computation is done
        let bid = &mut ctx.accounts.bid;
        bid.bidder = bidder_key;
        bid.is_processed = false;
        bid.allocation = 0;
        bid.is_claimed = false;

        let launch = &mut ctx.accounts.launch;
        launch.bid_count += 1;

        emit!(BidSubmitted {
            bidder: bidder_key,
            computation_offset,
        });

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: MPC Result Callbacks (Called by Arcium Network)
    // ═══════════════════════════════════════════════════════════

    #[arcium_callback(encrypted_ix = "verify_bid")]
    pub fn verify_bid_callback(
        ctx: Context<VerifyBidCallback>,
        output: SignedComputationOutputs<VerifyBidOutput>,
    ) -> Result<()> {
        let result = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(VerifyBidOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("MPC verification failed: {}", e);
                return Err(ErrorCode::AbortedComputation.into());
            }
        };

        emit!(WinnerComputed {
            winning_ciphertext: result.ciphertexts[0],
            nonce: result.nonce.to_le_bytes(),
        });

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "compute_allocation")]
    pub fn compute_allocation_callback(
        ctx: Context<ComputeAllocationCallback>,
        output: SignedComputationOutputs<ComputeAllocationOutput>,
    ) -> Result<()> {
        let result = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(ComputeAllocationOutput { field_0 }) => field_0,
            Err(e) => {
                msg!("MPC allocation verification failed: {}", e);
                return Err(ErrorCode::AbortedComputation.into());
            }
        };

        emit!(AllocationComputed {
            allocation_ciphertext: result.ciphertexts[0],
            nonce: result.nonce.to_le_bytes(),
        });

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Record Allocation (Authority records MPC result)
    // ═══════════════════════════════════════════════════════════

    pub fn record_allocation(ctx: Context<RecordAllocation>, amount: u64) -> Result<()> {
        let bid = &mut ctx.accounts.bid;
        let launch = &ctx.accounts.launch;

        require!(!launch.is_finalized, ErrorCode::LaunchFinalized);
        require!(
            ctx.accounts.authority.key() == launch.authority,
            ErrorCode::Unauthorized
        );

        bid.allocation = amount;
        bid.is_processed = true;

        emit!(AllocationRecorded {
            bidder: bid.bidder,
            amount,
        });

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Finalize Auction
    // ═══════════════════════════════════════════════════════════

    pub fn finalize_launch(ctx: Context<FinalizeLaunch>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        require!(!launch.is_finalized, ErrorCode::LaunchFinalized);
        require!(
            ctx.accounts.authority.key() == launch.authority,
            ErrorCode::Unauthorized
        );

        launch.is_finalized = true;

        emit!(LaunchFinalized {
            total_bids: launch.bid_count,
        });

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Claim Tokens (Non-Confidential, Post-Finalization)
    // ═══════════════════════════════════════════════════════════

    pub fn claim_tokens(ctx: Context<ClaimTokens>) -> Result<()> {
        let bid = &mut ctx.accounts.bid;
        let launch = &mut ctx.accounts.launch;

        require!(launch.is_finalized, ErrorCode::NotFinalized);
        require!(bid.allocation > 0, ErrorCode::NoAllocation);
        require!(!bid.is_claimed, ErrorCode::AlreadyClaimed);

        let seeds = &[b"launch_v3".as_ref(), &[launch.bump]];
        let signer = &[&seeds[..]];

        anchor_spl::token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::TransferChecked {
                    from: ctx.accounts.launch_pool.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.user_ata.to_account_info(),
                    authority: launch.to_account_info(),
                },
                signer,
            ),
            bid.allocation,
            ctx.accounts.mint.decimals,
        )?;

        bid.is_claimed = true;
        launch.tokens_distributed += bid.allocation;

        emit!(TokensClaimed {
            bidder: bid.bidder,
            amount: bid.allocation,
        });

        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNT STRUCTS
// ═══════════════════════════════════════════════════════════════

// --- Initialize Launch (Non-Arcium) ---

#[derive(Accounts)]
pub struct InitializeLaunch<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Launch::SPACE,
        seeds = [b"launch_v3"],
        bump
    )]
    pub launch: Account<'info, Launch>,

    #[account(mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = launch,
        associated_token::token_program = token_program
    )]
    pub launch_pool: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

// --- Init Computation Definitions (Arcium One-Time Setup) ---
// Pattern from: https://docs.arcium.com/developers/program/computation-def-accs

#[init_computation_definition_accounts("verify_bid", payer)]
#[derive(Accounts)]
pub struct InitVerifyBidCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,

    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("compute_winner", payer)]
#[derive(Accounts)]
pub struct InitWinnerCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,

    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("compute_allocation", payer)]
#[derive(Accounts)]
pub struct InitAllocationCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,

    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// --- Submit Encrypted Bid (Queues MPC Computation) ---
// Pattern from: https://docs.arcium.com/developers/program

#[queue_computation_accounts("verify_bid", bidder)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct SubmitBid<'info> {
    #[account(
        init,
        payer = bidder,
        space = 8 + Bid::SPACE,
        seeds = [b"bid_v3", bidder.key().as_ref()],
        bump
    )]
    pub bid: Account<'info, Bid>,

    #[account(mut)]
    pub launch: Account<'info, Launch>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    // --- Arcium-Required Accounts ---

    #[account(
        init_if_needed,
        space = 9,
        payer = bidder,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_VERIFY_BID)
    )]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,

    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Box<Account<'info, Cluster>>,

    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,

    #[account(
        mut,
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

// --- MPC Callback Account Structs ---
// Pattern from: https://docs.arcium.com/developers/program/callback-accs

#[callback_accounts("verify_bid")]
#[derive(Accounts)]
pub struct VerifyBidCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_VERIFY_BID)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: computation_account, checked by arcium program via constraints in the callback context.
    pub computation_account: UncheckedAccount<'info>,

    #[account(
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("compute_allocation")]
#[derive(Accounts)]
pub struct ComputeAllocationCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(
        address = derive_comp_def_pda!(COMP_DEF_OFFSET_COMPUTE_ALLOCATION)
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: computation_account, checked by arcium program via constraints in the callback context.
    pub computation_account: UncheckedAccount<'info>,

    #[account(
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint
    pub instructions_sysvar: AccountInfo<'info>,
}

// --- Record Allocation (Authority Only) ---

#[derive(Accounts)]
pub struct RecordAllocation<'info> {
    #[account(
        mut,
        seeds = [b"bid_v3", bid.bidder.as_ref()],
        bump
    )]
    pub bid: Account<'info, Bid>,

    #[account(
        seeds = [b"launch_v3"],
        bump = launch.bump
    )]
    pub launch: Account<'info, Launch>,

    pub authority: Signer<'info>,
}

// --- Finalize Launch ---

#[derive(Accounts)]
pub struct FinalizeLaunch<'info> {
    #[account(
        mut,
        seeds = [b"launch_v3"],
        bump = launch.bump
    )]
    pub launch: Account<'info, Launch>,

    pub authority: Signer<'info>,
}

// --- Claim Tokens ---

#[derive(Accounts)]
pub struct ClaimTokens<'info> {
    #[account(
        mut,
        seeds = [b"bid_v3", user.key().as_ref()],
        bump
    )]
    pub bid: Account<'info, Bid>,

    #[account(
        mut,
        seeds = [b"launch_v3"],
        bump = launch.bump
    )]
    pub launch: Account<'info, Launch>,

    #[account(
        mut,
        address = launch.launch_pool
    )]
    pub launch_pool: InterfaceAccount<'info, TokenAccount>,

    #[account(mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = user_ata.mint == mint.key(),
        constraint = user_ata.owner == user.key()
    )]
    pub user_ata: InterfaceAccount<'info, TokenAccount>,

    pub user: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

// ═══════════════════════════════════════════════════════════════
// DATA ACCOUNTS
// ═══════════════════════════════════════════════════════════════

#[account]
pub struct Launch {
    pub authority: Pubkey,       // 32
    pub mint: Pubkey,            // 32
    pub launch_pool: Pubkey,     // 32
    pub total_tokens: u64,       // 8
    pub max_allocation: u64,     // 8
    pub tokens_distributed: u64, // 8
    pub bid_count: u32,          // 4
    pub is_finalized: bool,      // 1
    pub winner: Pubkey,          // 32
    pub winning_amount: u64,     // 8
    pub bump: u8,                // 1
}

impl Launch {
    pub const SPACE: usize = 32 + 32 + 32 + 8 + 8 + 8 + 4 + 1 + 32 + 8 + 1;
}

#[account]
pub struct Bid {
    pub bidder: Pubkey,     // 32
    pub is_processed: bool, // 1
    pub allocation: u64,    // 8
    pub is_claimed: bool,   // 1
}

impl Bid {
    pub const SPACE: usize = 32 + 1 + 8 + 1;
}

// ═══════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════

#[event]
pub struct BidSubmitted {
    pub bidder: Pubkey,
    pub computation_offset: u64,
}

#[event]
pub struct WinnerComputed {
    pub winning_ciphertext: [u8; 32],
    pub nonce: [u8; 16],
}

#[event]
pub struct AllocationComputed {
    pub allocation_ciphertext: [u8; 32],
    pub nonce: [u8; 16],
}

#[event]
pub struct AllocationRecorded {
    pub bidder: Pubkey,
    pub amount: u64,
}

#[event]
pub struct LaunchFinalized {
    pub total_bids: u32,
}

#[event]
pub struct TokensClaimed {
    pub bidder: Pubkey,
    pub amount: u64,
}

// ═══════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════

#[error_code]
pub enum ErrorCode {
    #[msg("The launch has already been finalized.")]
    LaunchFinalized,
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("Recipient and Amount lists must be equal length.")]
    InvalidAllocationInput,
    #[msg("The launch has not been finalized yet.")]
    NotFinalized,
    #[msg("No allocation for this bid.")]
    NoAllocation,
    #[msg("Tokens have already been claimed.")]
    AlreadyClaimed,
    #[msg("MPC computation was aborted or verification failed.")]
    AbortedComputation,
    #[msg("Cluster not set for this MXE.")]
    ClusterNotSet,
}
