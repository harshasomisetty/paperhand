use crate::state::accounts::{CarnivalAccount, Market};
use crate::state::curve::CurveType;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(market_owner: Pubkey, market_id: u64, curve: u8, delta: u8, fee: u8)]
pub struct InitializeMarket<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut, seeds = [b"carnival", exhibit.key().as_ref()], bump)]
    pub carnival: Account<'info, CarnivalAccount>,

    /// CHECK: auth only needs to sign for stuff, no metadata
    #[account(
        mut,
        seeds = [b"carnival_auth", carnival.key().as_ref()],
        bump
    )]
    pub carnival_auth: AccountInfo<'info>,

    #[account(
        init,
        payer = signer,
        space = std::mem::size_of::<Market>() + 8,
        seeds = [b"market", carnival.key().as_ref(), market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseMarket<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,
}
pub fn create_market(
    ctx: Context<InitializeMarket>,
    market_owner: Pubkey,
    market_id: u64,
    curve: u8,
    delta: u8,
    fee: u8,
) -> Result<()> {
    msg!("in create market");
    let mut market = &mut ctx.accounts.market;

    assert_eq!(market_id, ctx.accounts.carnival.market_id_count);

    market.market_id = ctx.accounts.carnival.market_id_count;
    market.market_owner = market_owner;
    market.curve = match curve {
        0 => CurveType::Linear,
        _ => CurveType::Exponential,
    };

    market.delta = delta;
    market.fee = fee;

    msg!(
        "prev market id count: {}",
        ctx.accounts.carnival.market_id_count
    );
    ctx.accounts.carnival.market_id_count = ctx.accounts.carnival.market_id_count + 1;

    Ok(())
}

pub fn close_market(
    ctx: Context<InitializeMarket>,
    market_owner: Pubkey,
    market_id: u64,
    curve: u8,
    delta: u8,
    fee: u8,
) -> Result<()> {
    msg!("in close market");

    // // 3) close pda nft artifact
    // anchor_spl::token::close_account(CpiContext::new_with_signer(
    //     ctx.accounts.token_program.to_account_info().clone(),
    //     anchor_spl::token::CloseAccount {
    //         account: ctx.accounts.nft_artifact.to_account_info(),
    //         destination: ctx.accounts.exhibit.to_account_info(),
    //         authority: ctx.accounts.exhibit.to_account_info(),
    //     },
    //     &[&seeds],
    // ))?;

    Ok(())
}
