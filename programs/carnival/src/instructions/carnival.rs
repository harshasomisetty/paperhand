// use crate::error::ProgramError;
use anchor_lang::prelude::*;
use anchor_spl::token::Token;

use crate::state::accounts::CarnivalAccount;

use exhibition::state::metaplex_anchor::TokenMetadata;

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
    pub nft_metadata: Box<Account<'info, TokenMetadata>>,

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
}

pub fn init_carnival(ctx: Context<InitializeCarnival>) -> Result<()> {
    ctx.accounts.carnival.exhibit_symbol = ctx
        .accounts
        .nft_metadata
        .data
        .symbol
        .trim_matches(char::from(0))
        .to_string();
    Ok(())
}
