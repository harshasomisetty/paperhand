use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use exhibition::{program::Exhibition, state::metaplex_anchor::TokenMetadata};
use solana_program::{program::invoke, system_instruction};

use crate::state::{
    accounts::{Booth, CarnivalAccount},
    curve::CurveType,
};

// TODO check the right account types (the buy and trade) are being called, otherwises reject
#[derive(Accounts)]
#[instruction(booth_id: u64, carnival_auth_bump: u8, booth_bump: u8)]
pub struct TradeNftForSol<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

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

    #[account(
        mut,
        seeds = [b"escrow_sol", carnival.key().as_ref()],
        bump
    )]
    pub escrow_sol: AccountInfo<'info>,

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
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub exhibition_program: Program<'info, Exhibition>,
}

pub fn trade_nft_for_sol(
    ctx: Context<TradeNftForSol>,
    booth_id: u64,
    carnival_auth_bump: u8,
    booth_bump: u8,
) -> Result<()> {
    // check user transfer enough sol

    // user withdraws sol
    invoke(
        &system_instruction::transfer(
            ctx.accounts.signer.to_account_info().key,
            ctx.accounts.escrow_sol.to_account_info().key,
            ctx.accounts.booth.spot_price,
        ),
        &[
            ctx.accounts.signer.to_account_info(),
            ctx.accounts.escrow_sol.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    );

    // check booth passed in is correct delegate for nft

    // artifact withdraw from exhibit cpi

    let cpi_program = ctx.accounts.exhibition_program.to_account_info();
    let cpi_accounts = exhibition::cpi::accounts::ArtifactInsert {
        exhibit: ctx.accounts.exhibit.to_account_info(),
        voucher_mint: ctx.accounts.voucher_mint.to_account_info(),
        user_voucher_wallet: ctx.accounts.user_voucher_wallet.to_account_info(),
        nft_mint: ctx.accounts.nft_mint.to_account_info(),
        nft_metadata: ctx.accounts.nft_metadata.to_account_info(),
        nft_user_token: ctx.accounts.nft_user_token.to_account_info(),
        nft_artifact: ctx.accounts.nft_artifact.to_account_info(),
        delegate_signer: ctx.accounts.booth.to_account_info(),
        signer: ctx.accounts.signer.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
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

    exhibition::cpi::artifact_insert(cpi_ctx)?;

    // recalculate bids and asks

    let current_spot_price = ctx.accounts.booth.spot_price;
    let delta = ctx.accounts.booth.delta;

    if ctx.accounts.booth.curve == CurveType::Linear {
        let new_spot_price = ctx
            .accounts
            .booth
            .spot_price
            .checked_sub(ctx.accounts.booth.delta)
            .unwrap();

        ctx.accounts.booth.spot_price = new_spot_price;
    } else {
        // TODO this is a very naive calculation, fix it later
        // CREDIT: https://github.com/RohanKapurDEV/sudoswap-sol/
        let new_spot_price = ctx
            .accounts
            .booth
            .spot_price
            .checked_div(
                ctx.accounts
                    .booth
                    .delta
                    .checked_div(10000)
                    .unwrap()
                    .checked_add(1)
                    .unwrap(),
            )
            .unwrap();

        ctx.accounts.booth.spot_price = new_spot_price;
    }

    ctx.accounts.booth.nfts = ctx.accounts.booth.nfts + 1;
    ctx.accounts.booth.trade_count = ctx.accounts.booth.trade_count.checked_add(1).unwrap();

    // TODO NEED TO MAKE SURE POOL CANNOT OVERSELL

    Ok(())
}