// use crate::error::ProgramError;
use anchor_lang::prelude::*;
use anchor_spl::token::Token;

use exhibition::program::Exhibition;
use exhibition::{self, Exhibit};

// use crate::state::curve::CurveType;

use crate::state::accounts::CarnivalAccount;

#[derive(Accounts)]
pub struct InitializeCarnival<'info> {
    /// CHECK: escrow only purpose is to store sol
    #[account(mut)]
    pub exhibit: AccountInfo<'info>,
    // pub exhibit: Account<'info, Exhibit>,
    #[account(init, payer=signer, space = std::mem::size_of::<CarnivalAccount>() + 8,
seeds = [b"carnival", exhibit.key().as_ref()], bump)]
    pub carnival: Account<'info, CarnivalAccount>,

    /// CHECK: auth only needs to sign for stuff, no metadata
    #[account(
        init,
        payer = signer,
        space = 8,
        seeds = [b"carnival_auth", carnival.key().as_ref()],
        bump
    )]
    pub carnival_auth: AccountInfo<'info>,

    /// CHECK: escrow only purpose is to store sol
    #[account(mut)]
    pub voucher_mint: AccountInfo<'info>,

    /// CHECK: escrow only purpose is to store sol
    #[account(mut)]
    pub nft_metadata: AccountInfo<'info>,

    /// CHECK: escrow only purpose is to store sol
    #[account(
        seeds = [b"escrow_sol", carnival.key().as_ref()],
        owner = system_program.key(),
        bump
    )]
    pub escrow_sol: AccountInfo<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub exhibition_program: Program<'info, Exhibition>,
}

pub fn init_carnival(ctx: Context<InitializeCarnival>) -> Result<()> {
    let cpi_program = ctx.accounts.exhibition_program.to_account_info();
    let cpi_accounts = exhibition::cpi::accounts::InitializeExhibit {
        exhibit: ctx.accounts.exhibit.to_account_info(),
        voucher_mint: ctx.accounts.voucher_mint.to_account_info(),
        nft_metadata: ctx.accounts.nft_metadata.to_account_info(),
        signer: ctx.accounts.signer.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    exhibition::cpi::initialize_exhibit(cpi_ctx);

    Ok(())
}
