use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

declare_id!("BRGaXJJS6oHN1pBPnMhZQHtSfBLmVyYk75xqetsRfib9");

#[program]
pub mod obsidian {
    use super::*;

    pub fn initialize_launch(ctx: Context<InitializeLaunch>, total_tokens: u64, max_allocation: u64) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        launch.authority = ctx.accounts.authority.key();
        launch.mint = ctx.accounts.mint.key();
        launch.launch_pool = ctx.accounts.launch_pool.key();
        launch.total_tokens = total_tokens;
        launch.max_allocation = max_allocation;
        launch.tokens_distributed = 0;
        launch.is_finalized = false;
        Ok(())
    }

    pub fn submit_encrypted_bid(ctx: Context<SubmitBid>, encrypted_bid: Vec<u8>, amount: u64) -> Result<()> {
        let bid = &mut ctx.accounts.bid;
        let launch = &mut ctx.accounts.launch;
        
        require!(!launch.is_finalized, ErrorCode::LaunchFinalized);
        
        // Transfer Tokens (Public Amount for Audit, Payload is Encrypted)
        // In a full C-SPL implementation, this would use `transfer_encrypt` or rely on the user to have proof.
        // For this MVP step, we execute a TransferChecked to ensure the user funds the bid.
        anchor_spl::token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::TransferChecked {
                    from: ctx.accounts.from.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                    authority: ctx.accounts.bidder.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.mint.decimals,
        )?;

        // Update Logic accounting
        // launch.tokens_distributed += 0; // Launch tokens are distributed AT THE END, not now. 
        // We are collecting bids (USDC/Payment Token).
        // Wait, the `launch.launch_pool` is what? The destination for user funds? YES.
        
        bid.bidder = ctx.accounts.bidder.key();
        bid.encrypted_data = encrypted_bid;
        bid.is_processed = false;
        
        Ok(())
    }

    pub fn run_ai_allocation(_ctx: Context<RunAi>) -> Result<()> {
        // In a real Arcium integration, this might trigger a CPI or emit an event 
        // that the Arcium nodes listen to.
        emit!(AiProcessingStarted {
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn finalize_and_distribute<'info>(
        ctx: Context<'_, '_, '_, 'info, Finalize<'info>>, 
        allocation_proof: Vec<u8>, 
        recipients: Vec<Pubkey>, 
        amounts: Vec<u64>
    ) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        require!(!launch.is_finalized, ErrorCode::LaunchFinalized);
        require!(ctx.accounts.authority.key() == launch.authority, ErrorCode::Unauthorized);
        require!(recipients.len() == amounts.len(), ErrorCode::InvalidAllocationInput);

        // Iterate and distribute
        for (i, recipient) in recipients.iter().enumerate() {
            let amount = amounts[i];
            
            if i < ctx.remaining_accounts.len() {
                let dest_account = &ctx.remaining_accounts[i];
                
                // Verify the remaining account matches the recipient in the list
                require!(dest_account.key() == *recipient, ErrorCode::InvalidAllocationInput);
                
                // CPI to Transfer
                // Signer Seeds for Launch PDA (which owns launch_pool)
                let bump_seed = launch.bump;
                let seeds = &[b"launch".as_ref(), &[bump_seed]];
                let signer = &[&seeds[..]];

                anchor_spl::token_interface::transfer_checked(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token_interface::TransferChecked {
                            from: ctx.accounts.launch_pool.to_account_info(),
                            mint: ctx.accounts.mint.to_account_info(),
                            to: dest_account.clone(),
                            authority: launch.to_account_info(),
                        },
                        signer
                    ),
                    amount,
                    ctx.accounts.mint.decimals,
                )?;
                
                launch.tokens_distributed += amount;
            }
        }

        launch.is_finalized = true;
        
        emit!(LaunchFinalized {
            proof_hash: anchor_lang::solana_program::hash::hash(&allocation_proof).to_bytes(),
        });

        Ok(())
    }
}

// ... InitializeLaunch ... 

#[derive(Accounts)]
pub struct InitializeLaunch<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 1, // Added space for 'bump'
        seeds = [b"launch"],
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

#[derive(Accounts)]
pub struct SubmitBid<'info> {
    #[account(
        init,
        payer = bidder,
        space = 8 + 32 + 4 + 200 + 1,
        seeds = [b"bid", bidder.key().as_ref()],
        bump
    )]
    pub bid: Account<'info, Bid>,
    
    #[account(mut)]
    pub launch: Account<'info, Launch>,
    
    #[account(
        mut, 
        constraint = from.mint == mint.key(),
        constraint = from.owner == bidder.key()
    )]
    pub from: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut, 
        address = launch.launch_pool
    )]
    pub to: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub bidder: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct RunAi<'info> {
    #[account(mut)]
    pub launch: Account<'info, Launch>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Finalize<'info> {
    #[account(
        mut,
        seeds = [b"launch"],
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

    pub authority: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[account]
pub struct Launch {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub launch_pool: Pubkey,
    pub total_tokens: u64,
    pub max_allocation: u64,
    pub tokens_distributed: u64,
    pub is_finalized: bool,
    pub bump: u8, // Store bump for signer
}

#[account]
pub struct Bid {
    pub bidder: Pubkey,
    pub encrypted_data: Vec<u8>,
    pub is_processed: bool,
}

#[event]
pub struct AiProcessingStarted {
    pub timestamp: i64,
}

#[event]
pub struct LaunchFinalized {
    pub proof_hash: [u8; 32],
}

#[error_code]
pub enum ErrorCode {
    #[msg("The launch has already been finalized.")]
    LaunchFinalized,
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("Recipient and Amount lists must be equal length.")]
    InvalidAllocationInput,
}
