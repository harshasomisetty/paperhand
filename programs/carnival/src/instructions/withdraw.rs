use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use solana_program;
use solana_program::{
    account_info::AccountInfo, program::invoke, program::invoke_signed, system_instruction,
};

use exhibition::program::Exhibition;
use exhibition::state::metaplex_anchor::TokenMetadata;

use exhibition::{self, Exhibit};

use crate::state::accounts::{Booth, CarnivalAccount};

#[derive(Accounts)]
#[instruction(booth_id: u64, sol_amt: u64, carnival_auth_bump: u8, escrow_auth_bump: u8)]
pub struct WithdrawSol<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut, seeds = [b"carnival", exhibit.key().as_ref()], bump)]
    pub carnival: Account<'info, CarnivalAccount>,

    /// CHECK: auth only needs to sign for stuff, no metadata
    #[account(mut, seeds = [b"carnival_auth", carnival.key().as_ref()], bump)]
    pub carnival_auth: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"booth", carnival.key().as_ref(), booth_id.to_le_bytes().as_ref()],
        bump
    )]
    pub booth: Account<'info, Booth>,

    /// CHECK: escrow only purpose is to store sol
    #[account(
        mut,
        seeds = [b"escrow_sol", carnival.key().as_ref()],
        bump
    )]
    pub escrow_sol: AccountInfo<'info>,

    #[account(mut, address = booth.booth_owner)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(booth_id: u64, carnival_auth_bump: u8, booth_bump: u8)]
pub struct WithdrawNft<'info> {
    #[account(mut)]
    pub exhibit: Box<Account<'info, Exhibit>>,

    #[account(mut, seeds = [b"carnival", exhibit.key().as_ref()], bump)]
    pub carnival: Box<Account<'info, CarnivalAccount>>,

    /// CHECK: auth only needs to sign for stuff, no metadata
    #[account(mut, seeds = [b"carnival_auth", carnival.key().as_ref()], bump)]
    pub carnival_auth: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"booth", carnival.key().as_ref(), booth_id.to_le_bytes().as_ref()],
        bump
    )]
    pub booth: Account<'info, Booth>,

    #[account(mut)]
    pub voucher_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = voucher_mint,
        associated_token::authority = signer
    )]
    pub user_voucher_wallet: Account<'info, TokenAccount>,

    #[account(mut)]
    pub nft_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub nft_metadata: Box<Account<'info, TokenMetadata>>,
    #[account(mut)]
    pub nft_user_token: Box<Account<'info, TokenAccount>>,

    /// CHECK: cpi stuff
    #[account(mut)]
    pub nft_artifact: AccountInfo<'info>,

    #[account(mut, address = booth.booth_owner)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub exhibition_program: Program<'info, Exhibition>,
}

pub fn withdraw_sol(
    ctx: Context<WithdrawSol>,
    booth_id: u64,
    sol_amt: u64,
    carnival_auth_bump: u8,
    escrow_auth_bump: u8,
) -> Result<()> {
    msg!("in withdraw sol");

    // TODO check to make sure right person is withdrawing

    // TODO sign for being able to move sol from escrow to user
    // TODO check to make sure user is correct

    invoke_signed(
        &system_instruction::transfer(
            ctx.accounts.escrow_sol.to_account_info().key,
            ctx.accounts.signer.to_account_info().key,
            sol_amt,
        ),
        &[
            ctx.accounts.escrow_sol.to_account_info(),
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        &[&[
            b"escrow_sol".as_ref(),
            ctx.accounts.carnival.to_account_info().key.as_ref(),
            &[escrow_auth_bump],
        ]],
    )?;

    Ok(())
}

pub fn withdraw_nft(
    ctx: Context<WithdrawNft>,
    booth_id: u64,
    carnival_auth_bump: u8,
    booth_bump: u8,
) -> Result<()> {
    // check signer is booth
    // check the user signer is the owner on the carnival
    // exhibit withdraw nft to user

    msg!(
        "in withdraw nft. boothId: {}, booth pub: {}",
        &booth_id,
        ctx.accounts.booth.key().to_string()
    );

    let cpi_program = ctx.accounts.exhibition_program.to_account_info();
    let cpi_accounts = exhibition::cpi::accounts::ArtifactWithdraw {
        exhibit: ctx.accounts.exhibit.to_account_info(),
        voucher_mint: ctx.accounts.voucher_mint.to_account_info(),
        user_voucher_wallet: ctx.accounts.user_voucher_wallet.to_account_info(),
        nft_mint: ctx.accounts.nft_mint.to_account_info(),
        nft_metadata: ctx.accounts.nft_metadata.to_account_info(),
        nft_user_token: ctx.accounts.nft_user_token.to_account_info(),
        nft_artifact: ctx.accounts.nft_artifact.to_account_info(),
        delegate_signer: ctx.accounts.signer.to_account_info(),
        signer: ctx.accounts.booth.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };

    let borrowed_id = booth_id.clone().to_le_bytes().to_owned();

    let carnival_key = ctx.accounts.carnival.key();

    let seeds = &[
        b"booth",
        carnival_key.as_ref(),
        borrowed_id.as_ref(),
        &[booth_bump],
    ];

    let pda_seeds = &[&seeds[..]];

    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, pda_seeds);

    exhibition::cpi::artifact_withdraw(cpi_ctx)?;

    msg!("finished withdraw nft with cpi");
    msg!(
        "nft count {}, {}",
        ctx.accounts.booth.nfts,
        ctx.accounts.carnival.nft_listings
    );

    ctx.accounts.booth.nfts = ctx.accounts.booth.nfts - 1;
    ctx.accounts.carnival.nft_listings = ctx.accounts.carnival.nft_listings - 1;

    Ok(())
}
